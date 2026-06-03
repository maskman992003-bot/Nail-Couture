-- Migration 019: Fix missing authenticated SELECT policy on appointments
-- Issue: 012_comprehensive_fix.sql dropped "Authenticated manage appointments"
-- (FOR ALL) and replaced with only UPDATE/DELETE, omitting SELECT for authenticated users.
-- This breaks all admin/owner/cashier/technician dashboards that query appointments.

-- Add SELECT policy for authenticated users on appointments
CREATE POLICY "Authenticated read appointments"
  ON appointments FOR SELECT TO authenticated USING (true);

-- Ensure authenticated users can also INSERT (was also omitted)
CREATE POLICY "Authenticated insert appointments"
  ON appointments FOR INSERT TO authenticated WITH CHECK (true);
