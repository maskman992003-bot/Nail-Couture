-- Migration 040: Per-user notification mute preferences (Phase 5)
-- Run after 039_p1_notification_events.sql

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb NOT NULL DEFAULT '{"muted_types":[]}'::jsonb;

COMMENT ON COLUMN profiles.notification_preferences IS
  'In-app notification mutes: {"muted_types":["checkout_ready",...]}';

CREATE OR REPLACE FUNCTION is_notification_type_enabled(
  p_recipient_id uuid,
  p_type text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_muted text[];
  v_type text;
BEGIN
  v_type := COALESCE(p_type, 'system');
  IF v_type = 'system' THEN
    RETURN true;
  END IF;

  SELECT COALESCE(
    ARRAY(
      SELECT jsonb_array_elements_text(
        COALESCE(notification_preferences, '{}'::jsonb)->'muted_types'
      )
    ),
    ARRAY[]::text[]
  )
  INTO v_muted
  FROM profiles
  WHERE id = p_recipient_id;

  IF v_muted IS NULL THEN
    RETURN true;
  END IF;

  RETURN NOT (v_type = ANY(v_muted));
END;
$$;

CREATE OR REPLACE FUNCTION create_notification(
  p_recipient_id uuid,
  p_title text,
  p_body text,
  p_type text DEFAULT 'system',
  p_reference_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_recipient_id IS NULL OR p_title IS NULL OR p_body IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT is_notification_type_enabled(p_recipient_id, COALESCE(p_type, 'system')) THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.recipient_id = p_recipient_id
      AND n.type = COALESCE(p_type, 'system')
      AND n.reference_id IS NOT DISTINCT FROM p_reference_id
      AND n.created_at > NOW() - INTERVAL '5 minutes'
  ) THEN
    SELECT n.id INTO v_id
    FROM notifications n
    WHERE n.recipient_id = p_recipient_id
      AND n.type = COALESCE(p_type, 'system')
      AND n.reference_id IS NOT DISTINCT FROM p_reference_id
      AND n.created_at > NOW() - INTERVAL '5 minutes'
    ORDER BY n.created_at DESC
    LIMIT 1;
    RETURN v_id;
  END IF;

  INSERT INTO notifications (
    recipient_id, title, body, type, reference_id, metadata, is_read
  ) VALUES (
    p_recipient_id,
    p_title,
    p_body,
    COALESCE(p_type, 'system'),
    p_reference_id,
    COALESCE(p_metadata, '{}'::jsonb),
    false
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_notification_preferences(p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefs jsonb;
BEGIN
  SELECT COALESCE(notification_preferences, '{"muted_types":[]}'::jsonb)
  INTO v_prefs
  FROM profiles
  WHERE phone = p_phone;

  IF v_prefs IS NULL THEN
    RETURN jsonb_build_object('muted_types', '[]'::jsonb);
  END IF;

  IF v_prefs->'muted_types' IS NULL THEN
    v_prefs := jsonb_set(v_prefs, '{muted_types}', '[]'::jsonb, true);
  END IF;

  RETURN v_prefs;
END;
$$;

CREATE OR REPLACE FUNCTION update_notification_preferences(
  p_phone text,
  p_muted_types text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefs jsonb;
BEGIN
  UPDATE profiles
  SET notification_preferences = jsonb_build_object(
    'muted_types',
    COALESCE(to_jsonb(p_muted_types), '[]'::jsonb)
  )
  WHERE phone = p_phone
  RETURNING notification_preferences INTO v_prefs;

  IF v_prefs IS NULL THEN
    RAISE EXCEPTION 'Profile not found for this phone number.';
  END IF;

  RETURN v_prefs;
END;
$$;
