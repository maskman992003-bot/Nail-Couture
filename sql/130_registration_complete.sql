-- Migration 130: Track incomplete customer registrations (e.g. staff-created booking profiles)
-- Run in Supabase SQL Editor after prior migrations.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS registration_complete boolean NOT NULL DEFAULT false;

-- Existing fully registered customers
UPDATE profiles
SET registration_complete = true
WHERE role = 'customer'
  AND COALESCE(TRIM(email), '') <> ''
  AND COALESCE(TRIM(birthday), '') <> '';

-- Non-customer roles are never subject to customer onboarding
UPDATE profiles
SET registration_complete = true
WHERE role IS DISTINCT FROM 'customer';

-- process_kiosk_check_in: include registration_complete on returned profile
CREATE OR REPLACE FUNCTION process_kiosk_check_in(
  p_phone TEXT,
  p_checked_in_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_phone TEXT;
  v_profile RECORD;
  v_appointment RECORD;
  v_new_id UUID;
  result JSONB;
BEGIN
  clean_phone := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  IF length(clean_phone) < 10 THEN
    RAISE EXCEPTION 'Invalid phone number.';
  END IF;

  SELECT id, full_name, phone, email, nail_goal, refreshment_pref, role, registration_complete
  INTO v_profile
  FROM profiles
  WHERE regexp_replace(phone, '\D', '', 'g') = clean_phone
     OR phone = clean_phone
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_profile.id IS NULL THEN
    RETURN jsonb_build_object('is_new', true);
  END IF;

  SELECT id, status, service_id, scheduled_at
  INTO v_appointment
  FROM appointments
  WHERE customer_id = v_profile.id
    AND status IN ('confirmed', 'checking_in', 'waiting', 'serving')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_appointment.id IS NOT NULL THEN
    IF v_appointment.status = 'serving' THEN
      v_appointment.id := NULL;
    ELSIF v_appointment.status = 'checking_in' THEN
      SELECT row_to_json(a.*)::jsonb INTO result
      FROM appointments a WHERE a.id = v_appointment.id;

      RETURN jsonb_build_object(
        'is_new', false,
        'name', v_profile.full_name,
        'profile', row_to_json(v_profile)::jsonb,
        'appointment', result
      );
    ELSIF v_appointment.status = 'confirmed' THEN
      UPDATE appointments SET
        status = 'checking_in',
        checked_in_at = NULL,
        checked_in_by = COALESCE(p_checked_in_by, checked_in_by)
      WHERE id = v_appointment.id;
    ELSIF v_appointment.status = 'waiting' THEN
      UPDATE appointments SET
        status = 'checking_in',
        checked_in_at = NULL,
        checked_in_by = COALESCE(p_checked_in_by, checked_in_by)
      WHERE id = v_appointment.id;
    END IF;

    IF v_appointment.id IS NOT NULL THEN
      SELECT row_to_json(a.*)::jsonb INTO result
      FROM appointments a WHERE a.id = v_appointment.id;

      RETURN jsonb_build_object(
        'is_new', false,
        'name', v_profile.full_name,
        'profile', row_to_json(v_profile)::jsonb,
        'appointment', result
      );
    END IF;
  END IF;

  INSERT INTO appointments (
    customer_id,
    status,
    checked_in_by,
    booking_type
  ) VALUES (
    v_profile.id,
    'checking_in',
    p_checked_in_by,
    'walk_in'
  )
  RETURNING id INTO v_new_id;

  SELECT row_to_json(a.*)::jsonb INTO result
  FROM appointments a WHERE a.id = v_new_id;

  RETURN jsonb_build_object(
    'is_new', false,
    'name', v_profile.full_name,
    'profile', row_to_json(v_profile)::jsonb,
    'appointment', result
  );
END;
$$;
