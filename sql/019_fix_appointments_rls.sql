-- Migration 019: Fix missing SELECT policy on appointments for anon role
-- Issue: 012_comprehensive_fix.sql dropped the old permissive policy and omitted
-- SELECT for anon users. The app uses custom localStorage auth (no Supabase Auth
-- sessions), so auth.role() is always 'anon', never 'authenticated'.

-- Drop if exists from prior attempts to avoid conflicts
DROP POLICY IF EXISTS "Allow anon read appointments" ON appointments;
DROP POLICY IF EXISTS "Allow anon insert appointments" ON appointments;

-- Add SELECT policy for anon users on appointments
CREATE POLICY "Allow anon read appointments"
  ON appointments FOR SELECT TO anon USING (true);

-- Ensure anon users can also INSERT (was missing in some migration states)
CREATE POLICY "Allow anon insert appointments"
  ON appointments FOR INSERT TO anon WITH CHECK (true);
