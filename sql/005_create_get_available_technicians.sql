-- 005: Create get_available_technicians RPC
-- Used by CustomerBooking.jsx to show only technicians working at selected date/time
-- Returns technicians whose shift covers the given date and time

DROP FUNCTION IF EXISTS get_available_technicians(DATE, TEXT);

CREATE OR REPLACE FUNCTION get_available_technicians(
  p_date DATE,
  p_time TEXT
)
RETURNS TABLE (
  staff_id UUID,
  staff_name TEXT,
  shift_type TEXT,
  start_time TIME,
  end_time TIME
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (s.staff_id)
    s.staff_id,
    COALESCE(p.full_name, 'Unknown'),
    s.shift_type,
    s.start_time,
    s.end_time
  FROM shifts s
  LEFT JOIN profiles p ON p.id = s.staff_id
  WHERE s.shift_date = p_date
    AND p.role = 'technician'
    AND s.start_time <= p_time::TIME
    AND s.end_time >= p_time::TIME
  ORDER BY s.staff_id, s.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;