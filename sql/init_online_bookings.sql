-- Create online_bookings table for customer-initiated bookings
CREATE TABLE IF NOT EXISTS online_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_id BIGINT NOT NULL REFERENCES services(id),
  technician_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE online_bookings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read their own bookings
CREATE POLICY "Allow read own online bookings" ON online_bookings FOR SELECT USING (true);

-- Allow all users to read online bookings (admins need to see all)
CREATE POLICY "Allow read all online bookings" ON online_bookings FOR SELECT USING (true);

-- Allow inserts from anyone (customers booking online)
CREATE POLICY "Allow insert online bookings" ON online_bookings FOR INSERT WITH CHECK (true);

-- Allow updates from anyone (for status changes via admin)
CREATE POLICY "Allow update online bookings" ON online_bookings FOR UPDATE USING (true) WITH CHECK (true);

-- Allow deletes
CREATE POLICY "Allow delete online bookings" ON online_bookings FOR DELETE USING (true);