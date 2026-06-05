-- Migration 026: Technician workstation enhancements
-- - completed_at on appointments
-- - decline_assignment RPC
-- - create_followup_appointment RPC
-- - start_appointment ownership check for technicians
-- - complete_appointment sets completed_at + technician ownership

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ============================================================
-- Staff: Start serving (technicians limited to own assignments)
-- ============================================================
CREATE OR REPLACE FUNCTION start_appointment(
  caller_phone TEXT,
  appointment_id UUID
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
    RAISE EXCEPTION 'Not authorized. Only staff can start appointments.';
  END IF;

  SELECT technician_id, status INTO appt_technician_id, appt_status
  FROM appointments WHERE id = appointment_id;

  IF appt_status IS NULL THEN
    RAISE EXCEPTION 'Appointment not found.';
  END IF;

  IF caller_role = 'technician' THEN
    IF appt_technician_id IS NULL OR appt_technician_id != caller_id THEN
      RAISE EXCEPTION 'You can only start your own assignments.';
    END IF;
    IF appt_status != 'assigned_pending' THEN
      RAISE EXCEPTION 'Assignment is not pending acceptance.';
    END IF;
  END IF;

  UPDATE appointments SET status = 'serving', start_time = NOW() WHERE id = appointment_id;

  SELECT jsonb_build_object('success', true) INTO result;
  RETURN result;
END;
$$;

-- ============================================================
-- Staff: Complete appointment (sets completed_at)
-- ============================================================
CREATE OR REPLACE FUNCTION complete_appointment(
  caller_phone TEXT,
  appointment_id UUID,
  p_final_price NUMERIC DEFAULT NULL
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
  result JSONB;
BEGIN
  SELECT id, role INTO caller_id, caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician') THEN
    RAISE EXCEPTION 'Not authorized. Only staff can complete appointments.';
  END IF;

  IF caller_role = 'technician' THEN
    SELECT technician_id INTO appt_technician_id FROM appointments WHERE id = appointment_id;
    IF appt_technician_id IS NULL OR appt_technician_id != caller_id THEN
      RAISE EXCEPTION 'You can only complete your own appointments.';
    END IF;
  END IF;

  UPDATE appointments SET
    status = 'completed',
    start_time = COALESCE(start_time, NOW()),
    completed_at = NOW(),
    final_price = COALESCE(p_final_price, final_price)
  WHERE id = appointment_id;

  SELECT jsonb_build_object('success', true) INTO result;
  RETURN result;
END;
$$;

-- ============================================================
-- Technician: Decline / return assignment to waiting queue
-- ============================================================
CREATE OR REPLACE FUNCTION decline_assignment(
  caller_phone TEXT,
  appointment_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
  appt RECORD;
  result JSONB;
BEGIN
  SELECT id, role INTO caller_id, caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician') THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  SELECT * INTO appt FROM appointments WHERE id = appointment_id;
  IF appt.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found.';
  END IF;

  IF appt.status != 'assigned_pending' THEN
    RAISE EXCEPTION 'Only pending assignments can be declined.';
  END IF;

  IF caller_role = 'technician' AND appt.technician_id != caller_id THEN
    RAISE EXCEPTION 'You can only decline your own assignments.';
  END IF;

  UPDATE appointments SET
    status = 'waiting',
    technician_id = NULL,
    notes = CASE
      WHEN p_reason IS NOT NULL AND p_reason != '' THEN
        COALESCE(notes || E'\n', '') || 'Declined: ' || p_reason
      ELSE notes
    END
  WHERE id = appointment_id;

  SELECT jsonb_build_object('success', true) INTO result;
  RETURN result;
END;
$$;

-- ============================================================
-- Staff: Book follow-up appointment for a customer
-- ============================================================
CREATE OR REPLACE FUNCTION create_followup_appointment(
  caller_phone TEXT,
  p_customer_id UUID,
  p_service_id BIGINT DEFAULT NULL,
  p_technician_id UUID DEFAULT NULL,
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
  svc_price NUMERIC;
  new_id UUID;
  result JSONB;
BEGIN
  SELECT id, role INTO caller_id, caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician') THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'Customer is required.';
  END IF;

  IF p_scheduled_at IS NULL THEN
    RAISE EXCEPTION 'Scheduled date/time is required.';
  END IF;

  svc_price := NULL;
  IF p_service_id IS NOT NULL THEN
    SELECT price INTO svc_price FROM services WHERE id = p_service_id;
  END IF;

  INSERT INTO appointments (
    customer_id,
    service_id,
    technician_id,
    scheduled_at,
    status,
    booking_type,
    final_price,
    notes
  ) VALUES (
    p_customer_id,
    p_service_id,
    COALESCE(p_technician_id, CASE WHEN caller_role = 'technician' THEN caller_id ELSE NULL END),
    p_scheduled_at,
    'confirmed',
    'online',
    svc_price,
    p_notes
  )
  RETURNING id INTO new_id;

  SELECT jsonb_build_object('success', true, 'appointment_id', new_id) INTO result;
  RETURN result;
END;
$$;
