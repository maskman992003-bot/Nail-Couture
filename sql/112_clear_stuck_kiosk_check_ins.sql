-- Migration 112: Super admin tools for stuck kiosk walk-ins (checking_in + waiting)

CREATE OR REPLACE FUNCTION get_stuck_kiosk_check_ins(caller_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  result JSONB;
  v_checking_in_count INTEGER;
  v_waiting_count INTEGER;
BEGIN
  SELECT role::text INTO v_role
  FROM profiles
  WHERE regexp_replace(phone, '\D', '', 'g') = regexp_replace(COALESCE(caller_phone, ''), '\D', '', 'g')
     OR phone = caller_phone
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_role IS NULL OR v_role <> 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT COALESCE(
    jsonb_agg(row_data ORDER BY row_data->>'created_at' DESC),
    '[]'::jsonb
  ) INTO result
  FROM (
    SELECT jsonb_build_object(
      'id', a.id,
      'status', a.status,
      'booking_type', a.booking_type,
      'created_at', a.created_at,
      'checked_in_at', a.checked_in_at,
      'refreshment_pref', a.refreshment_pref,
      'customer_name', p.full_name,
      'customer_phone', p.phone
    ) AS row_data
    FROM appointments a
    JOIN profiles p ON p.id = a.customer_id
    WHERE a.booking_type = 'walk_in'
      AND a.status IN ('checking_in', 'waiting')
  ) sub;

  SELECT
    COUNT(*) FILTER (WHERE a.status = 'checking_in'),
    COUNT(*) FILTER (WHERE a.status = 'waiting')
  INTO v_checking_in_count, v_waiting_count
  FROM appointments a
  WHERE a.booking_type = 'walk_in'
    AND a.status IN ('checking_in', 'waiting');

  RETURN jsonb_build_object(
    'success', true,
    'count', jsonb_array_length(result),
    'checking_in_count', COALESCE(v_checking_in_count, 0),
    'waiting_count', COALESCE(v_waiting_count, 0),
    'appointments', result
  );
END;
$$;

CREATE OR REPLACE FUNCTION clear_stuck_kiosk_check_ins(
  caller_phone TEXT,
  p_action TEXT DEFAULT 'cancel',
  p_appointment_ids UUID[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_action TEXT;
  affected INTEGER;
  updated_rows JSONB;
BEGIN
  SELECT role::text INTO v_role
  FROM profiles
  WHERE regexp_replace(phone, '\D', '', 'g') = regexp_replace(COALESCE(caller_phone, ''), '\D', '', 'g')
     OR phone = caller_phone
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_role IS NULL OR v_role <> 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  v_action := lower(COALESCE(p_action, 'cancel'));
  IF v_action NOT IN ('cancel', 'move_to_waiting') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_action');
  END IF;

  IF v_action = 'cancel' THEN
    UPDATE appointments a
    SET status = 'cancelled'
    WHERE a.booking_type = 'walk_in'
      AND a.status IN ('checking_in', 'waiting')
      AND (p_appointment_ids IS NULL OR a.id = ANY(p_appointment_ids));
  ELSE
    UPDATE appointments a
    SET
      status = 'waiting',
      checked_in_at = COALESCE(a.checked_in_at, NOW())
    WHERE a.booking_type = 'walk_in'
      AND a.status = 'checking_in'
      AND (p_appointment_ids IS NULL OR a.id = ANY(p_appointment_ids));
  END IF;

  GET DIAGNOSTICS affected = ROW_COUNT;

  SELECT COALESCE(
    jsonb_agg(jsonb_build_object(
      'id', a.id,
      'status', a.status,
      'customer_name', p.full_name,
      'customer_phone', p.phone
    )),
    '[]'::jsonb
  ) INTO updated_rows
  FROM appointments a
  JOIN profiles p ON p.id = a.customer_id
  WHERE p_appointment_ids IS NOT NULL
    AND a.id = ANY(p_appointment_ids);

  RETURN jsonb_build_object(
    'success', true,
    'action', v_action,
    'affected_count', affected,
    'appointments', updated_rows
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_stuck_kiosk_check_ins(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION clear_stuck_kiosk_check_ins(TEXT, TEXT, UUID[]) TO authenticated;
