-- ============================================================
-- 012: COMPREHENSIVE FIX — Run this after 010 and 011
-- Run once in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: Drop problematic triggers / functions with CASCADE
-- ============================================================
DROP TRIGGER IF EXISTS notify_on_shift_change ON shifts;
DROP FUNCTION IF EXISTS notify_on_shift_change() CASCADE;

-- Clean up any other orphaned triggers on appointments
DO $$
DECLARE
   r RECORD;
BEGIN
   FOR r IN (SELECT trigger_name FROM information_schema.triggers 
              WHERE event_object_table = 'appointments'
              AND trigger_name NOT IN ('trg_log_appointment_status', 'trg_update_shift_appointment_count')) LOOP
      EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON appointments CASCADE;';
   END LOOP;
END $$;

-- ============================================================
-- STEP 2: Ensure shifts table has required columns
-- ============================================================

-- Add updated_at if missing
DO $$ BEGIN
   ALTER TABLE shifts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add appointment_count and confirmed_online_count (if removed by 010)
DO $$ BEGIN
   ALTER TABLE shifts ADD COLUMN IF NOT EXISTS appointment_count INTEGER NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
   ALTER TABLE shifts ADD COLUMN IF NOT EXISTS confirmed_online_count INTEGER NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================
-- STEP 3: Fix appointments status CHECK constraint
-- ============================================================
-- Add 'assigned_pending' to allowed statuses (used by AdminLobby drag-drop flow)
DO $$ BEGIN
   ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check 
   CHECK (status IN ('confirmed','waiting','serving','completed','cancelled','missed','assigned_pending'));

-- ============================================================
-- STEP 4: Ensure start_time columns exist
-- ============================================================
-- start_time (old) might be missing after migration
DO $$ BEGIN
   ALTER TABLE appointments ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
   ALTER TABLE appointments ADD COLUMN IF NOT EXISTS start_time_new TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Copy any data from start_time to start_time_new if start_time_new is empty
UPDATE appointments SET start_time_new = start_time 
WHERE start_time IS NOT NULL AND start_time_new IS NULL;

-- ============================================================
-- STEP 5: Ensure checked_in_at column exists
-- ============================================================
-- Rename check_in_time to checked_in_at if still old name
DO $$ BEGIN
   IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_name = 'appointments' AND column_name = 'check_in_time')
      AND NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'appointments' AND column_name = 'checked_in_at') THEN
      ALTER TABLE appointments RENAME COLUMN check_in_time TO checked_in_at;
   END IF;
END $$;

DO $$ BEGIN
   ALTER TABLE appointments ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================
-- STEP 6: Ensure customer_id column exists
-- ============================================================
-- Rename profile_id to customer_id if still old name
DO $$ BEGIN
   IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_name = 'appointments' AND column_name = 'profile_id')
      AND NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'appointments' AND column_name = 'customer_id') THEN
      ALTER TABLE appointments RENAME COLUMN profile_id TO customer_id;
   END IF;
END $$;

-- ============================================================
-- STEP 7: Fix trigger for updating shift appointment counts
-- ============================================================
-- Drop and recreate to ensure it uses current column names
DROP TRIGGER IF EXISTS trg_update_shift_appointment_count ON appointments;
DROP FUNCTION IF EXISTS update_shift_appointment_count();

CREATE OR REPLACE FUNCTION update_shift_appointment_count()
RETURNS TRIGGER AS $$
DECLARE
    v_appointment_date DATE;
    v_source TEXT;
    v_technician_id UUID;
