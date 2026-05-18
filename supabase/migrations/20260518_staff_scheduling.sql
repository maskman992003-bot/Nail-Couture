-- Staff Scheduling & Shift Management
-- Creates: staff_schedules, shifts, time_off_requests tables + RPC functions

-- 1. staff_schedules: weekly recurring schedule templates per staff member
CREATE TABLE IF NOT EXISTS staff_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  shift_type TEXT NOT NULL CHECK (shift_type IN ('morning', 'afternoon', 'evening', 'custom')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, day_of_week, shift_type)
);

-- 2. shifts: individual shift instances (one per staff per day)
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('morning', 'afternoon', 'evening', 'custom')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  appointment_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, shift_date, shift_type)
);

-- 3. time_off_requests: PTO/time-off with approval workflow
CREATE TABLE IF NOT EXISTS time_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update appointment_count on shifts table when appointments change
CREATE OR REPLACE FUNCTION update_shift_appointment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE shifts
    SET appointment_count = appointment_count + 1,
        updated_at = NOW()
    WHERE staff_id = NEW.technician_id
      AND shift_date = CURRENT_DATE;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.technician_id IS DISTINCT FROM NEW.technician_id OR OLD.status IS DISTINCT FROM NEW.status THEN
      IF OLD.technician_id IS NOT NULL AND OLD.status IN ('waiting', 'assigned_pending', 'serving') THEN
        UPDATE shifts
        SET appointment_count = GREATEST(appointment_count - 1, 0),
            updated_at = NOW()
        WHERE staff_id = OLD.technician_id
          AND shift_date = CURRENT_DATE;
      END IF;
      IF NEW.technician_id IS NOT NULL AND NEW.status IN ('waiting', 'assigned_pending', 'serving') THEN
        UPDATE shifts
        SET appointment_count = appointment_count + 1,
            updated_at = NOW()
        WHERE staff_id = NEW.technician_id
          AND shift_date = CURRENT_DATE;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.technician_id IS NOT NULL AND OLD.status IN ('waiting', 'assigned_pending', 'serving') THEN
      UPDATE shifts
      SET appointment_count = GREATEST(appointment_count - 1, 0),
          updated_at = NOW()
      WHERE staff_id = OLD.technician_id
        AND shift_date = CURRENT_DATE;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_update_shift_appointment_count
AFTER INSERT OR UPDATE OR DELETE ON appointments
FOR EACH ROW EXECUTE FUNCTION update_shift_appointment_count();

