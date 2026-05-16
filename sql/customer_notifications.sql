-- ============================================
-- Customer In-App Notification Center
-- Run this in Supabase > SQL Editor
-- ============================================

-- Drop existing table if you want a clean start
-- DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for fast unread count queries per user
CREATE INDEX IF NOT EXISTS notifications_target_user_id_is_read_idx
  ON notifications(target_user_id, is_read)
  WHERE is_read = FALSE;

-- Index for ordering by newest
CREATE INDEX IF NOT EXISTS notifications_created_at_idx
  ON notifications(created_at DESC);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Customers can only see and update their own notifications
CREATE POLICY "Customers can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = target_user_id);

CREATE POLICY "Admins can insert for any customer"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Customers can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = target_user_id);

-- ============================================
-- Optional: enable realtime subscriptions
-- Requires: supabase.realtime ENABLE
-- ============================================
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;