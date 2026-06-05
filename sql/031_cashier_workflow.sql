-- Migration 031: Cashier workflow — ready_for_checkout status, send_to_checkout, process_checkout
-- Run once in Supabase SQL Editor after prior migrations.

-- ============================================================
-- 1) Extend appointment status + checkout_ready_at
-- ============================================================
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS checkout_ready_at TIMESTAMPTZ;

-- Live DB may have BOTH check_appointment_status and appointments_status_check
DO $$ BEGIN
  ALTER TABLE appointments DROP CONSTRAINT IF EXISTS check_appointment_status;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
  CHECK (status IN (
    'confirmed', 'waiting', 'assigned_pending', 'serving',
    'ready_for_checkout', 'completed', 'cancelled', 'missed'
  ));

-- ============================================================
-- 2) send_to_checkout — technician / lobby staff sends client to cashier
-- ============================================================
CREATE OR REPLACE FUNCTION send_to_checkout(
  caller_phone TEXT,
  appointment_id UUID,
  p_final_price NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
  appt RECORD;
  result JSONB;
BEGIN
  SELECT id, role INTO caller_id, caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician') THEN
    RAISE EXCEPTION 'Not authorized. Only staff can send to checkout.';
  END IF;

  SELECT * INTO appt FROM appointments WHERE id = appointment_id;
  IF appt.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found.';
  END IF;

  IF appt.status != 'serving' THEN
    RAISE EXCEPTION 'Only in-chair (serving) appointments can be sent to checkout.';
  END IF;

  IF caller_role = 'technician' THEN
    IF appt.technician_id IS NULL OR appt.technician_id != caller_id THEN
      RAISE EXCEPTION 'You can only send your own appointments to checkout.';
    END IF;
  END IF;

  UPDATE appointments SET
    status = 'ready_for_checkout',
    checkout_ready_at = NOW(),
    final_price = COALESCE(p_final_price, final_price)
  WHERE id = appointment_id;

  SELECT jsonb_build_object('success', true) INTO result;
  RETURN result;
END;
$$;

-- ============================================================
-- 3) process_checkout — atomic payment + complete (cashier / management)
-- ============================================================
CREATE OR REPLACE FUNCTION process_checkout(
  caller_phone TEXT,
  appointment_id UUID,
  p_amount NUMERIC DEFAULT NULL,
  p_discount_amount NUMERIC DEFAULT 0,
  p_discount_type TEXT DEFAULT NULL,
  p_final_amount NUMERIC DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'card',
  p_notes TEXT DEFAULT NULL,
  p_loyalty_points_redeem INTEGER DEFAULT 0,
  p_loyalty_reward_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
  appt RECORD;
  v_amount NUMERIC;
  v_discount NUMERIC;
  v_final NUMERIC;
  v_discount_type TEXT;
  v_payment_method TEXT;
  v_points_earned INTEGER;
  v_inventory_id UUID;
  v_refreshment TEXT;
  payment_id UUID;
  result JSONB;
BEGIN
  SELECT id, role INTO caller_id, caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN ('cashier', 'super_admin', 'owner', 'partner') THEN
    RAISE EXCEPTION 'Not authorized. Only cashier or management can process checkout.';
  END IF;

  SELECT a.*, p.refreshment_pref AS customer_refreshment
  INTO appt
  FROM appointments a
  LEFT JOIN profiles p ON p.id = a.customer_id
  WHERE a.id = appointment_id;

  IF appt.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found.';
  END IF;

  IF appt.status NOT IN ('ready_for_checkout', 'serving') THEN
    RAISE EXCEPTION 'Appointment is not ready for checkout (status: %).', appt.status;
  END IF;

  v_amount := COALESCE(p_amount, appt.final_price, 0);
  v_discount := COALESCE(p_discount_amount, 0);
  v_final := COALESCE(p_final_amount, GREATEST(v_amount - v_discount, 0));

  v_discount_type := CASE
    WHEN p_discount_type IN ('percentage', 'fixed', 'loyalty', 'coupon') THEN p_discount_type
    WHEN p_discount_type = 'percent' THEN 'percentage'
    WHEN p_discount_type = 'amount' THEN 'fixed'
    WHEN v_discount > 0 AND p_loyalty_points_redeem > 0 THEN 'loyalty'
    WHEN v_discount > 0 THEN 'fixed'
    ELSE NULL
  END;

  v_payment_method := CASE
    WHEN lower(p_payment_method) IN ('cash', 'card', 'other') THEN lower(p_payment_method)
    WHEN lower(p_payment_method) = 'transfer' THEN 'other'
    ELSE 'card'
  END;

  -- Optional loyalty redemption at checkout
  IF p_loyalty_points_redeem > 0 AND appt.customer_id IS NOT NULL THEN
    PERFORM redeem_loyalty_reward(
      appt.customer_id,
      p_loyalty_points_redeem,
      COALESCE(p_loyalty_reward_name, 'Checkout redemption')
    );
  END IF;

  INSERT INTO payment_transactions (
    appointment_id,
    customer_id,
    technician_id,
    cashier_id,
    service_id,
    amount,
    discount_amount,
    discount_type,
    final_amount,
    payment_method,
    status,
    notes
  ) VALUES (
    appointment_id,
    appt.customer_id,
    appt.technician_id,
    caller_id,
    appt.service_id,
    v_amount,
    v_discount,
    v_discount_type,
    v_final,
    v_payment_method,
    'completed',
    p_notes
  )
  RETURNING id INTO payment_id;

  UPDATE appointments SET
    status = 'completed',
    completed_at = NOW(),
    final_price = v_final
  WHERE id = appointment_id;

  -- Refreshment inventory decrement
  v_refreshment := appt.customer_refreshment;
  IF v_refreshment IS NOT NULL AND v_refreshment != '' THEN
    SELECT id INTO v_inventory_id
    FROM inventory
    WHERE item_name = v_refreshment AND category = 'refreshment'
    LIMIT 1;

    IF v_inventory_id IS NOT NULL THEN
      INSERT INTO inventory_logs (
        inventory_id, appointment_id, customer_id, quantity_changed, reason
      ) VALUES (
        v_inventory_id, appointment_id, appt.customer_id, -1, 'Consumed during service'
      );

      UPDATE inventory
      SET quantity = GREATEST(quantity - 1, 0)
      WHERE id = v_inventory_id;
    END IF;
  END IF;

  -- Award loyalty points (1 point per dollar spent, minimum 0)
  IF appt.customer_id IS NOT NULL AND v_final > 0 THEN
    v_points_earned := FLOOR(v_final)::INTEGER;
    IF v_points_earned > 0 THEN
      PERFORM award_loyalty_points(
        appt.customer_id,
        v_points_earned,
        'Points earned from visit checkout',
        'earn'
      );
    END IF;
  END IF;

  SELECT jsonb_build_object(
    'success', true,
    'payment_id', payment_id,
    'final_amount', v_final,
    'points_earned', COALESCE(v_points_earned, 0)
  ) INTO result;

  RETURN result;
END;
$$;

-- ============================================================
-- 4) Restrict complete_appointment — emergency override for management only
-- ============================================================
CREATE OR REPLACE FUNCTION complete_appointment(
  caller_phone TEXT,
  appointment_id UUID,
  p_final_price NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
  prev_status TEXT;
  result JSONB;
BEGIN
  SELECT id, role INTO caller_id, caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician') THEN
    RAISE EXCEPTION 'Not authorized. Only staff can complete appointments.';
  END IF;

  IF caller_role NOT IN ('super_admin', 'owner', 'partner') THEN
    RAISE EXCEPTION 'Direct completion is disabled. Send the client to checkout instead.';
  END IF;

  SELECT status INTO prev_status FROM appointments WHERE id = appointment_id;

  UPDATE appointments SET
    status = 'completed',
    start_time = COALESCE(start_time, NOW()),
    completed_at = NOW(),
    final_price = COALESCE(p_final_price, final_price)
  WHERE id = appointment_id;

  INSERT INTO appointment_status_history (appointment_id, previous_status, new_status, changed_by, note)
  VALUES (appointment_id, prev_status, 'completed', caller_id, 'Management emergency override (no payment recorded)');

  SELECT jsonb_build_object('success', true, 'override', true) INTO result;
  RETURN result;
END;
$$;
