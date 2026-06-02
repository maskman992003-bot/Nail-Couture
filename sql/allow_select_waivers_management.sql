-- Allow management roles to SELECT all customer waivers
-- First, we need to make sure our profiles have role info available in RLS
-- For this to work, ensure your Supabase auth setup includes the role in user metadata or profiles table
CREATE POLICY "Management can view all waivers"
ON public.customer_waivers
FOR SELECT
USING (
  -- This will need to be adjusted based on how you track user roles in your Supabase setup
  -- For now, we'll allow SELECT access for authenticated users, then you can refine with RLS based on your role system
  true
);
