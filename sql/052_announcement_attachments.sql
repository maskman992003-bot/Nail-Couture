-- Migration 052: Announcement file/image attachments
-- Run after 051_announcement_inbox.sql

ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN announcements.attachments IS
  'Array of {url, file_name, mime_type, size_bytes, kind} objects.';

-- ---------------------------------------------------------------------------
-- Storage bucket
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'announcement-attachments',
  'announcement-attachments',
  true,
  10485760,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Allow anon announcement attachment uploads" ON storage.objects;
CREATE POLICY "Allow anon announcement attachment uploads"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'announcement-attachments');

DROP POLICY IF EXISTS "Allow anon announcement attachment updates" ON storage.objects;
CREATE POLICY "Allow anon announcement attachment updates"
  ON storage.objects FOR UPDATE TO anon
  USING (bucket_id = 'announcement-attachments');

DROP POLICY IF EXISTS "Allow public announcement attachment read" ON storage.objects;
CREATE POLICY "Allow public announcement attachment read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'announcement-attachments');

-- ---------------------------------------------------------------------------
-- Validation helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION announcement_validate_attachments(p_attachments jsonb)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_count int;
  v_item jsonb;
  v_mime text;
  v_size int;
  v_allowed text[] := ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'text/plain'
  ];
BEGIN
  IF p_attachments IS NULL OR p_attachments = '[]'::jsonb THEN
    RETURN;
  END IF;

  IF jsonb_typeof(p_attachments) <> 'array' THEN
    RAISE EXCEPTION 'Attachments must be a JSON array.';
  END IF;

  v_count := jsonb_array_length(p_attachments);
  IF v_count > 5 THEN
    RAISE EXCEPTION 'A maximum of 5 attachments is allowed.';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_attachments)
  LOOP
    IF NULLIF(btrim(v_item->>'url'), '') IS NULL THEN
      RAISE EXCEPTION 'Each attachment must include a url.';
    END IF;
    IF NULLIF(btrim(v_item->>'file_name'), '') IS NULL THEN
      RAISE EXCEPTION 'Each attachment must include a file_name.';
    END IF;

    v_mime := v_item->>'mime_type';
    IF v_mime IS NULL OR NOT (v_mime = ANY(v_allowed)) THEN
      RAISE EXCEPTION 'Unsupported attachment type: %', COALESCE(v_mime, 'unknown');
    END IF;

    v_size := COALESCE((v_item->>'size_bytes')::int, 0);
    IF v_size < 1 OR v_size > 10485760 THEN
      RAISE EXCEPTION 'Attachment size must be between 1 byte and 10 MB.';
    END IF;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- send_salon_announcement (add attachments param)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION announcement_daily_send_limit()
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 20;
$$;

COMMENT ON FUNCTION announcement_daily_send_limit IS
  'Max salon announcements allowed per rolling 24-hour window.';

DROP FUNCTION IF EXISTS send_salon_announcement(text, text, text, text, text, uuid[]);
DROP FUNCTION IF EXISTS send_salon_announcement(text, text, text, text, text, uuid[], jsonb);

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

