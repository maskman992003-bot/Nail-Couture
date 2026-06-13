-- Migration 062: Staff read access to latest nail assessment for a customer profile
-- Run once in Supabase SQL Editor after 061_assessment_security.sql.

CREATE OR REPLACE FUNCTION get_staff_nail_assessment_latest(
  caller_phone TEXT,
  p_profile_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  result JSONB;
BEGIN
  IF caller_phone IS NULL OR trim(caller_phone) = '' OR p_profile_id IS NULL THEN
    RAISE EXCEPTION 'caller_phone and p_profile_id are required';
  END IF;

  SELECT role INTO caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN (
    'super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician'
  ) THEN
    RAISE EXCEPTION 'Not authorized. Only staff can call this.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_profile_id) THEN
    RAISE EXCEPTION 'Customer profile not found.';
  END IF;

  SELECT to_jsonb(t)
  INTO result
  FROM (
    SELECT id, profile_id, inputs, metrics, health_status, created_at
    FROM nail_assessments
    WHERE profile_id = p_profile_id
    ORDER BY created_at DESC
    LIMIT 1
  ) t;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_staff_nail_assessment_latest(TEXT, UUID) TO anon, authenticated;
