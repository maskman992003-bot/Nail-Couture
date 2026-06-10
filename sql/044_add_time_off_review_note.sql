-- Migration 044: Optional manager note when reviewing time-off (especially rejection)
-- Run in Supabase SQL Editor after 043_fix_time_off_requests_employee_id.sql

ALTER TABLE time_off_requests
  ADD COLUMN IF NOT EXISTS review_note text;

-- get_time_off_requests (2-arg overload — used by the app)
DROP FUNCTION IF EXISTS get_time_off_requests(text, uuid) CASCADE;
CREATE OR REPLACE FUNCTION get_time_off_requests(
  p_status text DEFAULT NULL,
  p_staff_id uuid DEFAULT NULL
)
RETURNS TABLE(
  request_id uuid, staff_id uuid, staff_name text, start_date date, end_date date,
  reason text, status text, reviewed_by uuid, reviewer_name text,
  reviewed_at timestamptz, review_note text, created_at timestamptz
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
    t.review_note,
    t.created_at
  FROM time_off_requests t
  JOIN profiles p ON p.id = t.employee_id
  LEFT JOIN profiles r ON r.id = t.reviewed_by
  WHERE (p_status IS NULL OR t.status = p_status)
    AND (p_staff_id IS NULL OR t.employee_id = p_staff_id)
  ORDER BY t.start_date;
END;
$$;

-- review_time_off_request — notify requesting staff (optional note)
DROP FUNCTION IF EXISTS review_time_off_request(uuid, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS review_time_off_request(uuid, text, uuid, text) CASCADE;
CREATE OR REPLACE FUNCTION review_time_off_request(
  p_request_id uuid,
  p_status text,
  p_reviewed_by uuid,
  p_review_note text DEFAULT NULL
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
  v_note text;
  v_message text;
BEGIN
  SELECT employee_id, start_date, end_date INTO v_staff_id, v_start, v_end
  FROM time_off_requests WHERE id = p_request_id;

  v_note := NULLIF(trim(p_review_note), '');

  UPDATE time_off_requests
  SET
    status = p_status,
    reviewed_by = p_reviewed_by,
    reviewed_at = now(),
    review_note = v_note
  WHERE id = p_request_id;

  IF v_staff_id IS NOT NULL THEN
    v_decision := CASE WHEN lower(p_status) IN ('approved', 'denied', 'rejected') THEN lower(p_status) ELSE p_status END;
    v_message := format('Your time-off request (%s to %s) was %s.', v_start, v_end, v_decision);
    IF v_note IS NOT NULL THEN
      v_message := v_message || ' Note: ' || v_note;
    END IF;
    PERFORM create_notification(
      v_staff_id,
      format('Time off %s', v_decision),
      v_message,
      'time_off_decision',
      p_request_id
    );
  END IF;
END;
$$;
