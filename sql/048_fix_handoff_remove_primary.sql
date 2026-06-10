-- Migration 048: Fix handoff, remove co-tech, and primary display
-- Run after 047_co_technician_only_updates.sql

CREATE OR REPLACE FUNCTION multi_tech_technician_on_break(p_technician_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT preferences->>'workstation_status' FROM profiles WHERE id = p_technician_id),
    'available'
  ) = 'on_break';
$$;

CREATE OR REPLACE FUNCTION multi_tech_is_visit_participant(p_appointment_id uuid, p_technician_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM appointment_visit_technicians
    WHERE appointment_id = p_appointment_id
      AND technician_id = p_technician_id
      AND is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM appointments
    WHERE id = p_appointment_id AND technician_id = p_technician_id
  );
$$;

CREATE OR REPLACE FUNCTION get_visit_participating_technicians(
  caller_phone text,
  p_appointment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  appt RECORD;
  v_techs jsonb;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN (
    'super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician'
  ) THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  SELECT * INTO appt FROM appointments WHERE id = p_appointment_id;
  IF appt.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found.';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(sub.*)::jsonb ORDER BY sub.is_primary DESC, sub.full_name), '[]'::jsonb)
  INTO v_techs
  FROM (
    SELECT DISTINCT
      ids.technician_id,
      p.full_name,
      CASE
        WHEN ids.technician_id = appt.technician_id THEN 'primary'
        ELSE 'co_technician'
      END AS participation_type,
      true AS is_active,
      (ids.technician_id = appt.technician_id) AS is_primary
    FROM (
      SELECT avt.technician_id
      FROM appointment_visit_technicians avt
      WHERE avt.appointment_id = p_appointment_id AND avt.is_active = true
      UNION
      SELECT appt.technician_id
      WHERE appt.technician_id IS NOT NULL
    ) ids
    JOIN profiles p ON p.id = ids.technician_id
  ) sub;

  RETURN jsonb_build_object(
    'primary_technician_id', appt.technician_id,
    'technicians', v_techs
  );
END;
$$;

CREATE OR REPLACE FUNCTION handoff_visit_technician(
  caller_phone text,
  p_appointment_id uuid,
  p_new_technician_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  appt RECORD;
  v_old_tech uuid;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE phone = caller_phone;
  IF NOT multi_tech_is_management_role(caller_role) THEN
    RAISE EXCEPTION 'Not authorized. Management role required.';
  END IF;

  SELECT * INTO appt FROM appointments WHERE id = p_appointment_id;
  IF appt.id IS NULL THEN RAISE EXCEPTION 'Appointment not found.'; END IF;
  IF NOT multi_tech_visit_status_ok(appt.status) THEN
    RAISE EXCEPTION 'Cannot hand off when visit status is %.', appt.status;
  END IF;

  v_old_tech := appt.technician_id;

  IF p_new_technician_id = v_old_tech THEN
    RAISE EXCEPTION 'Technician is already the primary technician.';
  END IF;

  IF multi_tech_technician_on_break(p_new_technician_id) THEN
    RAISE EXCEPTION 'Technician is on break.';
  END IF;

  IF NOT multi_tech_is_visit_participant(p_appointment_id, p_new_technician_id)
    AND NOT multi_tech_technician_available(p_new_technician_id, p_appointment_id) THEN
    RAISE EXCEPTION 'Technician is unavailable (busy on another visit).';
  END IF;

  -- New primary no longer needs a co-technician row
  UPDATE appointment_visit_technicians
  SET ended_at = NOW(), is_active = false
  WHERE appointment_id = p_appointment_id
    AND technician_id = p_new_technician_id
    AND is_active = true;

  -- Former primary stays on the visit as co-technician for tip split / visibility
  IF v_old_tech IS NOT NULL THEN
    UPDATE appointment_visit_technicians
    SET ended_at = NOW(), is_active = false
    WHERE appointment_id = p_appointment_id
      AND technician_id = v_old_tech
      AND is_active = true;

    INSERT INTO appointment_visit_technicians (
      appointment_id, technician_id, participation_type, is_active
    ) VALUES (
      p_appointment_id, v_old_tech, 'co_technician', true
    );
  END IF;

  UPDATE appointments SET technician_id = p_new_technician_id WHERE id = p_appointment_id;

  RETURN jsonb_build_object(
    'success', true,
    'previous_technician_id', v_old_tech,
    'primary_technician_id', p_new_technician_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION remove_visit_technician(
  caller_phone text,
  p_appointment_id uuid,
  p_technician_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  appt RECORD;
  v_updated int;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE phone = caller_phone;
  IF NOT multi_tech_is_management_role(caller_role) THEN
    RAISE EXCEPTION 'Not authorized. Management role required.';
  END IF;

  SELECT * INTO appt FROM appointments WHERE id = p_appointment_id;
  IF appt.id IS NULL THEN RAISE EXCEPTION 'Appointment not found.'; END IF;
  IF NOT multi_tech_visit_status_ok(appt.status) THEN
    RAISE EXCEPTION 'Cannot remove technicians when visit status is %.', appt.status;
  END IF;

  IF p_technician_id = appt.technician_id THEN
    RAISE EXCEPTION 'Cannot remove the primary technician. Use handoff to change primary.';
  END IF;

  UPDATE appointment_visit_technicians
  SET ended_at = NOW(), is_active = false
  WHERE appointment_id = p_appointment_id
    AND technician_id = p_technician_id
    AND is_active = true;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Technician is not an active co-technician on this visit.';
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
