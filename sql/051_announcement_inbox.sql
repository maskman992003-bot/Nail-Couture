-- Migration 051: Per-user announcement inbox (save & organize received announcements)
-- Run after 050_fix_announcement_fanout_delivery.sql

CREATE TABLE IF NOT EXISTS announcement_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_id uuid NULL REFERENCES notifications(id) ON DELETE SET NULL,
  is_saved boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_announcement_recipients_profile_received
  ON announcement_recipients (profile_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcement_recipients_profile_saved
  ON announcement_recipients (profile_id, is_saved)
  WHERE is_saved = true AND is_archived = false;

COMMENT ON TABLE announcement_recipients IS
  'Tracks announcements delivered to each user, with save/archive organization.';

ALTER TABLE announcement_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own announcement inbox" ON announcement_recipients;
CREATE POLICY "Users read own announcement inbox"
  ON announcement_recipients FOR SELECT TO authenticated
  USING (
    profile_id IN (
      SELECT p.id FROM profiles p
      WHERE p.phone = current_setting('request.jwt.claims', true)::json->>'phone'
    )
  );

DROP POLICY IF EXISTS "Users update own announcement inbox" ON announcement_recipients;
CREATE POLICY "Users update own announcement inbox"
  ON announcement_recipients FOR UPDATE TO authenticated
  USING (
    profile_id IN (
      SELECT p.id FROM profiles p
      WHERE p.phone = current_setting('request.jwt.claims', true)::json->>'phone'
    )
  )
  WITH CHECK (
    profile_id IN (
      SELECT p.id FROM profiles p
      WHERE p.phone = current_setting('request.jwt.claims', true)::json->>'phone'
    )
  );

-- Record inbox row during fan-out (alongside notification)
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
      v_row.body,
      'salon_announcement',
      v_row.id,
      jsonb_build_object('announcement_id', v_row.id)
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
  received_at timestamptz
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
    ar.received_at
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

CREATE OR REPLACE FUNCTION set_announcement_saved(
  p_caller_phone text,
  p_announcement_id uuid,
  p_saved boolean DEFAULT true
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_updated int;
BEGIN
  SELECT p.id INTO v_profile_id FROM profiles p WHERE p.phone = p_caller_phone;
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found.';
  END IF;

  UPDATE announcement_recipients
  SET is_saved = COALESCE(p_saved, true)
  WHERE profile_id = v_profile_id
    AND announcement_id = p_announcement_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Announcement not found in your inbox.';
  END IF;

  RETURN COALESCE(p_saved, true);
END;
$$;

CREATE OR REPLACE FUNCTION set_announcement_archived(
  p_caller_phone text,
  p_announcement_id uuid,
  p_archived boolean DEFAULT true
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_updated int;
BEGIN
  SELECT p.id INTO v_profile_id FROM profiles p WHERE p.phone = p_caller_phone;
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found.';
  END IF;

  UPDATE announcement_recipients
  SET
    is_archived = COALESCE(p_archived, true),
    is_saved = CASE WHEN COALESCE(p_archived, true) THEN false ELSE is_saved END
  WHERE profile_id = v_profile_id
    AND announcement_id = p_announcement_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Announcement not found in your inbox.';
  END IF;

  RETURN COALESCE(p_archived, true);
END;
$$;

COMMENT ON FUNCTION list_my_announcements IS
  'List announcements received by the caller. Filter: all (default), saved, archived.';

COMMENT ON FUNCTION set_announcement_saved IS
  'Save or unsave an announcement in the caller inbox.';

COMMENT ON FUNCTION set_announcement_archived IS
  'Archive or restore an announcement in the caller inbox.';

-- Backfill inbox rows from existing salon_announcement notifications
INSERT INTO announcement_recipients (announcement_id, profile_id, notification_id, received_at)
SELECT
  n.reference_id,
  n.recipient_id,
  n.id,
  n.created_at
FROM notifications n
WHERE n.type = 'salon_announcement'
  AND n.reference_id IS NOT NULL
ON CONFLICT (announcement_id, profile_id) DO UPDATE
SET notification_id = COALESCE(announcement_recipients.notification_id, EXCLUDED.notification_id);