BEGIN
    v_appointment_date := COALESCE(NEW.scheduled_at::date, NEW.checked_in_at::date);
    v_source := COALESCE(NEW.booking_type, 'walk_in');
    v_technician_id := NEW.technician_id;

    IF TG_OP = 'INSERT' THEN
        IF v_appointment_date IS NULL THEN RETURN NEW; END IF;
        IF v_technician_id IS NOT NULL THEN
            IF v_source = 'online' THEN
                UPDATE shifts SET confirmed_online_count = confirmed_online_count + 1, updated_at = NOW()
                WHERE employee_id = v_technician_id AND shift_date = v_appointment_date;
            ELSE
                UPDATE shifts SET appointment_count = appointment_count + 1, updated_at = NOW()
                WHERE employee_id = v_technician_id AND shift_date = v_appointment_date;
            END IF;
        ELSE
            IF v_source = 'online' THEN
                UPDATE shifts SET confirmed_online_count = confirmed_online_count + 1, updated_at = NOW()
                WHERE shift_date = v_appointment_date;
            ELSE
                UPDATE shifts SET appointment_count = appointment_count + 1, updated_at = NOW()
                WHERE shift_date = v_appointment_date;
            END IF;
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        IF COALESCE(OLD.scheduled_at::date, OLD.checked_in_at::date) IS NOT NULL
           AND OLD.status IN ('waiting', 'confirmed', 'serving') THEN
            DECLARE
                v_old_date DATE := COALESCE(OLD.scheduled_at::date, OLD.checked_in_at::date);
                v_old_source TEXT := COALESCE(OLD.booking_type, 'walk_in');
                v_old_technician_id UUID := OLD.technician_id;
            BEGIN
                IF v_old_technician_id IS NOT NULL THEN
                    IF v_old_source = 'online' THEN
                        UPDATE shifts SET confirmed_online_count = GREATEST(confirmed_online_count - 1, 0), updated_at = NOW()
                        WHERE employee_id = v_old_technician_id AND shift_date = v_old_date;
                    ELSE
                        UPDATE shifts SET appointment_count = GREATEST(appointment_count - 1, 0), updated_at = NOW()
                        WHERE employee_id = v_old_technician_id AND shift_date = v_old_date;
                    END IF;
                ELSE
                    IF v_old_source = 'online' THEN
                        UPDATE shifts SET confirmed_online_count = GREATEST(confirmed_online_count - 1, 0), updated_at = NOW()
                        WHERE shift_date = v_old_date;
                    ELSE
                        UPDATE shifts SET appointment_count = GREATEST(appointment_count - 1, 0), updated_at = NOW()
                        WHERE shift_date = v_old_date;
                    END IF;
                END IF;
            END;
        END IF;
        IF v_appointment_date IS NOT NULL AND NEW.status IN ('waiting', 'confirmed', 'serving') THEN
            IF v_technician_id IS NOT NULL THEN
                IF v_source = 'online' THEN
                    UPDATE shifts SET confirmed_online_count = confirmed_online_count + 1, updated_at = NOW()
                    WHERE employee_id = v_technician_id AND shift_date = v_appointment_date;
                ELSE
                    UPDATE shifts SET appointment_count = appointment_count + 1, updated_at = NOW()
                    WHERE employee_id = v_technician_id AND shift_date = v_appointment_date;
                END IF;
            ELSE
                IF v_source = 'online' THEN
                    UPDATE shifts SET confirmed_online_count = confirmed_online_count + 1, updated_at = NOW()
                    WHERE shift_date = v_appointment_date;
                ELSE
                    UPDATE shifts SET appointment_count = appointment_count + 1, updated_at = NOW()
                    WHERE shift_date = v_appointment_date;
                END IF;
            END IF;
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        IF COALESCE(OLD.scheduled_at::date, OLD.checked_in_at::date) IS NOT NULL
           AND OLD.status IN ('waiting', 'confirmed', 'serving') THEN
            DECLARE
                v_old_date DATE := COALESCE(OLD.scheduled_at::date, OLD.checked_in_at::date);
                v_old_source TEXT := COALESCE(OLD.booking_type, 'walk_in');
                v_old_technician_id UUID := OLD.technician_id;
            BEGIN
                IF v_old_technician_id IS NOT NULL THEN
                    IF v_old_source = 'online' THEN
                        UPDATE shifts SET confirmed_online_count = GREATEST(confirmed_online_count - 1, 0), updated_at = NOW()
                        WHERE employee_id = v_old_technician_id AND shift_date = v_old_date;
                    ELSE
                        UPDATE shifts SET appointment_count = GREATEST(appointment_count - 1, 0), updated_at = NOW()
                        WHERE employee_id = v_old_technician_id AND shift_date = v_old_date;
                    END IF;
                ELSE
                    IF v_old_source = 'online' THEN
                        UPDATE shifts SET confirmed_online_count = GREATEST(confirmed_online_count - 1, 0), updated_at = NOW()
                        WHERE shift_date = v_old_date;
                    ELSE
                        UPDATE shifts SET appointment_count = GREATEST(appointment_count - 1, 0), updated_at = NOW()
                        WHERE shift_date = v_old_date;
                    END IF;
                END IF;
            END;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_shift_appointment_count
AFTER INSERT OR UPDATE OR DELETE ON appointments
FOR EACH ROW EXECUTE FUNCTION update_shift_appointment_count();

-- ============================================================
-- STEP 8: Backfill existing shift counts
-- ============================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    UPDATE shifts SET appointment_count = 0, confirmed_online_count = 0;
    FOR r IN
        SELECT COALESCE(a.scheduled_at::date, a.checked_in_at::date) as apt_date,
               COALESCE(a.booking_type, 'walk_in') as source,
               a.technician_id
        FROM appointments a
        WHERE a.status IN ('waiting', 'confirmed', 'serving')
          AND COALESCE(a.scheduled_at::date, a.checked_in_at::date) IS NOT NULL
    LOOP
        IF r.technician_id IS NOT NULL THEN
            IF r.source = 'online' THEN
                UPDATE shifts SET confirmed_online_count = confirmed_online_count + 1
                WHERE employee_id = r.technician_id AND shift_date = r.apt_date;
            ELSE
                UPDATE shifts SET appointment_count = appointment_count + 1
                WHERE employee_id = r.technician_id AND shift_date = r.apt_date;
            END IF;
        ELSE
            IF r.source = 'online' THEN
                UPDATE shifts SET confirmed_online_count = confirmed_online_count + 1
                WHERE shift_date = r.apt_date;
            ELSE
                UPDATE shifts SET appointment_count = appointment_count + 1
                WHERE shift_date = r.apt_date;
            END IF;
        END IF;
    END LOOP;
END $$;

-- ============================================================
-- STEP 9: Verify RLS policies allow access
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

-- Also ensure profiles are readable
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read profiles" ON profiles;
CREATE POLICY "Allow anon read profiles" ON profiles FOR SELECT TO anon USING (true);

-- ============================================================
-- DONE
-- ============================================================