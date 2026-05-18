-- 004: Create get_technician_appointments RPC
-- Used by StaffSchedule.jsx (detail modal) and TechnicianSchedule.jsx
-- Returns all appointments for a technician within a date range

DROP FUNCTION IF EXISTS get_technician_appointments(UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION get_technician_appointments(
  p_staff_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  appointment_id UUID,
  customer_name TEXT,
  service_name TEXT,
  appointment_time TIMESTAMPTZ,
  status TEXT,
  source TEXT,
  final_price NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    COALESCE(pr.full_name, 'Guest'),
    COALESCE(sv.name, 'Service'),
    COALESCE(a.scheduled_time, a.check_in_time),
    a.status,
    COALESCE(a.source, 'walk_in'),
    COALESCE(a.final_price, a.price, 0)
  FROM appointments a
  LEFT JOIN profiles pr ON pr.id = a.profile_id
  LEFT JOIN services sv ON sv.id = a.service_id
  WHERE a.technician_id = p_staff_id
    AND COALESCE(a.scheduled_time::date, a.check_in_time::date) BETWEEN p_start_date AND p_end_date
  ORDER BY COALESCE(a.scheduled_time, a.check_in_time);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;