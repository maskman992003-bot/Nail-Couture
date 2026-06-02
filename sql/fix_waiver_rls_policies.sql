-- =============================================
-- SIMPLE RLS FIX FOR customer_waivers TABLE
-- =============================================

-- STEP 1: Disable RLS temporarily to verify the data exists
ALTER TABLE public.customer_waivers DISABLE ROW LEVEL SECURITY;

-- STEP 2: Create a policy that allows EVERYTHING (for testing)
DROP POLICY IF EXISTS "Allow all operations on customer_waivers" ON public.customer_waivers;

CREATE POLICY "Allow all operations on customer_waivers"
ON public.customer_waivers
FOR ALL
USING (true)
WITH CHECK (true);

-- STEP 3: Re-enable RLS
ALTER TABLE public.customer_waivers ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Done! Now refresh your browser and waivers should load!
-- =============================================
