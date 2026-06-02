-- Backfill profile_id for existing customer_waivers using customer_phone
UPDATE public.customer_waivers w
SET profile_id = p.id
FROM public.profiles p
WHERE 
  w.profile_id IS NULL
  AND p.phone = w.customer_phone;
