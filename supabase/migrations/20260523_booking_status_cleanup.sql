-- Booking Management status cleanup and tracking columns

-- 1. Add new status values and timestamp columns to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS missed_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS lobby_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS serving_at TIMESTAMPTZ;

-- Drop the old CHECK constraint and add new one with all statuses
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check CHECK (status IN ('pending', 'confirmed', 'waiting', 'assigned_pending', 'serving', 'completed', 'cancelled', 'missed', 'approved', 'rejected'));

-- 2. Create function to mark missed appointments (can be called via cron or manually)
CREATE OR REPLACE FUNCTION mark_missed_appointments()
RETURNS void AS $$
BEGIN
  UPDATE appointments
  SET
    status = 'missed',
    missed_at = NOW(),
    updated_at = NOW()
  WHERE
    status IN ('confirmed', 'waiting', 'serving')
    AND scheduled_time < NOW()
    AND missed_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Add pg_cron schedule (run via Supabase dashboard if pg_cron extension is enabled)
-- To enable pg_cron: CREATE EXTENSION IF NOT EXISTS pg_cron;
-- Then uncomment the line below:
-- SELECT cron.schedule('auto-missed', '5 0 * * *', 'SELECT mark_missed_appointments()');

-- 4. Add unique constraint to prevent duplicate shifts per staff/day/type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_staff_shift_date_type'
  ) THEN
    ALTER TABLE shifts ADD CONSTRAINT unique_staff_shift_date_type UNIQUE (staff_id, shift_date, shift_type);
  END IF;
END;
$$;