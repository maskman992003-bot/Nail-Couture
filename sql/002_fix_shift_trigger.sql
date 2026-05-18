-- 002: Fix the shift appointment count trigger
-- Replaces the broken trigger that used CURRENT_DATE with one that uses the appointment's scheduled_time
-- Tracks walk-in appointments (appointment_count) and online bookings (confirmed_online_count) separately

-- Drop old trigger and function
DROP TRIGGER IF EXISTS trg_update_shift_appointment_count ON appointments;
DROP FUNCTION IF EXISTS update_shift_appointment_count();

-- Create the fixed trigger function
CREATE OR REPLACE FUNCTION update_shift_appointment_count()
RETURNS TRIGGER AS $$
DECLARE
  v_shift_date DATE;
BEGIN
  -- INSERT: increment the appropriate counter based on source
  IF TG_OP = 'INSERT' THEN
    v_shift_date := COALESCE(NEW.scheduled_time::date, NEW.check_in_time::date);
    IF v_shift_date IS NULL THEN RETURN NEW; END IF;

    IF COALESCE(NEW.source, 'walk_in') = 'online' THEN
      UPDATE shifts
      SET confirmed_online_count = confirmed_online_count + 1,
          updated_at = NOW()
      WHERE staff_id = NEW.technician_id
        AND shift_date = v_shift_date;
    ELSE
      UPDATE shifts
      SET appointment_count = appointment_count + 1,
          updated_at = NOW()
      WHERE staff_id = NEW.technician_id
        AND shift_date = v_shift_date;
    END IF;
    RETURN NEW;

  -- UPDATE: decrement old count, increment new count if status still active
  ELSIF TG_OP = 'UPDATE' THEN
    DECLARE
      v_old_date DATE := COALESCE(OLD.scheduled_time::date, OLD.check_in_time::date);
      v_new_date DATE := COALESCE(NEW.scheduled_time::date, NEW.check_in_time::date);
      v_old_active BOOLEAN := OLD.status IN ('waiting', 'assigned_pending', 'serving');
      v_new_active BOOLEAN := NEW.status IN ('waiting', 'assigned_pending', 'serving');
    BEGIN
      -- Decrement old shift counts if the old booking was active
      IF v_old_date IS NOT NULL AND v_old_active THEN
        IF COALESCE(OLD.source, 'walk_in') = 'online' THEN
          UPDATE shifts
          SET confirmed_online_count = GREATEST(confirmed_online_count - 1, 0),
              updated_at = NOW()
          WHERE staff_id = OLD.technician_id
            AND shift_date = v_old_date;
        ELSE
          UPDATE shifts
          SET appointment_count = GREATEST(appointment_count - 1, 0),
              updated_at = NOW()
          WHERE staff_id = OLD.technician_id
            AND shift_date = v_old_date;
        END IF;
      END IF;

      -- Increment new shift counts if the new booking is active
      IF v_new_date IS NOT NULL AND v_new_active THEN
        IF COALESCE(NEW.source, 'walk_in') = 'online' THEN
          UPDATE shifts
          SET confirmed_online_count = confirmed_online_count + 1,
              updated_at = NOW()
          WHERE staff_id = NEW.technician_id
            AND shift_date = v_new_date;
        ELSE
          UPDATE shifts
          SET appointment_count = appointment_count + 1,
              updated_at = NOW()
          WHERE staff_id = NEW.technician_id
            AND shift_date = v_new_date;
        END IF;
      END IF;
    END;
    RETURN NEW;

  -- DELETE: decrement the appropriate counter
  ELSIF TG_OP = 'DELETE' THEN
    DECLARE
      v_del_date DATE := COALESCE(OLD.scheduled_time::date, OLD.check_in_time::date);
      v_del_active BOOLEAN := OLD.status IN ('waiting', 'assigned_pending', 'serving');
    BEGIN
      IF v_del_date IS NOT NULL AND v_del_active THEN
        IF COALESCE(OLD.source, 'walk_in') = 'online' THEN
          UPDATE shifts
          SET confirmed_online_count = GREATEST(confirmed_online_count - 1, 0),
              updated_at = NOW()
          WHERE staff_id = OLD.technician_id
            AND shift_date = v_del_date;
        ELSE
          UPDATE shifts
          SET appointment_count = GREATEST(appointment_count - 1, 0),
              updated_at = NOW()
          WHERE staff_id = OLD.technician_id
            AND shift_date = v_del_date;
        END IF;
      END IF;
    END;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger on the appointments table
CREATE TRIGGER trg_update_shift_appointment_count
AFTER INSERT OR UPDATE OR DELETE ON appointments
FOR EACH ROW EXECUTE FUNCTION update_shift_appointment_count();