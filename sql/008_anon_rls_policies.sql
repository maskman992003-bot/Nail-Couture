-- 008: Add anonymous RLS policies for RPC functions to work without auth
-- get_technician_appointments and get_my_notifications fail with 400
-- because they run as 'anon' role which is blocked by RLS on these tables.

-- Check current policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'appointments';
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'notifications';

-- Allow anon role to read appointments (needed by get_technician_appointments)
DROP POLICY IF EXISTS "Allow anon read appointments" ON appointments;
CREATE POLICY "Allow anon read appointments" ON appointments
  FOR SELECT TO anon USING (true);

-- Allow anon role to read notifications (needed by get_my_notifications)
DROP POLICY IF EXISTS "Allow anon read notifications" ON notifications;
CREATE POLICY "Allow anon read notifications" ON notifications
  FOR SELECT TO anon USING (true);