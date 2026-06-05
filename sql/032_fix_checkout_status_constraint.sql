-- Hotfix: allow ready_for_checkout when send_to_checkout fails with
-- "violates check constraint check_appointment_status"
-- Run once in Supabase SQL Editor if 031 was applied before this fix.

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS checkout_ready_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE appointments DROP CONSTRAINT IF EXISTS check_appointment_status;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
  CHECK (status IN (
    'confirmed', 'waiting', 'assigned_pending', 'serving',
    'ready_for_checkout', 'completed', 'cancelled', 'missed'
  ));
