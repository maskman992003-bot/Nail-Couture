-- Migration 029: Technicians may update services on their own active assignments only

CREATE OR REPLACE FUNCTION update_appointment(
  caller_phone TEXT,
  appointment_id UUID,
  p_status TEXT DEFAULT NULL,
  p_service_id BIGINT DEFAULT NULL,
  p_add_ons TEXT DEFAULT NULL,
  p_final_price NUMERIC DEFAULT NULL,
  p_refreshment_pref TEXT DEFAULT NULL,
  p_technician_id UUID DEFAULT NULL,
  p_start_time TIMESTAMPTZ DEFAULT NULL,
  p_scheduled_at TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
  appt_technician_id UUID;
  appt_status TEXT;
  result JSONB;
BEGIN
  SELECT id, role INTO caller_id, caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician') THEN
    RAISE EXCEPTION 'Not authorized. Only staff can update appointments.';
  END IF;

  SELECT technician_id, status INTO appt_technician_id, appt_status
  FROM appointments WHERE id = appointment_id;

  IF appt_status IS NULL THEN
    RAISE EXCEPTION 'Appointment not found.';
  END IF;

  IF caller_role = 'technician' THEN
    IF appt_technician_id IS NULL OR appt_technician_id != caller_id THEN
      RAISE EXCEPTION 'You can only update your own appointments.';
    END IF;
    IF appt_status NOT IN ('serving', 'assigned_pending') THEN
      RAISE EXCEPTION 'Can only update services on active assignments.';
    END IF;
    IF p_technician_id IS NOT NULL AND p_technician_id IS DISTINCT FROM appt_technician_id THEN
      RAISE EXCEPTION 'Technicians cannot reassign appointments.';
    END IF;
    IF p_status IS NOT NULL AND p_status IS DISTINCT FROM appt_status THEN
      RAISE EXCEPTION 'Technicians cannot change appointment status here.';
    END IF;
  END IF;

  UPDATE appointments SET
    status = COALESCE(p_status, status),
    service_id = COALESCE(p_service_id, service_id),
    add_ons = COALESCE(p_add_ons, add_ons),
    final_price = COALESCE(p_final_price, final_price),
    refreshment_pref = COALESCE(p_refreshment_pref, refreshment_pref),
    technician_id = COALESCE(p_technician_id, technician_id),
    start_time = COALESCE(p_start_time, start_time),
    scheduled_at = COALESCE(p_scheduled_at, scheduled_at),
    notes = COALESCE(p_notes, notes)
  WHERE id = appointment_id;

  SELECT jsonb_build_object('success', true) INTO result;
  RETURN result;
END;
$$;
