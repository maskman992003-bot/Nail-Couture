-- Migration 036: Drop obsolete FK on notifications.reference_id
-- reference_id is a polymorphic pointer (appointments, inventory, time-off, etc.)
-- The legacy constraint still required online_bookings_archived IDs after the column rename.

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_online_booking_id_fkey;

COMMENT ON COLUMN notifications.reference_id IS
  'Optional polymorphic reference (appointment id, inventory id, time-off id, etc.). No FK enforced.';
