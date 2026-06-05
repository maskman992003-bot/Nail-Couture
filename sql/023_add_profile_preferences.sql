-- Nail journey / extended customer preferences (JSONB)
-- Run once in Supabase SQL Editor before using Phase 2 profile fields.

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN profiles.preferences IS 'Extended salon preferences: nail_shape, nail_length, nail_finish, allergies, etc.';
