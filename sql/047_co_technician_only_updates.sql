-- Migration 047: Co-technician-only workflow (no per-service sync in UI path)
-- Run after 046_multi_technician_visits.sql

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

  SELECT COALESCE(jsonb_agg(sub.* ORDER BY sub.is_primary DESC, sub.full_name), '[]'::jsonb)
  INTO v_techs
  FROM (
    SELECT DISTINCT ON (t.technician_id)
      t.technician_id,
      p.full_name,
      t.participation_type,
      t.is_active,
      (t.technician_id = appt.technician_id) AS is_primary
    FROM (
      SELECT avt.technician_id, avt.participation_type, avt.is_active
      FROM appointment_visit_technicians avt
      WHERE avt.appointment_id = p_appointment_id AND avt.is_active = true
      UNION
      SELECT appt.technician_id, 'primary'::text, true
      WHERE appt.technician_id IS NOT NULL
    ) t
    JOIN profiles p ON p.id = t.technician_id
    ORDER BY t.technician_id, t.is_active DESC
  ) sub;

  RETURN jsonb_build_object('technicians', v_techs);
END;
$$;

CREATE OR REPLACE FUNCTION add_visit_co_technician(
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
  caller_id uuid;
  appt RECORD;
  v_co_tech_count int;
BEGIN
  SELECT id, role INTO caller_id, caller_role FROM profiles WHERE phone = caller_phone;
  IF NOT multi_tech_is_management_role(caller_role) THEN
    RAISE EXCEPTION 'Not authorized. Management role required.';
  END IF;

  SELECT * INTO appt FROM appointments WHERE id = p_appointment_id;
  IF appt.id IS NULL THEN RAISE EXCEPTION 'Appointment not found.'; END IF;
  IF NOT multi_tech_visit_status_ok(appt.status) THEN
    RAISE EXCEPTION 'Cannot add technicians when visit status is %.', appt.status;
  END IF;
  IF p_technician_id = appt.technician_id THEN
    RAISE EXCEPTION 'Technician is already the primary technician.';
  END IF;
  IF NOT multi_tech_technician_available(p_technician_id, p_appointment_id) THEN
    RAISE EXCEPTION 'Technician is unavailable (busy or on break).';
  END IF;

  IF EXISTS (
    SELECT 1 FROM appointment_visit_technicians
    WHERE appointment_id = p_appointment_id
      AND technician_id = p_technician_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Technician is already on this visit.';
  END IF;

  SELECT COUNT(*)::int INTO v_co_tech_count
  FROM appointment_visit_technicians
  WHERE appointment_id = p_appointment_id
    AND participation_type = 'co_technician'
    AND is_active = true;

  IF v_co_tech_count >= 3 THEN
    RAISE EXCEPTION 'Maximum of 3 co-technicians per visit.';
  END IF;

  INSERT INTO appointment_visit_technicians (
    appointment_id, technician_id, participation_type, is_active
  ) VALUES (
    p_appointment_id, p_technician_id, 'co_technician', true
  );

  PERFORM create_notification(
    p_technician_id,
    'Added to visit',
    format('You were added as co-technician on a visit.'),
    'visit_co_technician_added',
    p_appointment_id
  );

  RETURN jsonb_build_object('success', true);
END;
$$;
