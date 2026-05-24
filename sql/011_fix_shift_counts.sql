-- 011: Fix shift counts - add back missing columns and trigger

-- Add back the missing columns to shifts table
DO $$ BEGIN
    ALTER TABLE shifts ADD COLUMN IF NOT EXISTS appointment_count INTEGER NOT NULL DEFAULT 0;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE shifts ADD COLUMN IF NOT EXISTS confirmed_online_count INTEGER NOT NULL DEFAULT 0;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS trg_update_shift_appointment_count ON appointments;
DROP FUNCTION IF EXISTS update_shift_appointment_count();

-- Create the fixed trigger function
CREATE OR REPLACE FUNCTION update_shift_appointment_count()
RETURNS TRIGGER AS $$
DECLARE
    v_appointment_date DATE;
    v_source TEXT;
    v_technician_id UUID;
BEGIN
    -- Get the appointment date (use scheduled_at or fall back to checked_in_at)
    v_appointment_date := COALESCE(NEW.scheduled_at::date, NEW.checked_in_at::date);
    v_source := COALESCE(NEW.booking_type, 'walk_in');
    v_technician_id := NEW.technician_id;

    IF TG_OP = 'INSERT' THEN
        IF v_appointment_date IS NULL THEN RETURN NEW; END IF;

        -- If technician is assigned, update that specific technician's shifts
        IF v_technician_id IS NOT NULL THEN
            IF v_source = 'online' THEN
                UPDATE shifts
                SET confirmed_online_count = confirmed_online_count + 1, updated_at = NOW()
                WHERE employee_id = v_technician_id AND shift_date = v_appointment_date;
            ELSE
                UPDATE shifts
                SET appointment_count = appointment_count + 1, updated_at = NOW()
                WHERE employee_id = v_technician_id AND shift_date = v_appointment_date;
            END IF;
        ELSE
            -- No technician assigned - count as available/general appointment
            -- This makes unassigned appointments visible in the schedule
            IF v_source = 'online' THEN
                UPDATE shifts
                SET confirmed_online_count = confirmed_online_count + 1, updated_at = NOW()
                WHERE shift_date = v_appointment_date;
            ELSE
                UPDATE shifts
                SET appointment_count = appointment_count + 1, updated_at = NOW()
                WHERE shift_date = v_appointment_date;
            END IF;
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle decrementing old values
        IF COALESCE(OLD.scheduled_at::date, OLD.checked_in_at::date) IS NOT NULL
           AND OLD.status IN ('waiting', 'confirmed', 'serving') THEN
            DECLARE
                v_old_date DATE := COALESCE(OLD.scheduled_at::date, OLD.checked_in_at::date);
                v_old_source TEXT := COALESCE(OLD.booking_type, 'walk_in');
                v_old_technician_id UUID := OLD.technician_id;
            BEGIN
                IF v_old_technician_id IS NOT NULL THEN
                    IF v_old_source = 'online' THEN
                        UPDATE shifts
                        SET confirmed_online_count = GREATEST(confirmed_online_count - 1, 0), updated_at = NOW()
                        WHERE employee_id = v_old_technician_id AND shift_date = v_old_date;
                    ELSE
                        UPDATE shifts
                        SET appointment_count = GREATEST(appointment_count - 1, 0), updated_at = NOW()
                        WHERE employee_id = v_old_technician_id AND shift_date = v_old_date;
                    END IF;
                ELSE
                    IF v_old_source = 'online' THEN
                        UPDATE shifts
                        SET confirmed_online_count = GREATEST(confirmed_online_count - 1, 0), updated_at = NOW()
                        WHERE shift_date = v_old_date;
                    ELSE
                        UPDATE shifts
                        SET appointment_count = GREATEST(appointment_count - 1, 0), updated_at = NOW()
                        WHERE shift_date = v_old_date;
                    END IF;
                END IF;
            END;
        END IF;

        -- Handle incrementing new values
        IF v_appointment_date IS NOT NULL
           AND NEW.status IN ('waiting', 'confirmed', 'serving') THEN
            IF v_technician_id IS NOT NULL THEN
                IF v_source = 'online' THEN
                    UPDATE shifts
                    SET confirmed_online_count = confirmed_online_count + 1, updated_at = NOW()
                    WHERE employee_id = v_technician_id AND shift_date = v_appointment_date;
                ELSE
                    UPDATE shifts
                    SET appointment_count = appointment_count + 1, updated_at = NOW()
                    WHERE employee_id = v_technician_id AND shift_date = v_appointment_date;
                END IF;
            ELSE
                IF v_source = 'online' THEN
                    UPDATE shifts
                    SET confirmed_online_count = confirmed_online_count + 1, updated_at = NOW()
                    WHERE shift_date = v_appointment_date;
                ELSE
                    UPDATE shifts
                    SET appointment_count = appointment_count + 1, updated_at = NOW()
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
                        UPDATE shifts
                        SET confirmed_online_count = GREATEST(confirmed_online_count - 1, 0), updated_at = NOW()
                        WHERE employee_id = v_old_technician_id AND shift_date = v_old_date;
                    ELSE
                        UPDATE shifts
                        SET appointment_count = GREATEST(appointment_count - 1, 0), updated_at = NOW()
                        WHERE employee_id = v_old_technician_id AND shift_date = v_old_date;
                    END IF;
                ELSE
                    IF v_old_source = 'online' THEN
                        UPDATE shifts
                        SET confirmed_online_count = GREATEST(confirmed_online_count - 1, 0), updated_at = NOW()
                        WHERE shift_date = v_old_date;
                    ELSE
                        UPDATE shifts
                        SET appointment_count = GREATEST(appointment_count - 1, 0), updated_at = NOW()
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

-- Recreate the trigger
CREATE TRIGGER trg_update_shift_appointment_count
AFTER INSERT OR UPDATE OR DELETE ON appointments
FOR EACH ROW EXECUTE FUNCTION update_shift_appointment_count();

-- Backfill existing appointment counts
DO $$
DECLARE
    r RECORD;
BEGIN
    -- First, reset all counts to 0
    UPDATE shifts SET appointment_count = 0, confirmed_online_count = 0;
    
    -- Then, process each appointment
    FOR r IN
        SELECT a.id, 
               COALESCE(a.scheduled_at::date, a.checked_in_at::date) as apt_date,
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