-- Migration 113: Reliable refreshment inventory deduction on kiosk check-in complete
-- Run after sql/111_kiosk_check_in_fix.sql

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
    'appointment', row_to_json(a.*)::jsonb,
    'refreshment_deducted', (
      v_refreshment IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM inventory_logs il
        WHERE il.appointment_id = v_appt_id
          AND il.quantity_changed < 0
          AND il.reason = 'Kiosk check-in refreshment'
      )
    )
  ) INTO result
  FROM appointments a WHERE a.id = v_appt_id;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION complete_kiosk_check_in(TEXT, UUID, BIGINT, TEXT, TEXT, NUMERIC, TEXT) TO anon, authenticated;

-- Standalone deduction RPC — call from kiosk client if complete_kiosk_check_in did not deduct
CREATE OR REPLACE FUNCTION deduct_kiosk_check_in_refreshment(
  caller_phone TEXT,
  appointment_id UUID,
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
  v_deducted BOOLEAN := false;
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

  SELECT NULLIF(TRIM(refreshment_pref), '') INTO v_profile_refreshment
  FROM profiles
  WHERE id = caller_id;

  v_refreshment := COALESCE(
    NULLIF(TRIM(p_refreshment_pref), ''),
    NULLIF(TRIM(appt.refreshment_pref), ''),
    v_profile_refreshment
  );

  IF v_refreshment IS NULL THEN
    RETURN jsonb_build_object('success', true, 'deducted', false, 'reason', 'no_refreshment');
  END IF;

  UPDATE appointments
  SET refreshment_pref = v_refreshment
  WHERE id = v_appt_id AND refreshment_pref IS DISTINCT FROM v_refreshment;

  UPDATE profiles
  SET refreshment_pref = v_refreshment
  WHERE id = caller_id;

  SELECT id INTO v_inventory_id
  FROM inventory
  WHERE lower(trim(category)) = 'refreshment'
    AND lower(trim(item_name)) = lower(trim(v_refreshment))
  ORDER BY quantity DESC
  LIMIT 1;

  IF v_inventory_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'deducted', false,
      'reason', 'inventory_not_found',
      'refreshment', v_refreshment
    );
  END IF;

  IF NOT EXISTS (
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

    v_deducted := true;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'deducted', v_deducted,
    'refreshment', v_refreshment,
    'inventory_id', v_inventory_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION deduct_kiosk_check_in_refreshment(TEXT, UUID, TEXT) TO anon, authenticated;
