-- 006: Create get_customer_appointments RPC
-- Used by CustomerHistory.jsx as an alternative query method
-- Returns all appointments for a customer profile

DROP FUNCTION IF EXISTS get_customer_appointments(UUID);

CREATE OR REPLACE FUNCTION get_customer_appointments(
  p_profile_id UUID
)
RETURNS TABLE (
  appointment_id UUID,
  service_name TEXT,
  technician_name TEXT,
  appointment_time TIMESTAMPTZ,
  status TEXT,
  source TEXT,
  final_price NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    COALESCE(sv.name, 'Service'),
    COALESCE(p.full_name, 'Unknown'),
    COALESCE(a.scheduled_time, a.check_in_time),
    a.status,
    COALESCE(a.source, 'walk_in'),
    COALESCE(a.final_price, a.price, 0)
  FROM appointments a
  LEFT JOIN services sv ON sv.id = a.service_id
  LEFT JOIN profiles p ON p.id = a.technician_id
  WHERE a.profile_id = p_profile_id
  ORDER BY COALESCE(a.scheduled_time, a.check_in_time) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;