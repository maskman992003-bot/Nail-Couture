-- =============================================
-- CHECK CURRENT RLS POLICIES FOR customer_waivers
-- =============================================

-- 1. Check if RLS is enabled on the table
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'customer_waivers';

-- 2. List all existing policies on customer_waivers
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles::text,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'customer_waivers'
ORDER BY policyname;

-- 3. Optional: View sample data (only works if RLS allows it)
SELECT * FROM customer_waivers LIMIT 5;
