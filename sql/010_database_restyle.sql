-- ============================================================
-- DATABASE RESTRUCTURE — FINAL, IDEMPOTENT
-- Run once in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: Rename stock → inventory (before inventory_logs FK)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_class WHERE relname = 'stock' AND relkind = 'r')
     AND NOT EXISTS (SELECT FROM pg_class WHERE relname = 'inventory' AND relkind = 'r') THEN
    ALTER TABLE stock RENAME TO inventory;
  END IF;
END $$;

-- Ensure inventory table exists even if stock didn't exist
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT,
  reorder_threshold INTEGER DEFAULT 5,
  supplier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'name')
     AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'item_name') THEN
    ALTER TABLE inventory RENAME COLUMN name TO item_name;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'min_stock_alert')
     AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'reorder_threshold') THEN
    ALTER TABLE inventory RENAME COLUMN min_stock_alert TO reorder_threshold;
  END IF;
END $$;

-- ============================================================
-- STEP 2: Create new tables
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  technician_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  cashier_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  service_id BIGINT REFERENCES services(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  discount_type TEXT CHECK (discount_type IN ('percentage','fixed','loyalty','coupon')),
  final_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('cash','card','other')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','refunded')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointment_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT
);

CREATE TABLE IF NOT EXISTS inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  quantity_changed INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STEP 3: Clean profiles table
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone_number')
     AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
    ALTER TABLE profiles RENAME COLUMN phone_number TO phone;
  END IF;
END $$;

-- Drop the view first, then the column
DROP VIEW IF EXISTS staff_profiles CASCADE;
ALTER TABLE profiles DROP COLUMN IF EXISTS is_staff;

-- ============================================================
-- STEP 4: Clean appointments table
-- ============================================================

-- 4A: Map old status values BEFORE adding new constraint
UPDATE appointments SET status = 'confirmed' WHERE status IN ('pending', 'approved', 'Checked-In');
UPDATE appointments SET status = 'waiting' WHERE status = 'assigned_pending';
UPDATE appointments SET status = 'cancelled' WHERE status = 'rejected';

-- 4B: Rename columns (only if old exists and new doesn't)
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'profile_id')
     AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'customer_id') THEN
    ALTER TABLE appointments RENAME COLUMN profile_id TO customer_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'scheduled_time')
     AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'scheduled_at') THEN
    ALTER TABLE appointments RENAME COLUMN scheduled_time TO scheduled_at;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'check_in_time')
     AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'checked_in_at') THEN
    ALTER TABLE appointments RENAME COLUMN check_in_time TO checked_in_at;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'source')
     AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'booking_type') THEN
    ALTER TABLE appointments RENAME COLUMN source TO booking_type;
  END IF;
END $$;

-- 4C: Add new columns
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS start_time_new TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS refreshment_pref TEXT;

-- 4D: Normalize booking_type
UPDATE appointments SET booking_type = 'walk_in' WHERE booking_type IS NULL;
ALTER TABLE appointments ALTER COLUMN booking_type SET DEFAULT 'walk_in';

-- 4E: Drop obsolete columns
DO $$ BEGIN ALTER TABLE appointments DROP COLUMN IF EXISTS price; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments DROP COLUMN IF EXISTS pending_at; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments DROP COLUMN IF EXISTS confirmed_at; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments DROP COLUMN IF EXISTS missed_at; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments DROP COLUMN IF EXISTS lobby_at; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments DROP COLUMN IF EXISTS serving_at; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments DROP COLUMN IF EXISTS cancelled_at; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments DROP COLUMN IF EXISTS cancel_reason; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments DROP COLUMN IF EXISTS updated_at; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments DROP COLUMN IF EXISTS end_time; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments DROP COLUMN IF EXISTS payment_method; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments DROP COLUMN IF EXISTS cashier_id; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments DROP COLUMN IF EXISTS extras_amount; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments DROP COLUMN IF EXISTS discount_amount; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments DROP COLUMN IF EXISTS discount_type; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments DROP COLUMN IF EXISTS is_priority; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments DROP COLUMN IF EXISTS discount_reason; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments DROP COLUMN IF EXISTS completed_at; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments DROP COLUMN IF EXISTS refreshment_choice; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments DROP COLUMN IF EXISTS online_booking_id; EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- 4F: Replace CHECK constraint
DO $$ BEGIN
  ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check CHECK (status IN ('confirmed','waiting','serving','completed','cancelled','missed'));

-- ============================================================
-- STEP 5: Clean notifications table
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'target_user_id')
     AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'recipient_id') THEN
    ALTER TABLE notifications RENAME COLUMN target_user_id TO recipient_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'message')
     AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'body') THEN
    ALTER TABLE notifications RENAME COLUMN message TO body;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'online_booking_id')
     AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'reference_id') THEN
    ALTER TABLE notifications RENAME COLUMN online_booking_id TO reference_id;
  END IF;
END $$;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'system';

-- ============================================================
-- STEP 6: Clean scheduling tables
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'staff_schedules' AND column_name = 'staff_id')
     AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'staff_schedules' AND column_name = 'employee_id') THEN
    ALTER TABLE staff_schedules RENAME COLUMN staff_id TO employee_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'staff_id')
     AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'employee_id') THEN
    ALTER TABLE shifts RENAME COLUMN staff_id TO employee_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'time_off_requests' AND column_name = 'staff_id')
     AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'time_off_requests' AND column_name = 'employee_id') THEN
    ALTER TABLE time_off_requests RENAME COLUMN staff_id TO employee_id;
  END IF;
