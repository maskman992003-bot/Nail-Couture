-- Add PIN column to profiles for all user roles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin TEXT;