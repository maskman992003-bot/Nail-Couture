-- Migration 039: P1 notification events + schedule/staff/waiver hooks
-- Run after 038_gate_external_messaging.sql

-- ============================================================
-- 1) Waiver signed → notify admin
-- ============================================================
CREATE OR REPLACE FUNCTION notify_waiver_signed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_name text;
BEGIN
  v_customer_name := COALESCE(NEW.customer_name, 'Client');

  PERFORM notify_roles(
    ARRAY['admin']::user_role[],
    'Waiver signed',
    format('%s signed their waiver.', v_customer_name),
    'waiver_signed',
    NEW.profile_id,
    jsonb_build_object('waiver_id', NEW.id)
  );

  IF NEW.profile_id IS NOT NULL THEN
    PERFORM create_notification(
      NEW.profile_id,
      'Waiver received',
      'Thank you — your waiver is on file.',
      'waiver_signed',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_waiver_signed ON customer_waivers;
CREATE TRIGGER trg_notify_waiver_signed
  AFTER INSERT ON customer_waivers
  FOR EACH ROW
  EXECUTE FUNCTION notify_waiver_signed();

-- ============================================================
-- 2) New staff member → notify management
-- ============================================================
CREATE OR REPLACE FUNCTION notify_staff_profile_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IN ('technician', 'cashier', 'admin') THEN
    PERFORM notify_roles(
      ARRAY['super_admin', 'owner', 'partner']::user_role[],
      'New staff member',
      format('%s was added as %s.', COALESCE(NEW.full_name, 'Staff'), NEW.role),
      'staff_added',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_staff_profile_created ON profiles;
CREATE TRIGGER trg_notify_staff_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_staff_profile_created();

-- ============================================================
-- 3) Shift create/delete → notify employee
-- ============================================================
CREATE OR REPLACE FUNCTION create_shift(
  p_employee_id uuid,
  p_shift_date date,
  p_shift_type text,
  p_start_time time,
  p_end_time time
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shift_id uuid;
BEGIN
  INSERT INTO shifts (employee_id, shift_date, shift_type, start_time, end_time)
  VALUES (p_employee_id, p_shift_date, p_shift_type, p_start_time, p_end_time)
  RETURNING id INTO v_shift_id;

  IF p_employee_id IS NOT NULL THEN
    PERFORM create_notification(
      p_employee_id,
      'Schedule updated',
      format('You are scheduled on %s (%s – %s).', p_shift_date, p_start_time, p_end_time),
      'schedule_changed',
      v_shift_id
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION delete_shift(p_shift_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id uuid;
BEGIN
  SELECT employee_id INTO v_employee_id FROM shifts WHERE id = p_shift_id;

  DELETE FROM shifts WHERE id = p_shift_id;

  IF v_employee_id IS NOT NULL THEN
    PERFORM create_notification(
      v_employee_id,
      'Schedule updated',
      'A shift was removed from your schedule.',
      'schedule_changed',
      p_shift_id
    );
  END IF;
END;
$$;

-- ============================================================
-- 4) Loyalty reserved at check-in → notify cashiers
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
  v_customer_name text;
BEGIN
  IF p_points_cost IS NULL OR p_points_cost <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid points cost');
  END IF;

  SELECT id INTO caller_id FROM profiles WHERE phone = caller_phone;
  IF caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  SELECT a.*, p.loyalty_points AS customer_points, p.full_name AS customer_name
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
  v_customer_name := COALESCE(appt.customer_name, 'Client');

  UPDATE appointments SET
    loyalty_reward_id = p_reward_id,
    loyalty_reward_name = p_reward_name,
    loyalty_points_cost = p_points_cost,
    loyalty_discount_amount = COALESCE(p_discount_amount, 0),
    loyalty_redemption_code = v_code
  WHERE id = appointment_id;

  PERFORM notify_roles(
    ARRAY['cashier']::user_role[],
    'Loyalty reward at checkout',
    format('%s is redeeming %s (%s pts).', v_customer_name, COALESCE(p_reward_name, 'reward'), p_points_cost),
    'loyalty_at_checkout',
    appointment_id
  );

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
-- 5) Referral bonus on signup — ensure referrer gets notified
--    (award_loyalty_points already notifies for referral_bonus type)
-- ============================================================
CREATE OR REPLACE FUNCTION notify_referrer_on_signup(
  p_referrer_id uuid,
  p_referred_name text,
  p_points integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_referrer_id IS NULL OR p_points <= 0 THEN
    RETURN;
  END IF;

  PERFORM award_loyalty_points(
    p_referrer_id,
    p_points,
    format('Referral bonus for %s', COALESCE(p_referred_name, 'new client')),
    'referral_bonus',
    NULL
  );
END;
$$;

COMMENT ON FUNCTION notify_referrer_on_signup IS
  'Call after new customer signup when referral_by is set. Awards points + in-app notification.';
