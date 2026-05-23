-- 008: Add anonymous RLS policies for RPC functions to work without auth

-- Allow anon role to read appointments
DROP POLICY IF EXISTS "Allow anon read appointments" ON appointments;
CREATE POLICY "Allow anon read appointments" ON appointments
  FOR SELECT TO anon USING (true);

-- Allow anon role to insert appointments (needed for customer booking)
DROP POLICY IF EXISTS "Allow anon insert appointments" ON appointments;
CREATE POLICY "Allow anon insert appointments" ON appointments
  FOR INSERT TO anon WITH CHECK (true);

-- Allow anon role to read notifications
DROP POLICY IF EXISTS "Allow anon read notifications" ON notifications;
CREATE POLICY "Allow anon read notifications" ON notifications
  FOR SELECT TO anon USING (true);

-- Allow anon role to insert notifications
DROP POLICY IF EXISTS "Allow anon insert notifications" ON notifications;
CREATE POLICY "Allow anon insert notifications" ON notifications
  FOR INSERT TO anon WITH CHECK (true);

-- Allow anon role to read services
DROP POLICY IF EXISTS "Allow anon read services" ON services;
CREATE POLICY "Allow anon read services" ON services
  FOR SELECT TO anon USING (true);

-- Allow anon role to read profiles
DROP POLICY IF EXISTS "Allow anon read profiles" ON profiles;
CREATE POLICY "Allow anon read profiles" ON profiles
  FOR SELECT TO anon USING (true);