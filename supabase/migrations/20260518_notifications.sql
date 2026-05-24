-- Notification RPCs for sidebar notification panel
-- 
-- 1. get_my_notifications: fetch notifications for a user by phone
CREATE OR REPLACE FUNCTION get_my_notifications(p_phone TEXT)
RETURNS TABLE (
  id UUID,
  target_user_id UUID,
  online_booking_id UUID,
  title TEXT,
  message TEXT,
  is_read BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.target_user_id,
    n.online_booking_id,
    n.title,
    n.message,
    n.is_read,
    n.created_at
  FROM notifications n
  WHERE n.target_user_id IN (
    SELECT id FROM profiles WHERE phone = p_phone
  )
  ORDER BY n.created_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. mark_my_notifications_read: mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_my_notifications_read(p_phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE
  WHERE target_user_id IN (
    SELECT id FROM profiles WHERE phone = p_phone
  )
  AND is_read = FALSE;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. mark_notification_read: mark a single notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_phone TEXT, p_notif_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE
  WHERE id = p_notif_id
    AND target_user_id IN (
      SELECT id FROM profiles WHERE phone = p_phone
    )
    AND is_read = FALSE;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. mark_my_notifications_read: mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_my_notifications_read(p_phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE
  WHERE target_user_id IN (
    SELECT id FROM profiles WHERE phone_number = p_phone
  )
  AND is_read = FALSE;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. mark_notification_read: mark a single notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_phone TEXT, p_notif_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE
  WHERE id = p_notif_id
    AND target_user_id IN (
      SELECT id FROM profiles WHERE phone_number = p_phone
    )
    AND is_read = FALSE;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;