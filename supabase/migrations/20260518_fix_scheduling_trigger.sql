-- Fix staff scheduling trigger and add missing RPCs

-- 1. Add confirmed_online_count column to shifts
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS confirmed_online_count INTEGER NOT NULL DEFAULT 0;

-- 2. Recreate the trigger function to use scheduled_time (not CURRENT_DATE) and track both walk-in and online
CREATE OR REPLACE FUNCTION update_shift_appointment_count()
RETURNS TRIGGER AS $$
DECLARE
  v_shift_date DATE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_shift_date := COALESCE(NEW.scheduled_time::date, NEW.check_in_time::date);
    IF v_shift_date IS NULL THEN RETURN NEW; END IF;
    IF NEW.source = 'online' THEN
      UPDATE shifts
      SET confirmed_online_count = confirmed_online_count + 1,
          updated_at = NOW()
      WHERE staff_id = NEW.technician_id AND shift_date = v_shift_date;
    ELSE
      UPDATE shifts
      SET appointment_count = appointment_count + 1,
          updated_at = NOW()
      WHERE staff_id = NEW.technician_id AND shift_date = v_shift_date;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.technician_id IS DISTINCT FROM NEW.technician_id OR
       OLD.status IS DISTINCT FROM NEW.status OR
       OLD.scheduled_time IS DISTINCT FROM NEW.scheduled_time OR
       OLD.source IS DISTINCT FROM NEW.source THEN

      DECLARE
        v_old_date DATE := COALESCE(OLD.scheduled_time::date, OLD.check_in_time::date);
        v_new_date DATE := COALESCE(NEW.scheduled_time::date, NEW.check_in_time::date);
        v_old_active BOOLEAN := OLD.status IN ('waiting', 'assigned_pending', 'serving');
        v_new_active BOOLEAN := NEW.status IN ('waiting', 'assigned_pending', 'serving');
      BEGIN
        IF v_old_date IS NOT NULL AND v_old_active THEN
          IF OLD.source = 'online' THEN
            UPDATE shifts SET confirmed_online_count = GREATEST(confirmed_online_count - 1, 0),
                             updated_at = NOW()
            WHERE staff_id = OLD.technician_id AND shift_date = v_old_date;
          ELSE
            UPDATE shifts SET appointment_count = GREATEST(appointment_count - 1, 0),
                             updated_at = NOW()
            WHERE staff_id = OLD.technician_id AND shift_date = v_old_date;
          END IF;
        END IF;

        IF v_new_date IS NOT NULL AND v_new_active THEN
          IF NEW.source = 'online' THEN
            UPDATE shifts SET confirmed_online_count = confirmed_online_count + 1,
                             updated_at = NOW()
            WHERE staff_id = NEW.technician_id AND shift_date = v_new_date;
          ELSE
            UPDATE shifts SET appointment_count = appointment_count + 1,
                             updated_at = NOW()
            WHERE staff_id = NEW.technician_id AND shift_date = v_new_date;
          END IF;
        END IF;
      END;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    DECLARE
      v_del_date DATE := COALESCE(OLD.scheduled_time::date, OLD.check_in_time::date);
      v_del_active BOOLEAN := OLD.status IN ('waiting', 'assigned_pending', 'serving');
    BEGIN
      IF v_del_date IS NOT NULL AND v_del_active THEN
        IF OLD.source = 'online' THEN
          UPDATE shifts SET confirmed_online_count = GREATEST(confirmed_online_count - 1, 0),
                           updated_at = NOW()
          WHERE staff_id = OLD.technician_id AND shift_date = v_del_date;
        ELSE
          UPDATE shifts SET appointment_count = GREATEST(appointment_count - 1, 0),
                           updated_at = NOW()
          WHERE staff_id = OLD.technician_id AND shift_date = v_del_date;
        END IF;
      END IF;
    END;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Update get_staff_schedule to return confirmed_online_count
