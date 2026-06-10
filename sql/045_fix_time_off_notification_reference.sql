-- Migration 045: Fix time-off submit notifications deduped per staff member
-- create_time_off_request used employee profile id as reference_id, so multiple
-- requests from the same person within 5 minutes only notified once.
-- Run after 044_add_time_off_review_note.sql

DROP FUNCTION IF EXISTS create_time_off_request(uuid, date, date, text) CASCADE;
CREATE OR REPLACE FUNCTION create_time_off_request(
  p_staff_id uuid,
  p_start_date date,
  p_end_date date,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_name text;
  v_request_id uuid;
BEGIN
  INSERT INTO time_off_requests (employee_id, start_date, end_date, reason, status)
  VALUES (p_staff_id, p_start_date, p_end_date, p_reason, 'pending')
  RETURNING id INTO v_request_id;

  SELECT full_name INTO v_staff_name FROM profiles WHERE id = p_staff_id;

  PERFORM notify_roles(
    ARRAY['super_admin', 'owner', 'partner']::user_role[],
    'Time-off request',
    format('%s requested time off (%s to %s).', COALESCE(v_staff_name, 'Staff'), p_start_date, p_end_date),
    'time_off_request',
    v_request_id
  );
END;
$$;
