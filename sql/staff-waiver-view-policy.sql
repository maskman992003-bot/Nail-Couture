-- This policy allows staff with admin roles to view all customer waivers
DROP POLICY IF EXISTS "Staff can view all waivers" ON public.customer_waivers;

CREATE POLICY "Staff can view all waivers" 
ON public.customer_waivers 
FOR SELECT 
USING ( 
  exists ( 
    select 1 from public.profiles 
    where profiles.id = auth.uid() 
    and profiles.role in ('super_admin', 'owner', 'partner', 'admin') 
  ) 
);