END $$;

DO $$ BEGIN ALTER TABLE shifts DROP COLUMN IF EXISTS appointment_count; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE shifts DROP COLUMN IF EXISTS confirmed_online_count; EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- ============================================================
-- STEP 7: Auto-trigger for status history
-- ============================================================
DROP TRIGGER IF EXISTS trg_log_appointment_status ON appointments;
DROP FUNCTION IF EXISTS log_appointment_status_change();

CREATE OR REPLACE FUNCTION log_appointment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO appointment_status_history (appointment_id, previous_status, new_status, changed_by, note)
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(NEW.checked_in_by, NEW.technician_id, NEW.customer_id),
      CASE WHEN NEW.status = 'cancelled' THEN 'Cancelled via admin panel' ELSE NULL END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_appointment_status
AFTER UPDATE OF status ON appointments
FOR EACH ROW EXECUTE FUNCTION log_appointment_status_change();

-- ============================================================
-- STEP 8: Drop old appointment counter trigger
-- ============================================================
DROP TRIGGER IF EXISTS trg_update_shift_appointment_count ON appointments;
DROP FUNCTION IF EXISTS update_shift_appointment_count();

-- ============================================================
-- STEP 9: RLS policies
-- ============================================================
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read appointments" ON appointments;
DROP POLICY IF EXISTS "Allow anon insert appointments" ON appointments;
DROP POLICY IF EXISTS "Allow authenticated update appointments" ON appointments;
DROP POLICY IF EXISTS "Allow authenticated delete appointments" ON appointments;
CREATE POLICY "Allow anon read appointments" ON appointments FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert appointments" ON appointments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow authenticated update appointments" ON appointments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete appointments" ON appointments FOR DELETE TO authenticated USING (true);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read payment_transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Allow anon insert payment_transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Allow authenticated manage payment_transactions" ON payment_transactions;
CREATE POLICY "Allow anon read payment_transactions" ON payment_transactions FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert payment_transactions" ON payment_transactions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow authenticated manage payment_transactions" ON payment_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE appointment_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read appointment_status_history" ON appointment_status_history;
DROP POLICY IF EXISTS "Allow authenticated insert appointment_status_history" ON appointment_status_history;
CREATE POLICY "Allow anon read appointment_status_history" ON appointment_status_history FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated insert appointment_status_history" ON appointment_status_history FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read inventory_logs" ON inventory_logs;
DROP POLICY IF EXISTS "Allow authenticated manage inventory_logs" ON inventory_logs;
CREATE POLICY "Allow anon read inventory_logs" ON inventory_logs FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated manage inventory_logs" ON inventory_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read inventory" ON inventory;
CREATE POLICY "Allow anon read inventory" ON inventory FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow authenticated manage inventory" ON inventory;
CREATE POLICY "Allow authenticated manage inventory" ON inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read profiles" ON profiles;
CREATE POLICY "Allow anon read profiles" ON profiles FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow anon insert profiles" ON profiles;
CREATE POLICY "Allow anon insert profiles" ON profiles FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated update profiles" ON profiles;
CREATE POLICY "Allow authenticated update profiles" ON profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read services" ON services;
CREATE POLICY "Allow anon read services" ON services FOR SELECT TO anon USING (true);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read notifications" ON notifications;
CREATE POLICY "Allow anon read notifications" ON notifications FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow anon insert notifications" ON notifications;
CREATE POLICY "Allow anon insert notifications" ON notifications FOR INSERT TO anon WITH CHECK (true);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff manage own shifts" ON shifts;
DROP POLICY IF EXISTS "Admins manage staff shifts" ON shifts;
DROP POLICY IF EXISTS "Allow anon read shifts" ON shifts;
DROP POLICY IF EXISTS "Allow authenticated manage shifts" ON shifts;
CREATE POLICY "Allow anon read shifts" ON shifts FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated manage shifts" ON shifts FOR ALL TO authenticated USING (true);

ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff manage own schedules" ON staff_schedules;
DROP POLICY IF EXISTS "Admins manage staff schedules" ON staff_schedules;
DROP POLICY IF EXISTS "Allow anon read staff_schedules" ON staff_schedules;
DROP POLICY IF EXISTS "Allow authenticated manage staff_schedules" ON staff_schedules;
CREATE POLICY "Allow anon read staff_schedules" ON staff_schedules FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated manage staff_schedules" ON staff_schedules FOR ALL TO authenticated USING (true);

ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff manage own time off" ON time_off_requests;
DROP POLICY IF EXISTS "Admins view all time off" ON time_off_requests;
DROP POLICY IF EXISTS "Admins manage time off" ON time_off_requests;
DROP POLICY IF EXISTS "Allow anon read time_off_requests" ON time_off_requests;
DROP POLICY IF EXISTS "Allow authenticated manage time_off_requests" ON time_off_requests;
CREATE POLICY "Allow anon read time_off_requests" ON time_off_requests FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated manage time_off_requests" ON time_off_requests FOR ALL TO authenticated USING (true);

-- ============================================================
-- STEP 10: Seed inventory with refreshment items (if empty)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM inventory WHERE category = 'refreshment' LIMIT 1) THEN
    INSERT INTO inventory (item_name, category, quantity, unit)
    VALUES 
      ('Water', 'refreshment', 100, 'bottle'),
      ('Green Tea', 'refreshment', 50, 'cup'),
      ('Coffee', 'refreshment', 30, 'cup');
  END IF;
END $$;

-- ============================================================
-- DONE
-- ============================================================
