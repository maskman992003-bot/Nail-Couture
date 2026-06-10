-- Migration 056: Return daily send quota in send_salon_announcement response
-- Run after 055_announcement_txt_attachments.sql

CREATE OR REPLACE FUNCTION send_salon_announcement(
  p_caller_phone text,
  p_title text,
  p_body text,
  p_audience text,
  p_staff_target_mode text DEFAULT 'all',
  p_staff_profile_ids uuid[] DEFAULT '{}',
  p_attachments jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_caller_role text;
  v_announcement_id uuid;
  v_counts jsonb;
  v_recent_count int;
  v_title text;
  v_body text;
  v_attachments jsonb;
  v_attachment_count int;
BEGIN
  SELECT p.id, p.role INTO v_caller_id, v_caller_role
  FROM profiles p
  WHERE p.phone = p_caller_phone;

  IF NOT announcement_is_management_role(v_caller_role) THEN
    RAISE EXCEPTION 'Not authorized to send salon announcements.';
  END IF;

  v_title := NULLIF(btrim(p_title), '');
  v_body := NULLIF(btrim(p_body), '');
  v_attachments := COALESCE(p_attachments, '[]'::jsonb);

  PERFORM announcement_validate_attachments(v_attachments);
  v_attachment_count := jsonb_array_length(v_attachments);

  IF v_title IS NULL THEN
    RAISE EXCEPTION 'Title is required.';
  END IF;
  IF char_length(v_title) > 120 THEN
    RAISE EXCEPTION 'Title must be 120 characters or fewer.';
  END IF;

  IF v_body IS NULL AND v_attachment_count = 0 THEN
    RAISE EXCEPTION 'Message or at least one attachment is required.';
  END IF;
  IF v_body IS NOT NULL AND char_length(v_body) > 500 THEN
    RAISE EXCEPTION 'Message must be 500 characters or fewer.';
  END IF;

  IF p_audience NOT IN ('customers', 'staff', 'both') THEN
    RAISE EXCEPTION 'Invalid audience.';
  END IF;

  IF p_staff_target_mode NOT IN ('all', 'only', 'exclude') THEN
    RAISE EXCEPTION 'Invalid staff targeting mode.';
  END IF;

  PERFORM announcement_validate_staff_targeting(p_audience, p_staff_target_mode, p_staff_profile_ids);

  v_counts := announcement_count_recipients(p_audience, p_staff_target_mode, p_staff_profile_ids);
  IF (v_counts->>'total')::int = 0 THEN
    RAISE EXCEPTION 'No recipients match this announcement.';
  END IF;

  SELECT COUNT(*)::int INTO v_recent_count
  FROM announcements a
  WHERE a.created_at > NOW() - INTERVAL '24 hours';

  IF v_recent_count >= announcement_daily_send_limit() THEN
    RAISE EXCEPTION 'Salon announcement limit reached (% per 24 hours). Try again later.',
      announcement_daily_send_limit();
  END IF;

  INSERT INTO announcements (
    created_by, title, body, audience,
    staff_target_mode, staff_profile_ids,
    attachments, status, fanout_offset, recipient_count
  ) VALUES (
    v_caller_id, v_title, COALESCE(v_body, ''), p_audience,
    COALESCE(p_staff_target_mode, 'all'),
    COALESCE(p_staff_profile_ids, ARRAY[]::uuid[]),
    v_attachments, 'pending', 0, 0
  )
  RETURNING id INTO v_announcement_id;

  INSERT INTO announcement_fanout_queue (announcement_id, status)
  VALUES (v_announcement_id, 'pending');

  v_recent_count := v_recent_count + 1;

  RETURN jsonb_build_object(
    'id', v_announcement_id,
    'status', 'pending',
    'estimated_recipients', (v_counts->>'total')::int,
    'customer_count', (v_counts->>'customer_count')::int,
    'staff_count', (v_counts->>'staff_count')::int,
    'attachment_count', v_attachment_count,
    'sent_today', v_recent_count,
    'remaining_today', GREATEST(announcement_daily_send_limit() - v_recent_count, 0),
    'daily_limit', announcement_daily_send_limit()
  );
END;
$$;
