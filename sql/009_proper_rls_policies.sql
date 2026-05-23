-- 009: Proper RLS policies for appointments and related tables

-- Ensure RLS is enabled on appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate cleanly
DROP POLICY IF EXISTS "Allow anon read appointments" ON appointments;
DROP POLICY IF EXISTS "Allow anon insert appointments" ON appointments;
DROP POLICY IF EXISTS "Allow authenticated update appointments" ON appointments;
DROP POLICY IF EXISTS "Allow authenticated delete appointments" ON appointments;

-- SELECT: anon can read all appointments (needed for admin panel viewing)
CREATE POLICY "Allow anon read appointments" ON appointments
  FOR SELECT TO anon USING (true);

-- INSERT: anon can insert appointments (customer booking)
CREATE POLICY "Allow anon insert appointments" ON appointments
  FOR INSERT TO anon WITH CHECK (true);

-- UPDATE: authenticated can update (admin actions, check-in flow)
CREATE POLICY "Allow authenticated update appointments" ON appointments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- DELETE: authenticated can delete (admin actions)
CREATE POLICY "Allow authenticated delete appointments" ON appointments
  FOR DELETE TO authenticated USING (true);

-- Enable RLS on profiles (for phone validation)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read profiles" ON profiles;
CREATE POLICY "Allow anon read profiles" ON profiles
  FOR SELECT TO anon USING (true);

-- Enable RLS on services
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read services" ON services;
CREATE POLICY "Allow anon read services" ON services
  FOR SELECT TO anon USING (true);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read notifications" ON notifications;
DROP POLICY IF EXISTS "Allow anon insert notifications" ON notifications;
CREATE POLICY "Allow anon read notifications" ON notifications
  FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert notifications" ON notifications
  FOR INSERT TO anon WITH CHECK (true);