-- Trigger to auto-set updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_staff_schedules_updated
BEFORE UPDATE ON staff_schedules
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_shifts_updated
BEFORE UPDATE ON shifts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_time_off_requests_updated
BEFORE UPDATE ON time_off_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. RPC: create_shift
CREATE OR REPLACE FUNCTION create_shift(
  p_staff_id UUID,
  p_shift_date DATE,
  p_shift_type TEXT,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO shifts (staff_id, shift_date, shift_type, start_time, end_time)
  VALUES (p_staff_id, p_shift_date, p_shift_type, p_start_time, p_end_time)
  ON CONFLICT (staff_id, shift_date, shift_type)
  DO UPDATE SET shift_type = EXCLUDED.shift_type,
                start_time = EXCLUDED.start_time,
                end_time = EXCLUDED.end_time,
                updated_at = NOW()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: delete_shift
CREATE OR REPLACE FUNCTION delete_shift(p_shift_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM shifts WHERE id = p_shift_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: create_time_off_request
CREATE OR REPLACE FUNCTION create_time_off_request(
  p_staff_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO time_off_requests (staff_id, start_date, end_date, reason)
  VALUES (p_staff_id, p_start_date, p_end_date, p_reason)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: review_time_off_request
CREATE OR REPLACE FUNCTION review_time_off_request(
  p_request_id UUID,
  p_status TEXT,
  p_reviewed_by UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE time_off_requests
  SET status = p_status,
      reviewed_by = p_reviewed_by,
      reviewed_at = NOW()
  WHERE id = p_request_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC: get_staff_schedule (returns shifts for a week, with appointment counts and time-off)
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
  appointment_count INTEGER
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
    s.appointment_count
  FROM shifts s
  LEFT JOIN profiles p ON p.id = s.staff_id
  WHERE s.shift_date BETWEEN p_start_date AND p_end_date
    AND (p_staff_id IS NULL OR s.staff_id = p_staff_id)
  ORDER BY s.staff_id, s.shift_date, s.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPC: get_time_off_requests
CREATE OR REPLACE FUNCTION get_time_off_requests(
  p_status TEXT DEFAULT NULL,
  p_staff_id UUID DEFAULT NULL
)
RETURNS TABLE (
  request_id UUID,
  staff_id UUID,
  staff_name TEXT,
  start_date DATE,
  end_date DATE,
  reason TEXT,
  status TEXT,
  reviewed_by UUID,
  reviewer_name TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tor.id,
    tor.staff_id,
    COALESCE(p.full_name, 'Unknown'),
    tor.start_date,
    tor.end_date,
    tor.reason,
    tor.status,
    tor.reviewed_by,
    COALESCE(r.full_name, ''),
    tor.reviewed_at,
    tor.created_at
  FROM time_off_requests tor
  LEFT JOIN profiles p ON p.id = tor.staff_id
  LEFT JOIN profiles r ON r.id = tor.reviewed_by
  WHERE (p_status IS NULL OR tor.status = p_status)
    AND (p_staff_id IS NULL OR tor.staff_id = p_staff_id)
  ORDER BY tor.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RPC: upsert_weekly_schedule (bulk create/update weekly templates)
CREATE OR REPLACE FUNCTION upsert_weekly_schedule(
  p_staff_id UUID,
  p_schedules JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  schedule_item JSONB;
BEGIN
  FOR schedule_item IN SELECT * FROM jsonb_array_elements(p_schedules)
  LOOP
    INSERT INTO staff_schedules (staff_id, day_of_week, shift_type, start_time, end_time)
    VALUES (
      p_staff_id,
      (schedule_item->>'day_of_week')::INTEGER,
      schedule_item->>'shift_type',
      (schedule_item->>'start_time')::TIME,
      (schedule_item->>'end_time')::TIME
    )
    ON CONFLICT (staff_id, day_of_week, shift_type)
    DO UPDATE SET start_time = EXCLUDED.start_time,
                  end_time = EXCLUDED.end_time,
                  is_active = TRUE,
                  updated_at = NOW();
  END LOOP;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. RPC: get_weekly_schedule
CREATE OR REPLACE FUNCTION get_weekly_schedule(p_staff_id UUID DEFAULT NULL)
RETURNS TABLE (
  schedule_id UUID,
  staff_id UUID,
  staff_name TEXT,
  day_of_week INTEGER,
  shift_type TEXT,
  start_time TIME,
  end_time TIME,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ss.id,
    ss.staff_id,
    COALESCE(p.full_name, 'Unknown'),
    ss.day_of_week,
    ss.shift_type,
    ss.start_time,
    ss.end_time,
    ss.is_active
  FROM staff_schedules ss
  LEFT JOIN profiles p ON p.id = ss.staff_id
  WHERE (p_staff_id IS NULL OR ss.staff_id = p_staff_id)
    AND ss.is_active = TRUE
  ORDER BY ss.staff_id, ss.day_of_week, ss.shift_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;

-- Staff can manage their own schedules
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff manage own schedules' AND tablename = 'staff_schedules') THEN
    CREATE POLICY "Staff manage own schedules" ON staff_schedules FOR ALL USING (auth.uid() = staff_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff manage own shifts' AND tablename = 'shifts') THEN
    CREATE POLICY "Staff manage own shifts" ON shifts FOR ALL USING (auth.uid() = staff_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff manage own time off' AND tablename = 'time_off_requests') THEN
    CREATE POLICY "Staff manage own time off" ON time_off_requests FOR ALL USING (auth.uid() = staff_id);
  END IF;
END $$;

-- Admins can manage staff under them
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage staff schedules' AND tablename = 'staff_schedules') THEN
    CREATE POLICY "Admins manage staff schedules" ON staff_schedules FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'owner', 'partner', 'admin'))
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage staff shifts' AND tablename = 'shifts') THEN
    CREATE POLICY "Admins manage staff shifts" ON shifts FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'owner', 'partner', 'admin'))
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins view all time off' AND tablename = 'time_off_requests') THEN
    CREATE POLICY "Admins view all time off" ON time_off_requests FOR SELECT USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'owner', 'partner', 'admin'))
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage time off' AND tablename = 'time_off_requests') THEN
    CREATE POLICY "Admins manage time off" ON time_off_requests FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'owner', 'partner', 'admin'))
    );
  END IF;
END $$;