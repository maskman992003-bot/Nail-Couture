-- 009: Fix trigger - DECLARE cannot appear inside ELSIF blocks
-- Move all variables to the function-level DECLARE block

DROP TRIGGER IF EXISTS trg_update_shift_appointment_count ON appointments;
DROP FUNCTION IF EXISTS update_shift_appointment_count();

CREATE OR REPLACE FUNCTION update_shift_appointment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.scheduled_time::date, NEW.check_in_time::date) IS NULL THEN RETURN NEW; END IF;

    IF COALESCE(NEW.source, 'walk_in') = 'online' THEN
      UPDATE shifts
      SET confirmed_online_count = confirmed_online_count + 1, updated_at = NOW()
      WHERE staff_id = NEW.technician_id
        AND shift_date = COALESCE(NEW.scheduled_time::date, NEW.check_in_time::date);
    ELSE
      UPDATE shifts
      SET appointment_count = appointment_count + 1, updated_at = NOW()
      WHERE staff_id = NEW.technician_id
        AND shift_date = COALESCE(NEW.scheduled_time::date, NEW.check_in_time::date);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(OLD.scheduled_time::date, OLD.check_in_time::date) IS NOT NULL
       AND OLD.status IN ('waiting', 'assigned_pending', 'serving') THEN
      IF COALESCE(OLD.source, 'walk_in') = 'online' THEN
        UPDATE shifts SET confirmed_online_count = GREATEST(confirmed_online_count - 1, 0), updated_at = NOW()
        WHERE staff_id = OLD.technician_id
          AND shift_date = COALESCE(OLD.scheduled_time::date, OLD.check_in_time::date);
      ELSE
        UPDATE shifts SET appointment_count = GREATEST(appointment_count - 1, 0), updated_at = NOW()
        WHERE staff_id = OLD.technician_id
          AND shift_date = COALESCE(OLD.scheduled_time::date, OLD.check_in_time::date);
      END IF;
    END IF;

    IF COALESCE(NEW.scheduled_time::date, NEW.check_in_time::date) IS NOT NULL
       AND NEW.status IN ('waiting', 'assigned_pending', 'serving') THEN
      IF COALESCE(NEW.source, 'walk_in') = 'online' THEN
        UPDATE shifts SET confirmed_online_count = confirmed_online_count + 1, updated_at = NOW()
        WHERE staff_id = NEW.technician_id
          AND shift_date = COALESCE(NEW.scheduled_time::date, NEW.check_in_time::date);
      ELSE
        UPDATE shifts SET appointment_count = appointment_count + 1, updated_at = NOW()
        WHERE staff_id = NEW.technician_id
          AND shift_date = COALESCE(NEW.scheduled_time::date, NEW.check_in_time::date);
      END IF;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF COALESCE(OLD.scheduled_time::date, OLD.check_in_time::date) IS NOT NULL
       AND OLD.status IN ('waiting', 'assigned_pending', 'serving') THEN
      IF COALESCE(OLD.source, 'walk_in') = 'online' THEN
        UPDATE shifts SET confirmed_online_count = GREATEST(confirmed_online_count - 1, 0), updated_at = NOW()
        WHERE staff_id = OLD.technician_id
          AND shift_date = COALESCE(OLD.scheduled_time::date, OLD.check_in_time::date);
      ELSE
        UPDATE shifts SET appointment_count = GREATEST(appointment_count - 1, 0), updated_at = NOW()
        WHERE staff_id = OLD.technician_id
          AND shift_date = COALESCE(OLD.scheduled_time::date, OLD.check_in_time::date);
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_shift_appointment_count
AFTER INSERT OR UPDATE OR DELETE ON appointments
FOR EACH ROW EXECUTE FUNCTION update_shift_appointment_count();