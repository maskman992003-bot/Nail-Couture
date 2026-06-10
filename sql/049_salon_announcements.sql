-- Migration 049: Salon announcements (management broadcast) with async fan-out
-- Run after 048_fix_handoff_remove_primary.sql

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES profiles(id),
  title text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL CHECK (audience IN ('customers', 'staff', 'both')),
  staff_target_mode text NOT NULL DEFAULT 'all'
    CHECK (staff_target_mode IN ('all', 'only', 'exclude')),
  staff_profile_ids uuid[] NOT NULL DEFAULT '{}',
  recipient_count int NOT NULL DEFAULT 0,
  fanout_offset int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL
);

COMMENT ON TABLE announcements IS
  'Salon-wide announcements composed by management; fan-out runs asynchronously.';

CREATE TABLE IF NOT EXISTS announcement_fanout_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz NULL,
  last_error text NULL
);

CREATE INDEX IF NOT EXISTS idx_announcements_created_at
  ON announcements (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcement_fanout_queue_pending
  ON announcement_fanout_queue (created_at)
  WHERE status = 'pending';

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_fanout_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Management read announcements" ON announcements;
CREATE POLICY "Management read announcements"
  ON announcements FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.phone = current_setting('request.jwt.claims', true)::json->>'phone'
        AND p.role IN ('super_admin', 'owner', 'partner')
    )
  );

DROP POLICY IF EXISTS "Service read fanout queue" ON announcement_fanout_queue;
CREATE POLICY "Service read fanout queue"
  ON announcement_fanout_queue FOR SELECT TO anon USING (true);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION announcement_staff_roles()
