-- ============================================
-- Migration: Secure notifications via RPC functions (phone-based auth)
-- Run this in Supabase > SQL Editor
-- ============================================

-- Re-enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing RLS policies on notifications
DROP POLICY IF EXISTS "Allow all notifications" ON notifications;
DROP POLICY IF EXISTS "Customers can read own notifications" ON notifications;
DROP POLICY IF EXISTS "Staff can read all notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can insert for any customer" ON notifications;
DROP POLICY IF EXISTS "Staff can insert any notification" ON notifications;
DROP POLICY IF EXISTS "Customers can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Staff can update any notification" ON notifications;

-- Allow SELECT/UPDATE via RPC only (RLS is bypassed for RPC with security definer)
-- The actual access control lives inside the plpgsql functions above

-- Drop existing function if re-running
CREATE OR REPLACE FUNCTION get_my_notifications(p_phone TEXT)
RETURNS SETOF notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT n.*
  FROM notifications n
  WHERE n.target_user_id = (
    SELECT id FROM profiles WHERE phone_number = p_phone
  )
  ORDER BY n.created_at DESC
  LIMIT 20;
END;
$$;

CREATE OR REPLACE FUNCTION mark_my_notifications_read(p_phone TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE
  WHERE is_read = FALSE
    AND target_user_id = (
      SELECT id FROM profiles WHERE phone_number = p_phone
    );
END;
$$;

CREATE OR REPLACE FUNCTION mark_notification_read(p_phone TEXT, p_notif_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE
  WHERE id = p_notif_id
    AND target_user_id = (
      SELECT id FROM profiles WHERE phone_number = p_phone
    );
END;
$$;

-- Grant execute to authenticated and anon (phone-based login has no auth.uid)
GRANT EXECUTE ON FUNCTION get_my_notifications(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION mark_my_notifications_read(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION mark_notification_read(TEXT, UUID) TO authenticated, anon;