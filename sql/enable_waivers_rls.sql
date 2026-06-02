-- 1. Enable Row Level Security
ALTER TABLE public.customer_waivers ENABLE ROW LEVEL SECURITY;

-- 2. Create policy to allow public inserts for check-in
CREATE POLICY "Allow public inserts for check-in" 
ON public.customer_waivers 
FOR INSERT 
WITH CHECK (true);
