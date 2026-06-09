-- Manual verification queries after applying 035_notifications_system.sql
-- Run in Supabase SQL Editor while exercising each workflow in the app.

-- 1) Recent notifications (all roles)
SELECT
  n.created_at,
  n.type,
  n.title,
  n.body,
  n.is_read,
  p.full_name AS recipient,
  p.role AS recipient_role
FROM notifications n
JOIN profiles p ON p.id = n.recipient_id
ORDER BY n.created_at DESC
LIMIT 30;

-- 2) Unread counts by role
SELECT p.role, COUNT(*) AS unread_count
FROM notifications n
JOIN profiles p ON p.id = n.recipient_id
WHERE n.is_read = false
GROUP BY p.role
ORDER BY p.role;

-- 3) Duplicate check (same recipient/type/reference within 5 minutes)
SELECT recipient_id, type, reference_id, COUNT(*) AS cnt
FROM notifications
WHERE created_at > NOW() - INTERVAL '5 minutes'
GROUP BY recipient_id, type, reference_id
HAVING COUNT(*) > 1;

-- 4) Smoke-test create_notification (replace UUID with a test profile id)
-- SELECT create_notification(
--   '00000000-0000-0000-0000-000000000001'::uuid,
--   'Test notification',
--   'If you see this, writers work.',
--   'system',
--   NULL,
--   '{}'::jsonb
-- );

-- P0 scenario checklist (manual):
-- [ ] Walk-in check-in -> customer checked_in + admin lobby_waiting
-- [ ] Assign technician -> customer technician_assigned + tech new_assignment
-- [ ] Send to checkout -> cashier checkout_ready + customer + tech your_client_checkout
-- [ ] Process payment -> customer payment_receipt + loyalty_earned
-- [ ] Customer cancel -> customer appointment_cancelled + admin customer_cancelled
-- [ ] Time-off submit -> owner/partner time_off_request
-- [ ] Time-off review -> staff time_off_decision
-- [ ] Customer edit booking -> customer appointment_updated + admin customer_booking_edit
-- [ ] Bell badge updates without opening notification panel (app UI)
