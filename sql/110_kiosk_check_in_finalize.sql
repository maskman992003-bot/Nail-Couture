-- Migration 110: Finalize kiosk check-in with services, drink, profile sync, and inventory
-- Run after 096_kiosk_checking_in_status.sql

-- ============================================================
-- 1) complete_kiosk_check_in — save visit details, deduct drink, move to lobby
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
  v_refreshment TEXT;
  v_inventory_id UUID;
  result JSONB;
BEGIN
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
  WHERE id = appointment_id AND customer_id = caller_id;

  IF appt.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found or does not belong to you.';
  END IF;

  IF appt.status NOT IN ('checking_in', 'confirmed') THEN
    SELECT jsonb_build_object(
      'success', true,
      'appointment', row_to_json(a.*)::jsonb
    ) INTO result
    FROM appointments a WHERE a.id = appointment_id;
    RETURN result;
  END IF;

  v_refreshment := COALESCE(
    NULLIF(TRIM(p_refreshment_pref), ''),
    NULLIF(TRIM(appt.refreshment_pref), '')
  );

  UPDATE appointments SET
    service_id = COALESCE(p_service_id, service_id),
    add_ons = COALESCE(p_add_ons, add_ons),
    selected_service_names = COALESCE(p_selected_service_names, selected_service_names),
    final_price = COALESCE(p_final_price, final_price),
    refreshment_pref = COALESCE(NULLIF(TRIM(p_refreshment_pref), ''), refreshment_pref),
    status = 'waiting',
    checked_in_at = COALESCE(checked_in_at, NOW())
  WHERE id = appointment_id;

  IF v_refreshment IS NOT NULL THEN
    UPDATE profiles
    SET refreshment_pref = v_refreshment
    WHERE id = caller_id;

    SELECT id INTO v_inventory_id
    FROM inventory
    WHERE item_name = v_refreshment AND category = 'refreshment'
    LIMIT 1;

    IF v_inventory_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM inventory_logs il
      WHERE il.appointment_id = appointment_id
        AND il.inventory_id = v_inventory_id
        AND il.quantity_changed < 0
    ) THEN
      INSERT INTO inventory_logs (
        inventory_id, appointment_id, customer_id, quantity_changed, reason
      ) VALUES (
        v_inventory_id, appointment_id, caller_id, -1, 'Kiosk check-in refreshment'
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
  FROM appointments a WHERE a.id = appointment_id;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION complete_kiosk_check_in(TEXT, UUID, BIGINT, TEXT, TEXT, NUMERIC, TEXT) TO anon, authenticated;

-- ============================================================
-- 2) update_my_appointment — normalize caller phone for kiosk
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
  caller_name TEXT;
  old_row appointments%ROWTYPE;
  old_service_names TEXT;
  new_service_names TEXT;
  new_addons TEXT;
  new_final_price NUMERIC;
  result JSONB;
BEGIN
  SELECT id, full_name INTO caller_id, caller_name
  FROM profiles
  WHERE regexp_replace(phone, '\D', '', 'g') = regexp_replace(COALESCE(caller_phone, ''), '\D', '', 'g')
     OR phone = caller_phone
  ORDER BY created_at ASC
  LIMIT 1;

  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for this phone number.';
  END IF;

  SELECT * INTO old_row
  FROM appointments
  WHERE id = appointment_id AND customer_id = caller_id;

  IF old_row.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found or does not belong to you.';
  END IF;

  old_service_names := resolve_appointment_service_names(old_row.service_id, old_row.selected_service_names);
  new_service_names := resolve_appointment_service_names(
    COALESCE(p_service_id, old_row.service_id),
    COALESCE(p_selected_service_names, old_row.selected_service_names)
  );
  new_addons := COALESCE(p_add_ons, old_row.add_ons);
  new_final_price := COALESCE(p_final_price, old_row.final_price);

  IF p_service_id IS NOT NULL
     OR p_add_ons IS NOT NULL
     OR p_final_price IS NOT NULL
     OR p_selected_service_names IS NOT NULL THEN
    PERFORM log_appointment_service_change(
      appointment_id,
      caller_id,
      COALESCE(caller_name, 'Customer'),
      'customer_kiosk',
      old_service_names,
      new_service_names,
      old_row.add_ons,
      new_addons,
      old_row.final_price,
      new_final_price
    );
  END IF;

  UPDATE appointments SET
    service_id = COALESCE(p_service_id, service_id),
    add_ons = COALESCE(p_add_ons, add_ons),
    selected_service_names = COALESCE(p_selected_service_names, selected_service_names),
    final_price = COALESCE(p_final_price, final_price),
    refreshment_pref = COALESCE(NULLIF(TRIM(p_refreshment_pref), ''), refreshment_pref),
    scheduled_at = COALESCE(p_scheduled_at, scheduled_at),
    notes = COALESCE(p_notes, notes)
  WHERE id = appointment_id AND customer_id = caller_id;

  IF p_refreshment_pref IS NOT NULL AND TRIM(p_refreshment_pref) != '' THEN
    UPDATE profiles
    SET refreshment_pref = TRIM(p_refreshment_pref)
    WHERE id = caller_id;
  END IF;

  SELECT jsonb_build_object('success', true) INTO result;
  RETURN result;
END;
$$;