RETURNS user_role[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY[
    'owner', 'partner', 'admin', 'cashier', 'technician'
  ]::user_role[];
$$;

CREATE OR REPLACE FUNCTION announcement_is_management_role(p_role text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_role IN ('super_admin', 'owner', 'partner');
$$;

-- Eligible staff pool. Extend with deactivated_at / auth ban when available.
CREATE OR REPLACE FUNCTION announcement_staff_pool_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM profiles p
  WHERE p.role = ANY(announcement_staff_roles())
  ORDER BY p.id;
$$;

CREATE OR REPLACE FUNCTION announcement_resolve_staff_ids(
  p_staff_target_mode text,
  p_staff_profile_ids uuid[]
)
RETURNS SETOF uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode text;
  v_ids uuid[];
BEGIN
  v_mode := COALESCE(p_staff_target_mode, 'all');
  v_ids := COALESCE(p_staff_profile_ids, ARRAY[]::uuid[]);

  IF v_mode = 'all' THEN
    RETURN QUERY SELECT * FROM announcement_staff_pool_ids();
    RETURN;
  END IF;

  IF v_mode = 'only' THEN
    RETURN QUERY
    SELECT p.id
    FROM profiles p
    WHERE p.id = ANY(v_ids)
      AND p.role = ANY(announcement_staff_roles())
    ORDER BY p.id;
    RETURN;
  END IF;

  -- exclude
  RETURN QUERY
  SELECT p.id
  FROM profiles p
  WHERE p.role = ANY(announcement_staff_roles())
    AND (cardinality(v_ids) = 0 OR NOT (p.id = ANY(v_ids)))
  ORDER BY p.id;
END;
$$;

CREATE OR REPLACE FUNCTION get_announcement_recipient_ids(
  p_audience text,
  p_staff_target_mode text DEFAULT 'all',
  p_staff_profile_ids uuid[] DEFAULT '{}'
)
RETURNS SETOF uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_audience NOT IN ('customers', 'staff', 'both') THEN
    RETURN;
  END IF;

  IF p_audience IN ('customers', 'both') THEN
    RETURN QUERY
    SELECT p.id
    FROM profiles p
    WHERE p.role = 'customer'
    ORDER BY p.id;
  END IF;

  IF p_audience IN ('staff', 'both') THEN
    RETURN QUERY
    SELECT * FROM announcement_resolve_staff_ids(p_staff_target_mode, p_staff_profile_ids);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION announcement_count_recipients(
  p_audience text,
  p_staff_target_mode text DEFAULT 'all',
  p_staff_profile_ids uuid[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_count int := 0;
  v_staff_count int := 0;
  v_total int := 0;
BEGIN
  IF p_audience IN ('customers', 'both') THEN
    SELECT COUNT(*)::int INTO v_customer_count
    FROM profiles p
    WHERE p.role = 'customer';
  END IF;

  IF p_audience IN ('staff', 'both') THEN
    SELECT COUNT(*)::int INTO v_staff_count
    FROM announcement_resolve_staff_ids(p_staff_target_mode, p_staff_profile_ids);
  END IF;

  IF p_audience = 'both' THEN
    SELECT COUNT(DISTINCT x.id)::int INTO v_total
    FROM (
      SELECT p.id FROM profiles p WHERE p.role = 'customer'
      UNION
      SELECT id FROM announcement_resolve_staff_ids(p_staff_target_mode, p_staff_profile_ids)
    ) x;
  ELSE
    v_total := v_customer_count + v_staff_count;
  END IF;

  RETURN jsonb_build_object(
    'total', v_total,
    'customer_count', v_customer_count,
    'staff_count', v_staff_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION estimate_announcement_recipients(
  p_caller_phone text,
  p_audience text,
  p_staff_target_mode text DEFAULT 'all',
  p_staff_profile_ids uuid[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT p.role INTO v_role FROM profiles p WHERE p.phone = p_caller_phone;
  IF NOT announcement_is_management_role(v_role) THEN
    RAISE EXCEPTION 'Not authorized to estimate announcement recipients.';
  END IF;

  RETURN announcement_count_recipients(p_audience, p_staff_target_mode, p_staff_profile_ids);
END;
$$;

CREATE OR REPLACE FUNCTION list_announcement_staff_candidates(p_caller_phone text)
RETURNS TABLE(id uuid, full_name text, role user_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT p.role INTO v_role FROM profiles p WHERE p.phone = p_caller_phone;
  IF NOT announcement_is_management_role(v_role) THEN
    RAISE EXCEPTION 'Not authorized to list staff for announcements.';
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, p.role
  FROM profiles p
  WHERE p.role = ANY(announcement_staff_roles())
  ORDER BY p.full_name NULLS LAST, p.role, p.id;
END;
$$;

CREATE OR REPLACE FUNCTION announcement_validate_staff_targeting(
  p_audience text,
  p_staff_target_mode text,
  p_staff_profile_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_count int;
  v_invalid_count int;
BEGIN
  IF p_audience = 'customers' THEN
    RETURN;
  END IF;

  IF p_staff_target_mode = 'only' AND COALESCE(cardinality(p_staff_profile_ids), 0) = 0 THEN
    RAISE EXCEPTION 'Select at least one staff member when using only selected staff.';
  END IF;

  IF COALESCE(cardinality(p_staff_profile_ids), 0) > 0 THEN
    SELECT COUNT(*)::int INTO v_invalid_count
    FROM unnest(p_staff_profile_ids) AS sid(id)
    WHERE NOT EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = sid.id AND p.role = ANY(announcement_staff_roles())
    );

    IF v_invalid_count > 0 THEN
      RAISE EXCEPTION 'One or more selected staff members are invalid.';
    END IF;
  END IF;

  SELECT COUNT(*)::int INTO v_staff_count
  FROM announcement_resolve_staff_ids(p_staff_target_mode, p_staff_profile_ids);

  IF v_staff_count = 0 THEN
    RAISE EXCEPTION 'No staff recipients match the selected targeting.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION announcement_daily_send_limit()
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 20;
$$;

COMMENT ON FUNCTION announcement_daily_send_limit IS
  'Max salon announcements allowed per rolling 24-hour window.';

CREATE OR REPLACE FUNCTION send_salon_announcement(
  p_caller_phone text,
  p_title text,
  p_body text,
  p_audience text,
  p_staff_target_mode text DEFAULT 'all',
  p_staff_profile_ids uuid[] DEFAULT '{}'
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
BEGIN
  SELECT p.id, p.role INTO v_caller_id, v_caller_role
  FROM profiles p
  WHERE p.phone = p_caller_phone;

  IF NOT announcement_is_management_role(v_caller_role) THEN
    RAISE EXCEPTION 'Not authorized to send salon announcements.';
  END IF;

  v_title := NULLIF(btrim(p_title), '');
  v_body := NULLIF(btrim(p_body), '');

  IF v_title IS NULL THEN
    RAISE EXCEPTION 'Title is required.';
  END IF;
  IF char_length(v_title) > 120 THEN
    RAISE EXCEPTION 'Title must be 120 characters or fewer.';
  END IF;
  IF v_body IS NULL THEN
    RAISE EXCEPTION 'Message is required.';
  END IF;
  IF char_length(v_body) > 500 THEN
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
    status, fanout_offset, recipient_count
  ) VALUES (
    v_caller_id, v_title, v_body, p_audience,
    COALESCE(p_staff_target_mode, 'all'),
    COALESCE(p_staff_profile_ids, ARRAY[]::uuid[]),
    'pending', 0, 0
  )
  RETURNING id INTO v_announcement_id;

  INSERT INTO announcement_fanout_queue (announcement_id, status)
  VALUES (v_announcement_id, 'pending');

  RETURN jsonb_build_object(
    'id', v_announcement_id,
    'status', 'pending',
    'estimated_recipients', (v_counts->>'total')::int,
    'customer_count', (v_counts->>'customer_count')::int,
    'staff_count', (v_counts->>'staff_count')::int
  );
END;
$$;

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
  v_processed int := 0;
  v_total int;
  v_batch int;
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
    PERFORM create_notification(
      v_recipient_id,
      v_row.title,
      v_row.body,
      'salon_announcement',
      v_row.id,
      jsonb_build_object('announcement_id', v_row.id)
    );
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
  created_by_name text
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
    COALESCE(sender.full_name, 'Unknown') AS created_by_name
  FROM announcements a
  JOIN profiles sender ON sender.id = a.created_by
  ORDER BY a.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