-- ---------------------------------------------------------------------------
-- Fan-out: include attachment hint in notification body when empty
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION process_announcement_fanout_batch(
  p_announcement_id uuid,
  p_batch_size integer DEFAULT 500
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row announcements%ROWTYPE;
  v_recipient_id uuid;
  v_notification_id uuid;
  v_processed int := 0;
  v_total int;
  v_done boolean := false;
  v_notif_body text;
  v_metadata jsonb;
BEGIN
  IF p_batch_size IS NULL OR p_batch_size < 1 THEN
    p_batch_size := 500;
  END IF;

  SELECT * INTO v_row
  FROM announcements
  WHERE id = p_announcement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Announcement not found.';
  END IF;

  IF v_row.status = 'completed' THEN
    RETURN jsonb_build_object(
      'done', true,
      'processed', 0,
      'total', v_row.recipient_count,
      'status', v_row.status
    );
  END IF;

  IF v_row.status = 'failed' THEN
    RETURN jsonb_build_object(
      'done', true,
      'processed', 0,
      'total', v_row.recipient_count,
      'status', v_row.status,
      'error', v_row.error_message
    );
  END IF;

  IF v_row.status = 'pending' THEN
    UPDATE announcements
    SET status = 'processing'
    WHERE id = p_announcement_id;
    v_row.status := 'processing';
  END IF;

  v_notif_body := NULLIF(btrim(v_row.body), '');
  IF v_notif_body IS NULL THEN
    IF jsonb_array_length(COALESCE(v_row.attachments, '[]'::jsonb)) > 0 THEN
      v_notif_body := 'Tap to view attachment.';
    ELSE
      v_notif_body := v_row.title;
    END IF;
  END IF;

  v_metadata := jsonb_build_object(
    'announcement_id', v_row.id,
    'attachment_count', jsonb_array_length(COALESCE(v_row.attachments, '[]'::jsonb))
  );

  SELECT COUNT(*)::int INTO v_total
  FROM (
    SELECT DISTINCT r.id
    FROM get_announcement_recipient_ids(
      v_row.audience,
      v_row.staff_target_mode,
      v_row.staff_profile_ids
    ) r(id)
  ) recipients;

  FOR v_recipient_id IN
    SELECT DISTINCT r.id
    FROM get_announcement_recipient_ids(
      v_row.audience,
      v_row.staff_target_mode,
      v_row.staff_profile_ids
    ) r(id)
    ORDER BY r.id
    OFFSET v_row.fanout_offset
    LIMIT p_batch_size
  LOOP
    v_notification_id := create_notification(
      v_recipient_id,
      v_row.title,
      v_notif_body,
      'salon_announcement',
      v_row.id,
      v_metadata
    );

    INSERT INTO announcement_recipients (
      announcement_id, profile_id, notification_id
    ) VALUES (
      p_announcement_id, v_recipient_id, v_notification_id
    )
    ON CONFLICT (announcement_id, profile_id) DO UPDATE
    SET notification_id = COALESCE(announcement_recipients.notification_id, EXCLUDED.notification_id);

    v_processed := v_processed + 1;
  END LOOP;

  UPDATE announcements
  SET
    fanout_offset = announcements.fanout_offset + v_processed,
    recipient_count = announcements.fanout_offset + v_processed
  WHERE id = p_announcement_id
  RETURNING fanout_offset, recipient_count INTO v_row.fanout_offset, v_row.recipient_count;

  v_done := v_row.fanout_offset >= v_total;

  IF v_done THEN
    UPDATE announcements
    SET status = 'completed', completed_at = NOW()
    WHERE id = p_announcement_id;

    UPDATE announcement_fanout_queue
    SET status = 'completed', processed_at = NOW()
    WHERE announcement_id = p_announcement_id
      AND status IN ('pending', 'processing');
  END IF;

  RETURN jsonb_build_object(
    'done', v_done,
    'processed', v_processed,
    'total', v_total,
    'status', CASE WHEN v_done THEN 'completed' ELSE 'processing' END
  );
EXCEPTION
  WHEN OTHERS THEN
    UPDATE announcements
    SET status = 'failed', error_message = SQLERRM
    WHERE id = p_announcement_id;

    UPDATE announcement_fanout_queue
    SET status = 'failed', processed_at = NOW(), last_error = SQLERRM
    WHERE announcement_id = p_announcement_id;

    RAISE;
END;
$$;

-- ---------------------------------------------------------------------------
-- list_salon_announcements (management history)
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS list_salon_announcements(text, integer, integer);

CREATE OR REPLACE FUNCTION list_salon_announcements(
  p_caller_phone text,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  title text,
  body text,
  audience text,
  staff_target_mode text,
  staff_profile_count int,
  recipient_count int,
  status text,
  error_message text,
  created_at timestamptz,
  completed_at timestamptz,
  created_by_name text,
  attachments jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT p.role INTO v_role FROM profiles p WHERE p.phone = p_caller_phone;
  IF NOT announcement_is_management_role(v_role) THEN
    RAISE EXCEPTION 'Not authorized to view salon announcements.';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 THEN
    p_limit := 20;
  END IF;
  IF p_offset IS NULL OR p_offset < 0 THEN
    p_offset := 0;
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.body,
    a.audience,
    a.staff_target_mode,
    COALESCE(cardinality(a.staff_profile_ids), 0)::int AS staff_profile_count,
    a.recipient_count,
    a.status,
    a.error_message,
    a.created_at,
    a.completed_at,
    COALESCE(sender.full_name, 'Unknown') AS created_by_name,
    COALESCE(a.attachments, '[]'::jsonb) AS attachments
  FROM announcements a
  JOIN profiles sender ON sender.id = a.created_by
  ORDER BY a.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ---------------------------------------------------------------------------
-- list_my_announcements (recipient inbox)
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS list_my_announcements(text, text, integer, integer);

CREATE OR REPLACE FUNCTION list_my_announcements(
  p_caller_phone text,
  p_filter text DEFAULT 'all',
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  inbox_id uuid,
  announcement_id uuid,
  title text,
  body text,
  created_at timestamptz,
  created_by_name text,
  is_saved boolean,
  is_archived boolean,
  is_read boolean,
  notification_id uuid,
  received_at timestamptz,
  attachments jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  SELECT p.id INTO v_profile_id FROM profiles p WHERE p.phone = p_caller_phone;
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found.';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 THEN
    p_limit := 20;
  END IF;
  IF p_offset IS NULL OR p_offset < 0 THEN
    p_offset := 0;
  END IF;

  RETURN QUERY
  SELECT
    ar.id AS inbox_id,
    a.id AS announcement_id,
    a.title,
    a.body,
    a.created_at,
    COALESCE(sender.full_name, 'Salon') AS created_by_name,
    ar.is_saved,
    ar.is_archived,
    COALESCE(n.is_read, true) AS is_read,
    ar.notification_id,
    ar.received_at,
    COALESCE(a.attachments, '[]'::jsonb) AS attachments
  FROM announcement_recipients ar
  JOIN announcements a ON a.id = ar.announcement_id
  JOIN profiles sender ON sender.id = a.created_by
  LEFT JOIN notifications n ON n.id = ar.notification_id
  WHERE ar.profile_id = v_profile_id
    AND (
      (COALESCE(p_filter, 'all') = 'all' AND ar.is_archived = false)
      OR (p_filter = 'saved' AND ar.is_saved = true AND ar.is_archived = false)
      OR (p_filter = 'archived' AND ar.is_archived = true)
    )
  ORDER BY ar.received_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