CREATE OR REPLACE FUNCTION get_staff_schedule(
  p_start_date DATE,
  p_end_date DATE,
  p_staff_id UUID DEFAULT NULL
)
RETURNS TABLE (
  shift_id UUID,
  staff_id UUID,
  staff_name TEXT,
  shift_date DATE,
  shift_type TEXT,
  start_time TIME,
  end_time TIME,
  appointment_count INTEGER,
  confirmed_online_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.staff_id,
    COALESCE(p.full_name, 'Unknown'),
    s.shift_date,
    s.shift_type,
    s.start_time,
    s.end_time,
    s.appointment_count,
    s.confirmed_online_count
  FROM shifts s
  LEFT JOIN profiles p ON p.id = s.staff_id
  WHERE s.shift_date BETWEEN p_start_date AND p_end_date
    AND (p_staff_id IS NULL OR s.staff_id = p_staff_id)
  ORDER BY s.staff_id, s.shift_date, s.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: get_technician_appointments - returns all appointments for a technician in a date range
CREATE OR REPLACE FUNCTION get_technician_appointments(
  p_staff_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  appointment_id UUID,
  customer_name TEXT,
  service_name TEXT,
  appointment_time TIMESTAMPTZ,
  status TEXT,
  source TEXT,
  final_price NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    COALESCE(p.full_name, 'Guest'),
    COALESCE(s.name, 'Service'),
    COALESCE(a.scheduled_time, a.check_in_time),
    a.status,
    COALESCE(a.source, 'walk_in'),
    COALESCE(a.final_price, a.price, 0)
  FROM appointments a
  LEFT JOIN profiles p ON p.id = a.profile_id
  LEFT JOIN services s ON s.id = a.service_id
  WHERE a.technician_id = p_staff_id
    AND COALESCE(a.scheduled_time::date, a.check_in_time::date) BETWEEN p_start_date AND p_end_date
  ORDER BY COALESCE(a.scheduled_time, a.check_in_time);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: get_available_technicians - returns technicians working at a given date/time
CREATE OR REPLACE FUNCTION get_available_technicians(
  p_date DATE,
  p_time TEXT
)
RETURNS TABLE (
  staff_id UUID,
  staff_name TEXT,
  shift_type TEXT,
  start_time TIME,
  end_time TIME
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (s.staff_id)
    s.staff_id,
    COALESCE(p.full_name, 'Unknown'),
    s.shift_type,
    s.start_time,
    s.end_time
  FROM shifts s
  LEFT JOIN profiles p ON p.id = s.staff_id
  WHERE s.shift_date = p_date
    AND p.role = 'technician'
    AND s.start_time <= p_time::TIME
    AND s.end_time >= p_time::TIME
  ORDER BY s.staff_id, s.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: get_customer_appointments
CREATE OR REPLACE FUNCTION get_customer_appointments(p_profile_id UUID)
RETURNS TABLE (
  appointment_id UUID,
  service_name TEXT,
  technician_name TEXT,
  appointment_time TIMESTAMPTZ,
  status TEXT,
  source TEXT,
  final_price NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    COALESCE(s.name, 'Service'),
    COALESCE(p.full_name, 'Unknown'),
    COALESCE(a.scheduled_time, a.check_in_time),
    a.status,
    COALESCE(a.source, 'walk_in'),
    COALESCE(a.final_price, a.price, 0)
  FROM appointments a
  LEFT JOIN services s ON s.id = a.service_id
  LEFT JOIN profiles p ON p.id = a.technician_id
  WHERE a.profile_id = p_profile_id
  ORDER BY COALESCE(a.scheduled_time, a.check_in_time) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Drop old broken trigger and re-create
DROP TRIGGER IF EXISTS trg_update_shift_appointment_count ON appointments;
CREATE TRIGGER trg_update_shift_appointment_count
AFTER INSERT OR UPDATE OR DELETE ON appointments
FOR EACH ROW EXECUTE FUNCTION update_shift_appointment_count();