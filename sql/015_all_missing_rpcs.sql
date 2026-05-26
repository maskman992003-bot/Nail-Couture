-- ============================================================
-- Create all missing RPC functions referenced by the app
-- ============================================================

-- 1. Loyalty
DROP FUNCTION IF EXISTS award_loyalty_points(uuid, integer) CASCADE;
CREATE OR REPLACE FUNCTION award_loyalty_points(p_profile_id uuid, p_points integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET loyalty_points = COALESCE(loyalty_points, 0) + p_points WHERE id = p_profile_id;
END;
$$;

-- 2. Available technicians (CustomerBooking, EditBooking)
DROP FUNCTION IF EXISTS get_available_technicians(date, time) CASCADE;
CREATE OR REPLACE FUNCTION get_available_technicians(p_date date, p_time time)
RETURNS TABLE(id uuid, full_name text) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.full_name
  FROM profiles p
  WHERE p.role IN ('technician', 'admin')
  AND p.id NOT IN (
    SELECT s.employee_id FROM shifts s
    WHERE s.shift_date = p_date
    AND (s.start_time, s.end_time) OVERLAPS (p_time, p_time + interval '30 minutes')
  );
END;
$$;

-- 3. Staff schedule (accepts p_employee_id OR p_staff_id for backward compat)
DROP FUNCTION IF EXISTS get_staff_schedule(date, date, uuid, uuid) CASCADE;
CREATE OR REPLACE FUNCTION get_staff_schedule(
  p_start_date date,
  p_end_date date,
  p_employee_id uuid DEFAULT NULL,
  p_staff_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid, employee_id uuid, shift_date date, shift_type text,
  start_time time, end_time time, full_name text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_employee_id uuid;
BEGIN
  v_employee_id := COALESCE(p_employee_id, p_staff_id);
  RETURN QUERY
  SELECT s.id, s.employee_id, s.shift_date, s.shift_type, s.start_time, s.end_time, p.full_name
  FROM shifts s
  JOIN profiles p ON p.id = s.employee_id
  WHERE s.shift_date >= p_start_date AND s.shift_date <= p_end_date
  AND (v_employee_id IS NULL OR s.employee_id = v_employee_id)
  ORDER BY s.shift_date, s.start_time;
END;
$$;

-- 4. Get time-off requests
DROP FUNCTION IF EXISTS get_time_off_requests(text) CASCADE;
CREATE OR REPLACE FUNCTION get_time_off_requests(p_status text DEFAULT NULL)
RETURNS TABLE(
  id uuid, staff_id uuid, start_date date, end_date date,
  reason text, status text, reviewed_by uuid, staff_name text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.staff_id, t.start_date, t.end_date, t.reason, t.status, t.reviewed_by, p.full_name
  FROM time_off_requests t
  JOIN profiles p ON p.id = t.staff_id
  WHERE (p_status IS NULL OR t.status = p_status)
  ORDER BY t.start_date;
END;
$$;

-- 5. Create shift
DROP FUNCTION IF EXISTS create_shift(uuid, date, text, time, time) CASCADE;
CREATE OR REPLACE FUNCTION create_shift(
  p_employee_id uuid,
  p_shift_date date,
  p_shift_type text,
  p_start_time time,
  p_end_time time
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO shifts (employee_id, shift_date, shift_type, start_time, end_time)
  VALUES (p_employee_id, p_shift_date, p_shift_type, p_start_time, p_end_time);
END;
$$;

-- 6. Delete shift
DROP FUNCTION IF EXISTS delete_shift(uuid) CASCADE;
CREATE OR REPLACE FUNCTION delete_shift(p_shift_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM shifts WHERE id = p_shift_id;
END;
$$;

-- 7. Review time-off request
DROP FUNCTION IF EXISTS review_time_off_request(uuid, text, uuid) CASCADE;
CREATE OR REPLACE FUNCTION review_time_off_request(
  p_request_id uuid,
  p_status text,
  p_reviewed_by uuid
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE time_off_requests
  SET status = p_status, reviewed_by = p_reviewed_by
  WHERE id = p_request_id;
END;
$$;

-- 8. Get technician appointments (accepts p_employee_id OR p_staff_id)
DROP FUNCTION IF EXISTS get_technician_appointments(uuid, uuid, date, date) CASCADE;
CREATE OR REPLACE FUNCTION get_technician_appointments(
  p_employee_id uuid DEFAULT NULL,
  p_staff_id uuid DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE(
  id uuid, customer_name text, customer_phone text,
  service_name text, appointment_time timestamptz, status text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_staff_id uuid;
BEGIN
  v_staff_id := COALESCE(p_employee_id, p_staff_id);
  RETURN QUERY
  SELECT
    a.id,
    p.full_name,
    p.phone,
    sv.name,
    a.scheduled_at,
    a.status
  FROM appointments a
  JOIN profiles p ON p.id = a.customer_id
  JOIN services sv ON sv.id = a.service_id
  WHERE a.technician_id = v_staff_id
  AND (p_start_date IS NULL OR a.scheduled_at::date >= p_start_date)
  AND (p_end_date IS NULL OR a.scheduled_at::date <= p_end_date)
  ORDER BY a.scheduled_at;
END;
$$;

-- 9. Create time-off request
DROP FUNCTION IF EXISTS create_time_off_request(uuid, date, date, text) CASCADE;
CREATE OR REPLACE FUNCTION create_time_off_request(
  p_staff_id uuid,
  p_start_date date,
  p_end_date date,
  p_reason text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO time_off_requests (staff_id, start_date, end_date, reason, status)
  VALUES (p_staff_id, p_start_date, p_end_date, p_reason, 'pending');
END;
$$;
