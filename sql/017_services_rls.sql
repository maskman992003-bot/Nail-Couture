-- Enable RLS on services table (if not already)
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read services (public)
DROP POLICY IF EXISTS "Anyone can read services" ON services;
CREATE POLICY "Anyone can read services" ON services
  FOR SELECT USING (true);

-- Allow authenticated staff (super_admin, owner, partner, admin) to insert
DROP POLICY IF EXISTS "Staff can insert services" ON services;
CREATE POLICY "Staff can insert services" ON services
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'owner', 'partner', 'admin')
    )
  );

-- Allow authenticated staff to update
DROP POLICY IF EXISTS "Staff can update services" ON services;
CREATE POLICY "Staff can update services" ON services
  FOR UPDATE USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'owner', 'partner', 'admin')
    )
  );

-- Allow authenticated staff to delete
DROP POLICY IF EXISTS "Staff can delete services" ON services;
CREATE POLICY "Staff can delete services" ON services
  FOR DELETE USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'owner', 'partner', 'admin')
    )
  );
