-- 001: Add confirmed_online_count column to shifts table
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS confirmed_online_count INTEGER NOT NULL DEFAULT 0;