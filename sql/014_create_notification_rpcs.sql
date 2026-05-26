-- RPC functions for notification management
-- Used by Sidebar.jsx polling (line 92, 119, 127)

DROP FUNCTION IF EXISTS get_my_notifications(text) CASCADE;

CREATE OR REPLACE FUNCTION get_my_notifications(p_phone text)
RETURNS TABLE(
  id uuid,
  recipient_id uuid,
  reference_id uuid,
  title text,
  body text,
  is_read boolean,
  type text,
  created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT n.id, n.recipient_id, n.reference_id, n.title, n.body, n.is_read, n.type, n.created_at
  FROM notifications n
  JOIN profiles p ON p.id = n.recipient_id
  WHERE p.phone = p_phone
  ORDER BY n.created_at DESC;
END;
$$;

DROP FUNCTION IF EXISTS mark_my_notifications_read(text) CASCADE;

CREATE OR REPLACE FUNCTION mark_my_notifications_read(p_phone text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE notifications n
  SET is_read = true
  FROM profiles p
  WHERE p.id = n.recipient_id AND p.phone = p_phone;
END;
$$;

DROP FUNCTION IF EXISTS mark_notification_read(text, uuid) CASCADE;

CREATE OR REPLACE FUNCTION mark_notification_read(p_phone text, p_notif_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE notifications n
  SET is_read = true
  FROM profiles p
  WHERE p.id = n.recipient_id AND p.phone = p_phone AND n.id = p_notif_id;
END;
$$;
