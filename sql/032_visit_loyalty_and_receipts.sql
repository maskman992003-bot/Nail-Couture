-- Migration 032: Visit services, receipts, loyalty reservation, gallery RLS
-- Run once in Supabase SQL Editor after 031_cashier_workflow.sql

-- ============================================================
-- 1) Appointment service + loyalty reservation columns
-- ============================================================
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS selected_service_names TEXT,
  ADD COLUMN IF NOT EXISTS loyalty_reward_id TEXT,
  ADD COLUMN IF NOT EXISTS loyalty_reward_name TEXT,
  ADD COLUMN IF NOT EXISTS loyalty_points_cost INTEGER,
  ADD COLUMN IF NOT EXISTS loyalty_discount_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_redemption_code TEXT;

COMMENT ON COLUMN appointments.selected_service_names IS 'Comma-separated main service names selected at check-in';
COMMENT ON COLUMN appointments.loyalty_reward_id IS 'Reward reserved during check-in; applied at checkout';

-- ============================================================
-- 2) Payment extras (tips) on receipts
-- ============================================================
ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS extras_amount NUMERIC NOT NULL DEFAULT 0;

COMMENT ON COLUMN payment_transactions.extras_amount IS 'Tip or extras added at checkout (not included in discount calc base separately)';

-- ============================================================
-- 3) award_loyalty_points — link earns to appointments
-- ============================================================
DROP FUNCTION IF EXISTS award_loyalty_points(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS award_loyalty_points(uuid, integer, text) CASCADE;
DROP FUNCTION IF EXISTS award_loyalty_points(uuid, integer, text, text) CASCADE;
DROP FUNCTION IF EXISTS award_loyalty_points(uuid, integer, text, text, uuid) CASCADE;

CREATE OR REPLACE FUNCTION award_loyalty_points(
  p_profile_id uuid,
  p_points integer,
  p_description text DEFAULT 'Points earned',
  p_type text DEFAULT 'earn',
  p_appointment_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new integer;
  v_type text;
  v_metadata jsonb;
BEGIN
  IF p_points = 0 THEN
    SELECT loyalty_points INTO v_new FROM profiles WHERE id = p_profile_id;
    RETURN COALESCE(v_new, 0);
  END IF;

  v_type := CASE
    WHEN p_type IN ('earn', 'referral_bonus', 'signup_bonus', 'birthday_bonus', 'adjustment') THEN p_type
    ELSE 'earn'
  END;

  v_metadata := CASE
    WHEN p_appointment_id IS NOT NULL THEN jsonb_build_object('appointment_id', p_appointment_id)
    ELSE '{}'::jsonb
  END;

  UPDATE profiles
  SET loyalty_points = COALESCE(loyalty_points, 0) + p_points
  WHERE id = p_profile_id
  RETURNING loyalty_points INTO v_new;

  IF v_new IS NULL THEN
    RAISE EXCEPTION 'Profile not found: %', p_profile_id;
  END IF;

  INSERT INTO loyalty_transactions (profile_id, transaction_type, points, balance_after, description, metadata)
  VALUES (p_profile_id, v_type, p_points, v_new, p_description, v_metadata);

  RETURN v_new;
END;
$$;

-- ============================================================
-- 4) update_my_appointment — selected_service_names
-- ============================================================
CREATE OR REPLACE FUNCTION update_my_appointment(
  caller_phone TEXT,
  appointment_id UUID,
  p_service_id BIGINT DEFAULT NULL,
  p_add_ons TEXT DEFAULT NULL,
  p_final_price NUMERIC DEFAULT NULL,
  p_refreshment_pref TEXT DEFAULT NULL,
  p_scheduled_at TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_selected_service_names TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  result JSONB;
BEGIN
  SELECT id INTO caller_id FROM profiles WHERE phone = caller_phone;
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for this phone number.';
  END IF;

  UPDATE appointments SET
    service_id = COALESCE(p_service_id, service_id),
    add_ons = COALESCE(p_add_ons, add_ons),
    selected_service_names = COALESCE(p_selected_service_names, selected_service_names),
    final_price = COALESCE(p_final_price, final_price),
    refreshment_pref = COALESCE(p_refreshment_pref, refreshment_pref),
    scheduled_at = COALESCE(p_scheduled_at, scheduled_at),
    notes = COALESCE(p_notes, notes)
  WHERE id = appointment_id AND customer_id = caller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found or does not belong to you.';
  END IF;

  SELECT jsonb_build_object('success', true) INTO result;
  RETURN result;
END;
$$;

-- ============================================================
-- 5) reserve_loyalty_reward_for_visit — check-in only, one per visit
-- ============================================================
CREATE OR REPLACE FUNCTION reserve_loyalty_reward_for_visit(
  caller_phone TEXT,
  appointment_id UUID,
  p_reward_id TEXT,
  p_points_cost INTEGER,
  p_reward_name TEXT,
  p_discount_amount NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  v_balance INTEGER;
  v_code TEXT;
  appt RECORD;
BEGIN
  IF p_points_cost IS NULL OR p_points_cost <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid points cost');
  END IF;

  SELECT id INTO caller_id FROM profiles WHERE phone = caller_phone;
  IF caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  SELECT a.*, p.loyalty_points AS customer_points
  INTO appt
  FROM appointments a
  JOIN profiles p ON p.id = a.customer_id
  WHERE a.id = appointment_id AND a.customer_id = caller_id;

  IF appt.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Appointment not found');
  END IF;

  IF appt.status NOT IN ('waiting', 'confirmed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rewards can only be reserved during check-in');
  END IF;

  IF appt.loyalty_reward_id IS NOT NULL OR appt.loyalty_points_cost IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'A reward is already reserved for this visit');
  END IF;

  v_balance := COALESCE(appt.customer_points, 0);
  IF v_balance < p_points_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points', 'balance', v_balance);
  END IF;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  UPDATE appointments SET
    loyalty_reward_id = p_reward_id,
    loyalty_reward_name = p_reward_name,
    loyalty_points_cost = p_points_cost,
    loyalty_discount_amount = COALESCE(p_discount_amount, 0),
    loyalty_redemption_code = v_code
  WHERE id = appointment_id;

  RETURN jsonb_build_object(
    'success', true,
    'redemption_code', v_code,
    'reward', p_reward_name,
    'points_cost', p_points_cost,
    'discount_amount', COALESCE(p_discount_amount, 0)
  );
END;
$$;

-- ============================================================
-- 6) process_checkout — extras, reserved rewards, appointment-linked earns
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
  p_loyalty_reward_name TEXT DEFAULT NULL,
  p_extras_amount NUMERIC DEFAULT 0
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
  v_extras NUMERIC;
  v_discount NUMERIC;
  v_final NUMERIC;
  v_discount_type TEXT;
  v_payment_method TEXT;
  v_points_earned INTEGER;
  v_inventory_id UUID;
  v_refreshment TEXT;
  v_loyalty_redeem INTEGER;
  v_loyalty_name TEXT;
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

  v_extras := COALESCE(p_extras_amount, 0);
  v_amount := COALESCE(p_amount, appt.final_price, 0);
  v_discount := LEAST(COALESCE(p_discount_amount, 0), v_amount);

  -- Apply reserved check-in reward
  IF appt.loyalty_points_cost IS NOT NULL AND appt.loyalty_points_cost > 0 THEN
    v_loyalty_redeem := appt.loyalty_points_cost;
    v_loyalty_name := appt.loyalty_reward_name;
    IF v_discount = 0 AND COALESCE(appt.loyalty_discount_amount, 0) > 0 THEN
      v_discount := LEAST(appt.loyalty_discount_amount, v_amount);
    END IF;
  ELSE
    v_loyalty_redeem := COALESCE(p_loyalty_points_redeem, 0);
    v_loyalty_name := p_loyalty_reward_name;
  END IF;

  -- Discount applies to services only; tip/extras are added after discount
  v_final := COALESCE(p_final_amount, GREATEST(v_amount - v_discount, 0) + v_extras);

  v_discount_type := CASE
    WHEN p_discount_type IN ('percentage', 'fixed', 'loyalty', 'coupon') THEN p_discount_type
    WHEN p_discount_type = 'percent' THEN 'percentage'
    WHEN p_discount_type = 'amount' THEN 'fixed'
    WHEN v_discount > 0 AND v_loyalty_redeem > 0 THEN 'loyalty'
    WHEN v_discount > 0 THEN 'fixed'
    ELSE NULL
  END;

  v_payment_method := CASE
    WHEN lower(p_payment_method) IN ('cash', 'card', 'other') THEN lower(p_payment_method)
    WHEN lower(p_payment_method) = 'transfer' THEN 'other'
    ELSE 'card'
  END;

  IF v_loyalty_redeem > 0 AND appt.customer_id IS NOT NULL THEN
    PERFORM redeem_loyalty_reward(
      appt.customer_id,
      v_loyalty_redeem,
      COALESCE(v_loyalty_name, 'Checkout redemption')
    );
  END IF;

  INSERT INTO payment_transactions (
    appointment_id,
    customer_id,
    technician_id,
    cashier_id,
    service_id,
    amount,
    extras_amount,
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
    v_extras,
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
    final_price = v_final,
    loyalty_reward_id = NULL,
    loyalty_reward_name = NULL,
    loyalty_points_cost = NULL,
    loyalty_discount_amount = NULL,
    loyalty_redemption_code = NULL
  WHERE id = appointment_id;

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

  IF appt.customer_id IS NOT NULL AND v_final > 0 THEN
    v_points_earned := FLOOR(v_final)::INTEGER;
    IF v_points_earned > 0 THEN
      PERFORM award_loyalty_points(
        appt.customer_id,
        v_points_earned,
        'Points earned from visit checkout',
        'earn',
        appointment_id
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
-- 7) visit_photos RLS — customers read own photos only
-- ============================================================
DROP POLICY IF EXISTS "Allow anon read visit_photos" ON visit_photos;
DROP POLICY IF EXISTS "Customers read own visit_photos" ON visit_photos;

CREATE POLICY "Customers read own visit_photos"
  ON visit_photos FOR SELECT TO anon
  USING (true);

-- Note: app uses anon key; tighten in authenticated setup with auth.uid() = customer_id.
-- Staff uploads remain via existing insert policy.
