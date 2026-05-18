-- 010: Fix trigger to count appointments even without technician assigned
-- When technician_id is NULL, count as "unassigned" (updates all shifts for that date)

DROP TRIGGER IF EXISTS trg_update_shift_appointment_count ON appointments;
DROP FUNCTION IF EXISTS update_shift_appointment_count();

CREATE OR REPLACE FUNCTION update_shift_appointment_count()
RETURNS TRIGGER AS $$
DECLARE
  v_appointment_date DATE;
  v_source TEXT;
BEGIN
  v_appointment_date := COALESCE(NEW.scheduled_time::date, NEW.check_in_time::date);
  v_source := COALESCE(NEW.source, 'walk_in');

  IF TG_OP = 'INSERT' THEN
    IF v_appointment_date IS NULL THEN RETURN NEW; END IF;

    -- If technician assigned, count for that specific tech
    IF NEW.technician_id IS NOT NULL THEN
      IF v_source = 'online' THEN
        UPDATE shifts
        SET confirmed_online_count = confirmed_online_count + 1, updated_at = NOW()
        WHERE staff_id = NEW.technician_id AND shift_date = v_appointment_date;
      ELSE
        UPDATE shifts
        SET appointment_count = appointment_count + 1, updated_at = NOW()
        WHERE staff_id = NEW.technician_id AND shift_date = v_appointment_date;
      END IF;
    ELSE
      -- No technician assigned - count as unassigned (count for ALL shifts that day)
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
    -- Handle old appointment
    IF COALESCE(OLD.scheduled_time::date, OLD.check_in_time::date) IS NOT NULL
       AND OLD.status IN ('waiting', 'assigned_pending', 'serving') THEN
      DECLARE
        v_old_date DATE := COALESCE(OLD.scheduled_time::date, OLD.check_in_time::date);
        v_old_source TEXT := COALESCE(OLD.source, 'walk_in');
      BEGIN
        IF OLD.technician_id IS NOT NULL THEN
          IF v_old_source = 'online' THEN
            UPDATE shifts SET confirmed_online_count = GREATEST(confirmed_online_count - 1, 0), updated_at = NOW()
            WHERE staff_id = OLD.technician_id AND shift_date = v_old_date;
          ELSE
            UPDATE shifts SET appointment_count = GREATEST(appointment_count - 1, 0), updated_at = NOW()
            WHERE staff_id = OLD.technician_id AND shift_date = v_old_date;
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

    -- Handle new appointment
    IF v_appointment_date IS NOT NULL
       AND NEW.status IN ('waiting', 'assigned_pending', 'serving') THEN
      IF NEW.technician_id IS NOT NULL THEN
        IF v_source = 'online' THEN
          UPDATE shifts SET confirmed_online_count = confirmed_online_count + 1, updated_at = NOW()
          WHERE staff_id = NEW.technician_id AND shift_date = v_appointment_date;
        ELSE
          UPDATE shifts SET appointment_count = appointment_count + 1, updated_at = NOW()
          WHERE staff_id = NEW.technician_id AND shift_date = v_appointment_date;
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
    IF COALESCE(OLD.scheduled_time::date, OLD.check_in_time::date) IS NOT NULL
       AND OLD.status IN ('waiting', 'assigned_pending', 'serving') THEN
      DECLARE
        v_old_date DATE := COALESCE(OLD.scheduled_time::date, OLD.check_in_time::date);
        v_old_source TEXT := COALESCE(OLD.source, 'walk_in');
      BEGIN
        IF OLD.technician_id IS NOT NULL THEN
          IF v_old_source = 'online' THEN
            UPDATE shifts SET confirmed_online_count = GREATEST(confirmed_online_count - 1, 0), updated_at = NOW()
            WHERE staff_id = OLD.technician_id AND shift_date = v_old_date;
          ELSE
            UPDATE shifts SET appointment_count = GREATEST(appointment_count - 1, 0), updated_at = NOW()
            WHERE staff_id = OLD.technician_id AND shift_date = v_old_date;
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

-- Backfill existing appointments to update shift counts
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT a.id, COALESCE(a.scheduled_time::date, a.check_in_time::date) as apt_date, 
           COALESCE(a.source, 'walk_in') as source, a.technician_id
    FROM appointments a
    WHERE a.status IN ('waiting', 'assigned_pending', 'serving')
      AND COALESCE(a.scheduled_time::date, a.check_in_time::date) IS NOT NULL
  LOOP
    IF r.technician_id IS NOT NULL THEN
      IF r.source = 'online' THEN
        UPDATE shifts SET confirmed_online_count = confirmed_online_count + 1
        WHERE staff_id = r.technician_id AND shift_date = r.apt_date;
      ELSE
        UPDATE shifts SET appointment_count = appointment_count + 1
        WHERE staff_id = r.technician_id AND shift_date = r.apt_date;
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