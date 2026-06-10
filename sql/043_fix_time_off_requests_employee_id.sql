-- Migration 043: Fix time-off RPCs after staff_id -> employee_id rename (010)
-- Run in Supabase SQL Editor after 035_notifications_system.sql

-- get_time_off_requests (1-arg overload — used when listing all requests)
DROP FUNCTION IF EXISTS get_time_off_requests(text) CASCADE;
CREATE OR REPLACE FUNCTION get_time_off_requests(p_status text DEFAULT NULL)
RETURNS TABLE(
  id uuid, staff_id uuid, start_date date, end_date date,
  reason text, status text, reviewed_by uuid, staff_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.employee_id,
    t.start_date,
    t.end_date,
    t.reason,
    t.status,
    t.reviewed_by,
    p.full_name
  FROM time_off_requests t
  JOIN profiles p ON p.id = t.employee_id
  WHERE (p_status IS NULL OR t.status = p_status)
  ORDER BY t.start_date;
END;
$$;

-- get_time_off_requests (2-arg overload — filter by staff)
DROP FUNCTION IF EXISTS get_time_off_requests(text, uuid) CASCADE;
CREATE OR REPLACE FUNCTION get_time_off_requests(
  p_status text DEFAULT NULL,
  p_staff_id uuid DEFAULT NULL
)
RETURNS TABLE(
  request_id uuid, staff_id uuid, staff_name text, start_date date, end_date date,
  reason text, status text, reviewed_by uuid, reviewer_name text,
  reviewed_at timestamptz, created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.employee_id,
    p.full_name,
    t.start_date,
    t.end_date,
    t.reason,
    t.status,
    t.reviewed_by,
    r.full_name,
    t.reviewed_at,
    t.created_at
  FROM time_off_requests t
  JOIN profiles p ON p.id = t.employee_id
  LEFT JOIN profiles r ON r.id = t.reviewed_by
  WHERE (p_status IS NULL OR t.status = p_status)
    AND (p_staff_id IS NULL OR t.employee_id = p_staff_id)
  ORDER BY t.start_date;
END;
$$;

-- create_time_off_request — notify management
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

-- review_time_off_request — notify requesting staff
DROP FUNCTION IF EXISTS review_time_off_request(uuid, text, uuid) CASCADE;
CREATE OR REPLACE FUNCTION review_time_off_request(
  p_request_id uuid,
  p_status text,
  p_reviewed_by uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid;
  v_start date;
  v_end date;
  v_decision text;
BEGIN
  SELECT employee_id, start_date, end_date INTO v_staff_id, v_start, v_end
  FROM time_off_requests WHERE id = p_request_id;

  UPDATE time_off_requests
  SET status = p_status, reviewed_by = p_reviewed_by
  WHERE id = p_request_id;

  IF v_staff_id IS NOT NULL THEN
    v_decision := CASE WHEN lower(p_status) IN ('approved', 'denied', 'rejected') THEN lower(p_status) ELSE p_status END;
    PERFORM create_notification(
      v_staff_id,
      format('Time off %s', v_decision),
      format('Your time-off request (%s to %s) was %s.', v_start, v_end, v_decision),
      'time_off_decision',
      p_request_id
    );
  END IF;
END;
$$;
