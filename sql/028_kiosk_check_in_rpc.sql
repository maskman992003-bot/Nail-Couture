-- Migration 028: Kiosk check-in RPC
-- The kiosk runs as anon (no Supabase Auth session). Direct UPDATE on appointments
-- fails because anon has no UPDATE policy — .select().single() then errors with
-- "Cannot coerce the result to a single JSON object".

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

  SELECT id, full_name, phone, email, nail_goal, refreshment_pref, role
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
    AND status IN ('confirmed', 'waiting', 'serving')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_appointment.id IS NOT NULL THEN
    UPDATE appointments SET
      status = 'waiting',
      checked_in_at = NOW(),
      checked_in_by = COALESCE(p_checked_in_by, checked_in_by)
    WHERE id = v_appointment.id;

    SELECT row_to_json(a.*)::jsonb INTO result
    FROM appointments a WHERE a.id = v_appointment.id;

    RETURN jsonb_build_object(
      'is_new', false,
      'name', v_profile.full_name,
      'profile', row_to_json(v_profile)::jsonb,
      'appointment', result
    );
  END IF;

  INSERT INTO appointments (
    customer_id,
    status,
    checked_in_at,
    checked_in_by,
    booking_type
  ) VALUES (
    v_profile.id,
    'waiting',
    NOW(),
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
