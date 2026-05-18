-- 007: Backfill shift counts for existing appointments
-- Updates all existing shifts with correct walk-in and online counts
-- from the current appointments table. Safe to run multiple times.

-- Backfill confirmed_online_count (online bookings)
UPDATE shifts s
SET confirmed_online_count = COALESCE(sub.cnt, 0),
    updated_at = NOW()
FROM (
  SELECT
    technician_id,
    COALESCE(scheduled_time::date, check_in_time::date) AS appt_date,
    COUNT(*) AS cnt
  FROM appointments
  WHERE source = 'online'
    AND status IN ('waiting', 'assigned_pending', 'serving')
    AND technician_id IS NOT NULL
  GROUP BY technician_id, COALESCE(scheduled_time::date, check_in_time::date)
) sub
WHERE s.staff_id = sub.technician_id
  AND s.shift_date = sub.appt_date;

-- Backfill appointment_count (walk-in / null source)
-- Note: appointments with source='walk_in' or source IS NULL are walk-ins
UPDATE shifts s
SET appointment_count = COALESCE(sub.cnt, 0),
    updated_at = NOW()
FROM (
  SELECT
    technician_id,
    COALESCE(scheduled_time::date, check_in_time::date) AS appt_date,
    COUNT(*) AS cnt
  FROM appointments
  WHERE COALESCE(source, 'walk_in') = 'walk_in'
    AND status IN ('waiting', 'assigned_pending', 'serving')
    AND technician_id IS NOT NULL
  GROUP BY technician_id, COALESCE(scheduled_time::date, check_in_time::date)
) sub
WHERE s.staff_id = sub.technician_id
  AND s.shift_date = sub.appt_date;