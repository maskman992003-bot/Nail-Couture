-- Drop existing write policy and recreate with proper anon key support
DROP POLICY IF EXISTS "Allow admin stock modifications" ON stock;
DROP POLICY IF EXISTS "Allow all stock modifications" ON stock;

-- Allow ALL operations without auth.uid() check (works with anon key + localStorage auth)
CREATE POLICY "Allow all stock modifications" ON stock FOR ALL USING (true) WITH CHECK (true);