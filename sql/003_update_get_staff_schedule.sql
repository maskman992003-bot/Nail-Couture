-- Fix get_staff_schedule with SECURITY DEFINER + search_path bypass
DROP FUNCTION IF EXISTS get_staff_schedule(DATE, DATE, UUID);

CREATE OR REPLACE FUNCTION get_staff_schedule(
  p_start_date DATE,
  p_end_date DATE,
  p_staff_id UUID DEFAULT NULL
)
RETURNS TABLE (
  shift_id UUID, staff_id UUID, staff_name TEXT, shift_date DATE,
  shift_type TEXT, start_time TIME, end_time TIME,
  appointment_count INTEGER, confirmed_online_count INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.staff_id, COALESCE(p.full_name, 'Unknown'),
         s.shift_date, s.shift_type, s.start_time, s.end_time,
         s.appointment_count, COALESCE(s.confirmed_online_count, 0)
  FROM shifts s LEFT JOIN profiles p ON p.id = s.staff_id
  WHERE s.shift_date BETWEEN p_start_date AND p_end_date
    AND (p_staff_id IS NULL OR s.staff_id = p_staff_id)
  ORDER BY s.staff_id, s.shift_date, s.start_time;
END;
$$;