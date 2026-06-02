-- Link customer_waivers to profiles
ALTER TABLE public.customer_waivers 
ADD COLUMN profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
