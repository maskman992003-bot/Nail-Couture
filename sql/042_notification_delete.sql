-- Migration 042: Delete notification RPCs (hard delete, phone auth)
-- Run after 040_notification_preferences.sql

DROP FUNCTION IF EXISTS delete_notification(text, uuid) CASCADE;

CREATE OR REPLACE FUNCTION delete_notification(
  p_phone text,
  p_notif_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM notifications n
  USING profiles p
  WHERE p.id = n.recipient_id
    AND p.phone = p_phone
    AND n.id = p_notif_id;
END;
$$;

DROP FUNCTION IF EXISTS delete_all_my_notifications(text) CASCADE;

CREATE OR REPLACE FUNCTION delete_all_my_notifications(p_phone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM notifications n
  USING profiles p
  WHERE p.id = n.recipient_id
    AND p.phone = p_phone;
END;
$$;
