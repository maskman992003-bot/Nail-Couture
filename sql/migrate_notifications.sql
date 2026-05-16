-- ============================================
-- Migration: Update existing notifications table
-- Run this in Supabase > SQL Editor
-- ============================================

-- 1. Add the new columns (ignore errors if they already exist due to prior partial changes)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE notifications ALTER COLUMN message SET NOT NULL;

-- 2. If profile_id exists, backfill target_user_id from it (for existing rows)
UPDATE notifications SET target_user_id = profile_id WHERE target_user_id IS NULL AND profile_id IS NOT NULL;

-- 3. Backfill a default title for rows that don't have one
UPDATE notifications SET title = 'Notification' WHERE title IS NULL;

-- 4. Make target_user_id NOT NULL (only safe if you have data backfilled)
ALTER TABLE notifications ALTER COLUMN target_user_id SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN title SET NOT NULL;

-- 5. Add indexes for fast queries
CREATE INDEX IF NOT EXISTS notifications_target_user_id_is_read_idx
  ON notifications(target_user_id, is_read)
  WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS notifications_created_at_idx
  ON notifications(created_at DESC);

-- 6. Ensure RLS is on and policies exist
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all notifications" ON notifications;
DROP POLICY IF EXISTS "Customers can read own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can insert for any customer" ON notifications;
DROP POLICY IF EXISTS "Customers can update own notifications" ON notifications;

CREATE POLICY "Customers can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = target_user_id);

CREATE POLICY "Admins can insert for any customer"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Customers can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = target_user_id);