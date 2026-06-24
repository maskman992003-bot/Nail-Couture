-- Migration 111: Fix kiosk check-in stuck in checking_in / stale waiting visits
-- Run after 096 and 110 in Supabase SQL Editor

-- Remove duplicate 2-arg overload so PostgREST always hits the version with defaults
DROP FUNCTION IF EXISTS complete_kiosk_check_in(TEXT, UUID);

-- ============================================================
-- 1) process_kiosk_check_in — reset stale waiting visits; new row if serving
-- ============================================================
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

-- ============================================================
-- 2) complete_kiosk_check_in — always move checking_in/confirmed/waiting to lobby
-- ============================================================
CREATE OR REPLACE FUNCTION complete_kiosk_check_in(
  caller_phone TEXT,
  appointment_id UUID,
  p_service_id BIGINT DEFAULT NULL,
  p_add_ons TEXT DEFAULT NULL,
  p_selected_service_names TEXT DEFAULT NULL,
  p_final_price NUMERIC DEFAULT NULL,
  p_refreshment_pref TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  appt RECORD;
  v_appt_id UUID;
  v_refreshment TEXT;
  v_inventory_id UUID;
  v_profile_refreshment TEXT;
  result JSONB;
BEGIN
  v_appt_id := appointment_id;

  SELECT id INTO caller_id
  FROM profiles
  WHERE regexp_replace(phone, '\D', '', 'g') = regexp_replace(COALESCE(caller_phone, ''), '\D', '', 'g')
     OR phone = caller_phone
  ORDER BY created_at ASC
  LIMIT 1;

  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for this phone number.';
  END IF;

  SELECT * INTO appt
  FROM appointments
  WHERE id = v_appt_id AND customer_id = caller_id;

  IF appt.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found or does not belong to you.';
  END IF;

  IF appt.status NOT IN ('checking_in', 'confirmed', 'waiting') THEN
    SELECT jsonb_build_object(
      'success', true,
      'appointment', row_to_json(a.*)::jsonb
    ) INTO result
    FROM appointments a WHERE a.id = v_appt_id;
    RETURN result;
  END IF;

  SELECT NULLIF(TRIM(refreshment_pref), '') INTO v_profile_refreshment
  FROM profiles
  WHERE id = caller_id;

  v_refreshment := COALESCE(
    NULLIF(TRIM(p_refreshment_pref), ''),
    NULLIF(TRIM(appt.refreshment_pref), ''),
    v_profile_refreshment
  );

  UPDATE appointments SET
    service_id = COALESCE(p_service_id, service_id),
    add_ons = COALESCE(p_add_ons, add_ons),
    selected_service_names = COALESCE(p_selected_service_names, selected_service_names),
    final_price = COALESCE(p_final_price, final_price),
    refreshment_pref = COALESCE(NULLIF(TRIM(p_refreshment_pref), ''), refreshment_pref, v_profile_refreshment),
    status = 'waiting',
    checked_in_at = NOW()
  WHERE id = v_appt_id;

  IF v_refreshment IS NOT NULL THEN
    UPDATE profiles
    SET refreshment_pref = v_refreshment
    WHERE id = caller_id;

    SELECT id INTO v_inventory_id
    FROM inventory
    WHERE lower(trim(category)) = 'refreshment'
      AND lower(trim(item_name)) = lower(trim(v_refreshment))
    ORDER BY quantity DESC
    LIMIT 1;

    IF v_inventory_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM inventory_logs il
      WHERE il.appointment_id = v_appt_id
        AND il.inventory_id = v_inventory_id
        AND il.quantity_changed < 0
    ) THEN
      INSERT INTO inventory_logs (
        inventory_id, appointment_id, customer_id, quantity_changed, reason
      ) VALUES (
        v_inventory_id, v_appt_id, caller_id, -1, 'Kiosk check-in refreshment'
      );

      UPDATE inventory
      SET quantity = GREATEST(quantity - 1, 0), updated_at = NOW()
      WHERE id = v_inventory_id;
    END IF;
  END IF;

  SELECT jsonb_build_object(
    'success', true,
    'appointment', row_to_json(a.*)::jsonb
  ) INTO result
  FROM appointments a WHERE a.id = v_appt_id;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION complete_kiosk_check_in(TEXT, UUID, BIGINT, TEXT, TEXT, NUMERIC, TEXT) TO anon, authenticated;
