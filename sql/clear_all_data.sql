-- ⚠️ WARNING: This deletes ALL data in ALL tables
-- Schema (columns, constraints, triggers, RLS) is preserved
-- 
-- After running, you'll need to re-create at least one admin profile
-- to log back into the app.
--
-- Make a backup in Supabase Dashboard first if needed:
--   Database → Backup & Restore → Create Backup

SET session_replication_role = 'replica';

DELETE FROM appointment_status_history;
DELETE FROM inventory_logs;
DELETE FROM payment_transactions;
DELETE FROM notifications;
DELETE FROM appointments;
DELETE FROM online_bookings_archived;
DELETE FROM shifts;
DELETE FROM staff_schedules;
DELETE FROM time_off_requests;
DELETE FROM profiles;
DELETE FROM inventory;
DELETE FROM services;

SET session_replication_role = 'origin';

-- Create super admin profile
INSERT INTO profiles (id, full_name, phone, role, created_at)
VALUES (gen_random_uuid(), 'Vman', '1234567890', 'super_admin', now());
