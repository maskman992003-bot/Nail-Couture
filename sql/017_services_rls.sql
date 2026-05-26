-- Disable RLS on services table
-- The app uses custom localStorage auth, not Supabase Auth sessions.
-- Admin access is enforced client-side via ProtectedRoute components.
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
