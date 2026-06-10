-- Migration 050: Deliver announcements without requiring a database webhook
-- Run after 049_salon_announcements.sql
--
-- The queue + edge function path still works when configured, but management
-- clients can also advance fan-out directly via RPC (used after send and on page load).

CREATE OR REPLACE FUNCTION advance_announcement_fanout(
  p_caller_phone text,
  p_announcement_id uuid,
  p_batch_size integer DEFAULT 500
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_result jsonb;
BEGIN
  SELECT p.role INTO v_role FROM profiles p WHERE p.phone = p_caller_phone;
  IF NOT announcement_is_management_role(v_role) THEN
    RAISE EXCEPTION 'Not authorized to process salon announcements.';
  END IF;

  IF p_announcement_id IS NULL THEN
    RAISE EXCEPTION 'Announcement id is required.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM announcements WHERE id = p_announcement_id) THEN
    RAISE EXCEPTION 'Announcement not found.';
  END IF;

  UPDATE announcement_fanout_queue
  SET status = 'processing'
  WHERE announcement_id = p_announcement_id
    AND status = 'pending';

  v_result := process_announcement_fanout_batch(p_announcement_id, p_batch_size);
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION drain_announcement_fanout(
  p_caller_phone text,
  p_announcement_id uuid,
  p_batch_size integer DEFAULT 500,
  p_max_batches integer DEFAULT 200
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_result jsonb;
  v_done boolean := false;
  v_iterations int := 0;
BEGIN
  SELECT p.role INTO v_role FROM profiles p WHERE p.phone = p_caller_phone;
  IF NOT announcement_is_management_role(v_role) THEN
    RAISE EXCEPTION 'Not authorized to process salon announcements.';
  END IF;

  IF p_batch_size IS NULL OR p_batch_size < 1 THEN
    p_batch_size := 500;
  END IF;
  IF p_max_batches IS NULL OR p_max_batches < 1 THEN
    p_max_batches := 200;
  END IF;

  LOOP
    v_result := advance_announcement_fanout(p_caller_phone, p_announcement_id, p_batch_size);
    v_done := COALESCE((v_result->>'done')::boolean, false);
    v_iterations := v_iterations + 1;

    EXIT WHEN v_done;
    EXIT WHEN v_iterations >= p_max_batches;
    EXIT WHEN COALESCE((v_result->>'processed')::int, 0) = 0 AND NOT v_done;
  END LOOP;

  RETURN jsonb_build_object(
    'done', v_done,
    'iterations', v_iterations,
    'last_batch', v_result
  );
END;
$$;

CREATE OR REPLACE FUNCTION resume_pending_announcement_fanouts(
  p_caller_phone text,
  p_limit integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_row record;
  v_results jsonb := '[]'::jsonb;
  v_drain jsonb;
  v_count int := 0;
BEGIN
  SELECT p.role INTO v_role FROM profiles p WHERE p.phone = p_caller_phone;
  IF NOT announcement_is_management_role(v_role) THEN
    RAISE EXCEPTION 'Not authorized to process salon announcements.';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 THEN
    p_limit := 10;
  END IF;

  FOR v_row IN
    SELECT a.id
    FROM announcements a
    WHERE a.status IN ('pending', 'processing')
    ORDER BY a.created_at ASC
    LIMIT p_limit
  LOOP
    v_drain := drain_announcement_fanout(p_caller_phone, v_row.id);
    v_results := v_results || jsonb_build_array(
      jsonb_build_object('announcement_id', v_row.id, 'result', v_drain)
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('processed', v_count, 'results', v_results);
END;
$$;

COMMENT ON FUNCTION advance_announcement_fanout IS
  'Process one fan-out batch for an announcement (management roles).';

COMMENT ON FUNCTION drain_announcement_fanout IS
  'Process all remaining fan-out batches for one announcement (management roles).';

COMMENT ON FUNCTION resume_pending_announcement_fanouts IS
  'Drain all pending/processing announcements — call on Announcements page load.';

-- One-time repair for queue rows that were never picked up by a webhook
DO $$
DECLARE
  v_row record;
  v_result jsonb;
  v_done boolean;
  v_guard int;
BEGIN
  FOR v_row IN
    SELECT announcement_id
    FROM announcement_fanout_queue
    WHERE status IN ('pending', 'processing')
    ORDER BY created_at ASC
  LOOP
    v_done := false;
    v_guard := 0;
    WHILE NOT v_done AND v_guard < 200 LOOP
      v_result := process_announcement_fanout_batch(v_row.announcement_id, 500);
      v_done := COALESCE((v_result->>'done')::boolean, false);
      v_guard := v_guard + 1;
      IF COALESCE((v_result->>'processed')::int, 0) = 0 AND NOT v_done THEN
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;
