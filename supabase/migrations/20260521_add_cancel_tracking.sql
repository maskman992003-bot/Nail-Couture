-- Add cancellation tracking columns to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- Also ensure created_at and source columns exist (may already exist)
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'online',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();