-- Migration 125: Cumulative Effort load-balancing dispatcher
-- Salon local timezone default: America/Chicago (IANA)
-- Run after sql/124_gift_card_expiry_six_months.sql

-- ============================================================
-- 1) Service weights + points
-- ============================================================
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS time_weight SMALLINT NOT NULL DEFAULT 3
    CHECK (time_weight BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS effort_weight SMALLINT NOT NULL DEFAULT 3
    CHECK (effort_weight BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS price_weight SMALLINT NOT NULL DEFAULT 3
    CHECK (price_weight BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 3;

UPDATE services SET
  time_weight = 3,
  effort_weight = 3,
  price_weight = 3
WHERE time_weight IS NULL OR effort_weight IS NULL OR price_weight IS NULL;

CREATE OR REPLACE FUNCTION calculate_service_points(
  p_time_weight SMALLINT,
  p_effort_weight SMALLINT,
  p_price_weight SMALLINT
)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ROUND(
    (p_time_weight * 0.4) + (p_effort_weight * 0.4) + (p_price_weight * 0.2)
  )::INTEGER;
$$;

CREATE OR REPLACE FUNCTION trg_services_compute_points()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.points := calculate_service_points(
    NEW.time_weight,
    NEW.effort_weight,
    NEW.price_weight
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_services_compute_points ON services;
CREATE TRIGGER trg_services_compute_points
  BEFORE INSERT OR UPDATE OF time_weight, effort_weight, price_weight ON services
  FOR EACH ROW
  EXECUTE FUNCTION trg_services_compute_points();

UPDATE services SET
  time_weight = COALESCE(time_weight, 3),
  effort_weight = COALESCE(effort_weight, 3),
  price_weight = COALESCE(price_weight, 3);

-- ============================================================
-- 2) Salon timezone + appointment effort snapshot
-- ============================================================
ALTER TABLE app_configurations
  ADD COLUMN IF NOT EXISTS salon_timezone TEXT NOT NULL DEFAULT 'America/Chicago';

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS effort_points INTEGER;

CREATE OR REPLACE FUNCTION salon_local_date(p_ts TIMESTAMPTZ DEFAULT NOW())
RETURNS DATE
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (COALESCE(p_ts, NOW()) AT TIME ZONE COALESCE(
    (SELECT salon_timezone FROM app_configurations WHERE id = 1),
    'America/Chicago'
  ))::date;
$$;

-- ============================================================
-- 3) Dispatch audit log
-- ============================================================
CREATE TABLE IF NOT EXISTS dispatch_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  technician_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  reason_code TEXT,
  reason_detail TEXT,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_audit_log_created
  ON dispatch_audit_log(created_at DESC);

ALTER TABLE dispatch_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4) Workstation helpers
-- ============================================================
CREATE OR REPLACE FUNCTION technician_has_active_assignment(p_technician_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM appointments a
    WHERE a.technician_id = p_technician_id
      AND a.status IN ('assigned_pending', 'serving')
  );
$$;

CREATE OR REPLACE FUNCTION get_technician_workstation_status(p_technician_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(p.preferences->>'workstation_status', 'available')
  FROM profiles p
  WHERE p.id = p_technician_id;
$$;

CREATE OR REPLACE FUNCTION technician_is_available_for_dispatch(p_technician_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    get_technician_workstation_status(p_technician_id) = 'available'
    AND NOT technician_has_active_assignment(p_technician_id);
$$;

CREATE OR REPLACE FUNCTION set_technician_workstation_status(
  p_technician_id UUID,
  p_status TEXT,
  p_touch_last_available BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefs JSONB;
BEGIN
  IF p_technician_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(preferences, '{}'::jsonb) INTO v_prefs
  FROM profiles WHERE id = p_technician_id;

  v_prefs := jsonb_set(v_prefs, '{workstation_status}', to_jsonb(p_status), true);

  IF p_touch_last_available AND p_status = 'available' THEN
    v_prefs := jsonb_set(v_prefs, '{last_available_at}', to_jsonb(NOW()), true);
  ELSIF p_status = 'busy' THEN
    v_prefs := v_prefs - 'last_available_at';
  END IF;

  UPDATE profiles SET preferences = v_prefs WHERE id = p_technician_id;
END;
$$;

CREATE OR REPLACE FUNCTION clear_all_assignment_priority()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET preferences = preferences - 'assignment_priority'
  WHERE role = 'technician'
    AND COALESCE((preferences->>'assignment_priority')::boolean, false);
END;
$$;

CREATE OR REPLACE FUNCTION set_assignment_priority(p_technician_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefs JSONB;
BEGIN
  PERFORM clear_all_assignment_priority();

  SELECT COALESCE(preferences, '{}'::jsonb) INTO v_prefs
  FROM profiles WHERE id = p_technician_id;

  v_prefs := jsonb_set(v_prefs, '{assignment_priority}', 'true'::jsonb, true);
  UPDATE profiles SET preferences = v_prefs WHERE id = p_technician_id;
END;
$$;

-- ============================================================
-- 5) Effort points + daily totals
-- ============================================================
CREATE OR REPLACE FUNCTION get_appointment_effort_points(p_appointment_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  appt RECORD;
  v_total INTEGER := 0;
  v_items_total INTEGER := 0;
  v_name TEXT;
  v_pts INTEGER;
BEGIN
  SELECT * INTO appt FROM appointments WHERE id = p_appointment_id;
  IF appt.id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM(sub.pts), 0)::INTEGER INTO v_items_total
  FROM (
    SELECT DISTINCT asi.service_id, COALESCE(s.points, 0) AS pts
    FROM appointment_service_items asi
    LEFT JOIN services s ON s.id = asi.service_id
    WHERE asi.appointment_id = p_appointment_id
      AND asi.service_id IS NOT NULL
  ) sub;

  IF v_items_total > 0 THEN
    RETURN v_items_total;
  END IF;

  IF appt.service_id IS NOT NULL THEN
    SELECT COALESCE(s.points, 0) INTO v_pts FROM services s WHERE s.id = appt.service_id;
    v_total := v_total + COALESCE(v_pts, 0);
  END IF;

  IF appt.selected_service_names IS NOT NULL AND TRIM(appt.selected_service_names) <> '' THEN
    FOR v_name IN
      SELECT TRIM(unnest(string_to_array(appt.selected_service_names, ',')))
    LOOP
      IF v_name <> '' THEN
        SELECT COALESCE(s.points, 0) INTO v_pts
        FROM services s
        WHERE LOWER(TRIM(s.name)) = LOWER(v_name)
        LIMIT 1;
        IF appt.service_id IS NULL OR NOT EXISTS (
          SELECT 1 FROM services s2
          WHERE s2.id = appt.service_id AND LOWER(TRIM(s2.name)) = LOWER(v_name)
        ) THEN
          v_total := v_total + COALESCE(v_pts, 0);
        END IF;
      END IF;
    END LOOP;
  END IF;

  IF appt.add_ons IS NOT NULL AND TRIM(appt.add_ons) <> '' THEN
    FOR v_name IN
      SELECT TRIM(unnest(string_to_array(appt.add_ons, ',')))
    LOOP
      IF v_name <> '' THEN
        SELECT COALESCE(s.points, 0) INTO v_pts
        FROM services s
        WHERE LOWER(TRIM(s.name)) = LOWER(v_name)
        LIMIT 1;
        v_total := v_total + COALESCE(v_pts, 0);
      END IF;
    END LOOP;
  END IF;

  RETURN GREATEST(v_total, 0);
END;
$$;

CREATE OR REPLACE FUNCTION get_technician_daily_total_points(
  p_technician_id UUID,
  p_date DATE DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(COALESCE(a.effort_points, s.points, 0)), 0)::INTEGER
  FROM appointments a
  LEFT JOIN services s ON s.id = a.service_id
  WHERE a.technician_id = p_technician_id
    AND a.status IN ('ready_for_checkout', 'completed')
    AND salon_local_date(COALESCE(a.checkout_ready_at, a.completed_at))
      = COALESCE(p_date, salon_local_date());
$$;

-- ============================================================
-- 6) Audit logging
-- ============================================================
CREATE OR REPLACE FUNCTION log_dispatch_audit(
  p_appointment_id UUID,
  p_technician_id UUID,
  p_action TEXT,
  p_reason_code TEXT,
  p_reason_detail TEXT,
  p_snapshot JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO dispatch_audit_log (
    appointment_id, technician_id, action, reason_code, reason_detail, snapshot
  ) VALUES (
    p_appointment_id, p_technician_id, p_action, p_reason_code, p_reason_detail, COALESCE(p_snapshot, '{}'::jsonb)
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================================
-- 7) Assignment core
-- ============================================================
CREATE OR REPLACE FUNCTION assign_appointment_to_technician_core(
  p_appointment_id UUID,
  p_technician_id UUID,
  p_force BOOLEAN DEFAULT false,
  p_manual_override BOOLEAN DEFAULT false,
  p_caller_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  appt RECORD;
  v_status TEXT;
  v_effort INTEGER;
  v_daily_points INTEGER;
BEGIN
  SELECT * INTO appt FROM appointments WHERE id = p_appointment_id FOR UPDATE;
  IF appt.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found.';
  END IF;

  IF appt.status NOT IN ('waiting', 'assigned_pending') THEN
    RAISE EXCEPTION 'Appointment must be waiting or pending reassignment.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_technician_id AND role = 'technician'
  ) THEN
    RAISE EXCEPTION 'Invalid technician.';
  END IF;

  v_status := get_technician_workstation_status(p_technician_id);

  IF NOT p_force THEN
    IF v_status = 'on_break' THEN
      RAISE EXCEPTION 'Technician is on break.';
    END IF;
    IF v_status = 'busy' OR technician_has_active_assignment(p_technician_id) THEN
      RAISE EXCEPTION 'Technician is busy.';
    END IF;
  ELSE
    IF v_status = 'on_break' THEN
      RAISE EXCEPTION 'Technician is on break.';
    END IF;
    IF technician_has_active_assignment(p_technician_id)
       AND NOT EXISTS (
         SELECT 1 FROM appointments a
         WHERE a.technician_id = p_technician_id
           AND a.status IN ('assigned_pending', 'serving')
           AND a.id = p_appointment_id
       ) THEN
      RAISE EXCEPTION 'Technician is busy with another client.';
    END IF;
  END IF;

  IF appt.technician_id IS NOT NULL
     AND appt.technician_id IS DISTINCT FROM p_technician_id THEN
    PERFORM set_technician_workstation_status(appt.technician_id, 'available', true);
  END IF;

  v_effort := get_appointment_effort_points(p_appointment_id);

  UPDATE appointments SET
    technician_id = p_technician_id,
    status = 'assigned_pending',
    effort_points = v_effort
  WHERE id = p_appointment_id;

  PERFORM set_technician_workstation_status(p_technician_id, 'busy', false);

  UPDATE profiles
  SET preferences = (COALESCE(preferences, '{}'::jsonb) - 'assignment_priority')
  WHERE id = p_technician_id;

  v_daily_points := get_technician_daily_total_points(p_technician_id);

  IF p_manual_override THEN
    PERFORM log_dispatch_audit(
      p_appointment_id,
      p_technician_id,
      'manual_override',
      'manual_assign',
      format('Manual assignment (daily points: %s)', v_daily_points),
      jsonb_build_object('daily_points', v_daily_points, 'effort_points', v_effort)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'technician_id', p_technician_id,
    'effort_points', v_effort,
    'daily_points', v_daily_points
  );
END;
$$;

CREATE OR REPLACE FUNCTION assign_appointment_to_technician(
  caller_phone TEXT,
  appointment_id UUID,
  p_technician_id UUID,
  p_force BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN (
    'super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician'
  ) THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  RETURN assign_appointment_to_technician_core(
    appointment_id,
    p_technician_id,
    p_force,
    false,
    caller_phone
  );
END;
$$;

-- ============================================================
-- 8) Dispatcher
-- ============================================================
CREATE OR REPLACE FUNCTION dispatch_cumulative_effort(p_appointment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  appt RECORD;
  v_tech RECORD;
  v_candidates JSONB := '[]'::jsonb;
  v_available JSONB := '[]'::jsonb;
  v_min_points INTEGER;
  v_fairest_id UUID;
  v_fairest_points INTEGER;
  v_fairest_status TEXT;
  v_chosen_id UUID;
  v_chosen_points INTEGER;
  v_chosen_idle TIMESTAMPTZ;
  v_idle_minutes INTEGER;
  v_reason_code TEXT;
  v_reason_detail TEXT;
  v_assign JSONB;
BEGIN
  SELECT * INTO appt FROM appointments WHERE id = p_appointment_id;
  IF appt.id IS NULL THEN
    RETURN jsonb_build_object('assigned', false, 'reason', 'not_found');
  END IF;

  IF appt.status <> 'waiting' OR appt.technician_id IS NOT NULL THEN
    RETURN jsonb_build_object('assigned', false, 'reason', 'skipped', 'reason_detail', 'Not waiting or already assigned');
  END IF;

  v_min_points := NULL;
  v_fairest_id := NULL;

  FOR v_tech IN
    SELECT
      p.id,
      p.full_name,
      COALESCE(p.preferences->>'workstation_status', 'available') AS ws_status,
      (p.preferences->>'last_available_at')::timestamptz AS last_available_at,
      get_technician_daily_total_points(p.id) AS daily_points,
      technician_is_available_for_dispatch(p.id) AS is_available
    FROM profiles p
    WHERE p.role = 'technician'
    ORDER BY p.full_name
  LOOP
    v_candidates := v_candidates || jsonb_build_array(jsonb_build_object(
      'id', v_tech.id,
      'name', v_tech.full_name,
      'daily_points', v_tech.daily_points,
      'status', v_tech.ws_status,
      'available', v_tech.is_available
    ));

    IF v_min_points IS NULL OR v_tech.daily_points < v_min_points THEN
      v_min_points := v_tech.daily_points;
      v_fairest_id := v_tech.id;
      v_fairest_points := v_tech.daily_points;
      v_fairest_status := v_tech.ws_status;
    ELSIF v_tech.daily_points = v_min_points THEN
      -- keep first by name order for stable fairest id on tie
      NULL;
    END IF;

    IF v_tech.is_available THEN
      v_available := v_available || jsonb_build_array(jsonb_build_object(
        'id', v_tech.id,
        'daily_points', v_tech.daily_points,
        'last_available_at', v_tech.last_available_at
      ));
    END IF;
  END LOOP;

  IF jsonb_array_length(v_available) > 0 THEN
    v_chosen_id := NULL;
    v_chosen_points := NULL;
    v_chosen_idle := NULL;

    FOR v_tech IN
      SELECT
        p.id,
        get_technician_daily_total_points(p.id) AS daily_points,
        (p.preferences->>'last_available_at')::timestamptz AS last_available_at
      FROM profiles p
      WHERE p.role = 'technician'
        AND technician_is_available_for_dispatch(p.id)
      ORDER BY
        get_technician_daily_total_points(p.id) ASC,
        (p.preferences->>'last_available_at')::timestamptz ASC NULLS FIRST,
        p.full_name ASC
      LIMIT 1
    LOOP
      v_chosen_id := v_tech.id;
      v_chosen_points := v_tech.daily_points;
      v_chosen_idle := v_tech.last_available_at;
    END LOOP;

    v_reason_code := 'lowest_daily_points';
    v_reason_detail := format('Lowest points: %s', v_chosen_points);

    IF v_chosen_idle IS NOT NULL THEN
      v_idle_minutes := GREATEST(0, EXTRACT(EPOCH FROM (NOW() - v_chosen_idle))::INTEGER / 60);
      IF EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.role = 'technician'
          AND technician_is_available_for_dispatch(p.id)
          AND get_technician_daily_total_points(p.id) = v_chosen_points
          AND p.id <> v_chosen_id
      ) THEN
        v_reason_code := 'idle_tiebreak';
        v_reason_detail := format('Lowest points: %s · Tie-break: idle %sm', v_chosen_points, v_idle_minutes);
      END IF;
    END IF;

    v_assign := assign_appointment_to_technician_core(
      p_appointment_id,
      v_chosen_id,
      false,
      false,
      NULL
    );

    PERFORM log_dispatch_audit(
      p_appointment_id,
      v_chosen_id,
      'assigned',
      v_reason_code,
      v_reason_detail,
      jsonb_build_object(
        'daily_points', v_chosen_points,
        'candidate_count', jsonb_array_length(v_candidates),
        'all_candidates', v_candidates
      )
    );

    RETURN jsonb_build_object(
      'assigned', true,
      'technician_id', v_chosen_id,
      'reason', v_reason_code,
      'reason_detail', v_reason_detail
    ) || v_assign;
  END IF;

  IF v_fairest_id IS NOT NULL AND v_fairest_status IN ('busy', 'on_break') THEN
    PERFORM set_assignment_priority(v_fairest_id);
    v_reason_detail := format('Lowest points (%s) — flagged for priority', v_fairest_points);

    PERFORM log_dispatch_audit(
      p_appointment_id,
      v_fairest_id,
      'priority_flagged',
      'priority_flagged',
      v_reason_detail,
      jsonb_build_object(
        'daily_points', v_fairest_points,
        'candidate_count', jsonb_array_length(v_candidates),
        'all_candidates', v_candidates
      )
    );

    RETURN jsonb_build_object(
      'assigned', false,
      'technician_id', v_fairest_id,
      'reason', 'priority_flagged',
      'reason_detail', v_reason_detail
    );
  END IF;

  PERFORM log_dispatch_audit(
    p_appointment_id,
    NULL,
    'skipped',
    'no_technicians',
    'No technicians available',
    jsonb_build_object('candidate_count', jsonb_array_length(v_candidates), 'all_candidates', v_candidates)
  );

  RETURN jsonb_build_object(
    'assigned', false,
    'reason', 'no_technicians',
    'reason_detail', 'No technicians available'
  );
END;
$$;

CREATE OR REPLACE FUNCTION try_dispatch_for_priority_technician(p_technician_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_priority BOOLEAN;
  v_waiting_id UUID;
  v_result JSONB;
BEGIN
  SELECT COALESCE((preferences->>'assignment_priority')::boolean, false)
  INTO v_has_priority
  FROM profiles WHERE id = p_technician_id;

  IF v_has_priority AND technician_is_available_for_dispatch(p_technician_id) THEN
    SELECT id INTO v_waiting_id
    FROM appointments
    WHERE status = 'waiting' AND technician_id IS NULL
    ORDER BY checked_in_at ASC NULLS LAST, created_at ASC
    LIMIT 1;

    IF v_waiting_id IS NOT NULL THEN
      v_result := assign_appointment_to_technician_core(v_waiting_id, p_technician_id, false, false, NULL);

      PERFORM log_dispatch_audit(
        v_waiting_id,
        p_technician_id,
        'assigned',
        'priority_honored',
        format('Priority honored (daily points: %s)', get_technician_daily_total_points(p_technician_id)),
        jsonb_build_object('priority', true)
      );

      RETURN jsonb_build_object('assigned', true, 'appointment_id', v_waiting_id) || v_result;
    END IF;
  END IF;

  SELECT id INTO v_waiting_id
  FROM appointments
  WHERE status = 'waiting' AND technician_id IS NULL
  ORDER BY checked_in_at ASC NULLS LAST, created_at ASC
  LIMIT 1;

  IF v_waiting_id IS NOT NULL THEN
    RETURN dispatch_cumulative_effort(v_waiting_id);
  END IF;

  RETURN jsonb_build_object('assigned', false, 'reason', 'no_waiting');
END;
$$;

CREATE OR REPLACE FUNCTION dispatch_waiting_queue(caller_phone TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_waiting UUID;
  v_result JSONB;
  v_results JSONB := '[]'::jsonb;
  v_assigned INTEGER := 0;
BEGIN
  IF caller_phone IS NOT NULL THEN
    SELECT role INTO v_role FROM profiles WHERE phone = caller_phone;
    IF v_role IS NULL OR v_role NOT IN ('super_admin', 'owner', 'partner', 'admin', 'cashier') THEN
      RAISE EXCEPTION 'Not authorized.';
    END IF;
  END IF;

  LOOP
    SELECT id INTO v_waiting
    FROM appointments
    WHERE status = 'waiting' AND technician_id IS NULL
    ORDER BY checked_in_at ASC NULLS LAST, created_at ASC
    LIMIT 1;

    EXIT WHEN v_waiting IS NULL;

    v_result := dispatch_cumulative_effort(v_waiting);
    v_results := v_results || jsonb_build_array(v_result);

    IF COALESCE((v_result->>'assigned')::boolean, false) THEN
      v_assigned := v_assigned + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'assigned_count', v_assigned, 'results', v_results);
END;
$$;

CREATE OR REPLACE FUNCTION run_cumulative_effort_dispatcher(caller_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN dispatch_waiting_queue(caller_phone);
END;
$$;

CREATE OR REPLACE FUNCTION get_floor_technician_workload()
RETURNS TABLE(
  id UUID,
  full_name TEXT,
  workstation_status TEXT,
  daily_points INTEGER,
  assignment_priority BOOLEAN,
  last_available_at TIMESTAMPTZ,
  last_dispatch_reason TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.full_name,
    COALESCE(p.preferences->>'workstation_status', 'available') AS workstation_status,
    get_technician_daily_total_points(p.id) AS daily_points,
    COALESCE((p.preferences->>'assignment_priority')::boolean, false) AS assignment_priority,
    (p.preferences->>'last_available_at')::timestamptz AS last_available_at,
    (
      SELECT dal.reason_detail
      FROM dispatch_audit_log dal
      WHERE dal.technician_id = p.id
        AND dal.action IN ('assigned', 'manual_override')
      ORDER BY dal.created_at DESC
      LIMIT 1
    ) AS last_dispatch_reason
  FROM profiles p
  WHERE p.role = 'technician'
  ORDER BY p.full_name;
$$;

CREATE OR REPLACE FUNCTION get_dispatch_audit_log(
  caller_phone TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  appointment_id UUID,
  technician_id UUID,
  technician_name TEXT,
  customer_name TEXT,
  action TEXT,
  reason_code TEXT,
  reason_detail TEXT,
  snapshot JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE phone = caller_phone;
  IF v_role IS NULL OR v_role NOT IN (
    'super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician'
  ) THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  RETURN QUERY
  SELECT
    dal.id,
    dal.appointment_id,
    dal.technician_id,
    tp.full_name AS technician_name,
    cp.full_name AS customer_name,
    dal.action,
    dal.reason_code,
    dal.reason_detail,
    dal.snapshot,
    dal.created_at
  FROM dispatch_audit_log dal
  LEFT JOIN profiles tp ON tp.id = dal.technician_id
  LEFT JOIN appointments a ON a.id = dal.appointment_id
  LEFT JOIN profiles cp ON cp.id = a.customer_id
  WHERE salon_local_date(dal.created_at) = salon_local_date()
  ORDER BY dal.created_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 20), 1);
END;
$$;

-- ============================================================
-- 9) Workstation backfill (appointment truth)
-- ============================================================
WITH active AS (
  SELECT DISTINCT technician_id
  FROM appointments
  WHERE technician_id IS NOT NULL
    AND status IN ('assigned_pending', 'serving')
)
UPDATE profiles p
SET preferences = jsonb_set(
  jsonb_set(
    COALESCE(p.preferences, '{}'::jsonb),
    '{workstation_status}',
    '"busy"'::jsonb
  ),
  '{last_available_at}',
  'null'::jsonb,
  true
)
FROM active a
WHERE p.id = a.technician_id
  AND p.role = 'technician';

UPDATE profiles p
SET preferences = jsonb_set(
  jsonb_set(
    COALESCE(p.preferences, '{}'::jsonb),
    '{workstation_status}',
    CASE
      WHEN COALESCE(p.preferences->>'workstation_status', '') = 'on_break'
        THEN '"on_break"'::jsonb
      ELSE '"available"'::jsonb
    END
  ),
  '{last_available_at}',
  to_jsonb(NOW()),
  true
)
WHERE p.role = 'technician'
  AND NOT EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.technician_id = p.id
      AND a.status IN ('assigned_pending', 'serving')
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM profiles p
    JOIN appointments a ON a.technician_id = p.id
    WHERE p.role = 'technician'
      AND a.status IN ('assigned_pending', 'serving')
      AND COALESCE(p.preferences->>'workstation_status', 'available') <> 'busy'
  ) THEN
    RAISE EXCEPTION 'Backfill failed: in-progress technician not marked busy';
  END IF;
END $$;

-- ============================================================
-- 10) manage_service — weight columns
-- ============================================================
CREATE OR REPLACE FUNCTION manage_service(
  admin_phone TEXT,
  action TEXT,
  service_data JSONB DEFAULT '{}',
  service_id BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  new_id BIGINT;
  v_time SMALLINT;
  v_effort SMALLINT;
  v_price SMALLINT;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE phone = admin_phone;

  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner') THEN
    RAISE EXCEPTION 'Not authorized. Only super_admin, owner, or partner can manage services.';
  END IF;

  v_time := COALESCE((service_data->>'time_weight')::smallint, 3);
  v_effort := COALESCE((service_data->>'effort_weight')::smallint, 3);
  v_price := COALESCE((service_data->>'price_weight')::smallint, 3);

  IF v_time < 1 OR v_time > 5 OR v_effort < 1 OR v_effort > 5 OR v_price < 1 OR v_price > 5 THEN
    RAISE EXCEPTION 'Weights must be between 1 and 5.';
  END IF;

  IF action = 'insert' THEN
    INSERT INTO services (
      name, price, duration_minutes, category, is_addon, metadata, description, is_coming_soon,
      time_weight, effort_weight, price_weight
    )
    VALUES (
      service_data->>'name',
      (service_data->>'price')::numeric,
      (service_data->>'duration_minutes')::int,
      service_data->>'category',
      COALESCE((service_data->>'is_addon')::boolean, false),
      COALESCE(service_data->'metadata', '{}'::jsonb),
      NULLIF(service_data->>'description', ''),
      COALESCE((service_data->>'is_coming_soon')::boolean, false),
      v_time, v_effort, v_price
    )
    RETURNING id INTO new_id;
    RETURN jsonb_build_object('id', new_id);

  ELSIF action = 'update' THEN
    IF service_id IS NULL THEN
      RAISE EXCEPTION 'service_id required for update';
    END IF;
    UPDATE services SET
      name = COALESCE(service_data->>'name', name),
      price = COALESCE((service_data->>'price')::numeric, price),
      duration_minutes = COALESCE((service_data->>'duration_minutes')::int, duration_minutes),
      category = COALESCE(service_data->>'category', category),
      is_addon = COALESCE((service_data->>'is_addon')::boolean, is_addon),
      metadata = CASE
        WHEN service_data ? 'metadata' THEN service_data->'metadata'
        ELSE metadata
      END,
      description = CASE
        WHEN service_data ? 'description' THEN NULLIF(service_data->>'description', '')
        ELSE description
      END,
      is_coming_soon = CASE
        WHEN service_data ? 'is_coming_soon' THEN COALESCE((service_data->>'is_coming_soon')::boolean, false)
        ELSE is_coming_soon
      END,
      time_weight = CASE WHEN service_data ? 'time_weight' THEN v_time ELSE time_weight END,
      effort_weight = CASE WHEN service_data ? 'effort_weight' THEN v_effort ELSE effort_weight END,
      price_weight = CASE WHEN service_data ? 'price_weight' THEN v_price ELSE price_weight END
    WHERE id = service_id;
    RETURN jsonb_build_object('success', true);

  ELSIF action = 'delete' THEN
    IF service_id IS NULL THEN
      RAISE EXCEPTION 'service_id required for delete';
    END IF;
    DELETE FROM services WHERE id = service_id;
    RETURN jsonb_build_object('success', true);

  ELSE
    RAISE EXCEPTION 'Invalid action: %', action;
  END IF;
END;
$$;

-- ============================================================
-- 11) Patched RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION send_to_checkout(
  caller_phone TEXT,
  appointment_id UUID,
  p_final_price NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
  appt RECORD;
  v_dispatch JSONB;
  result JSONB;
BEGIN
  SELECT id, role INTO caller_id, caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician') THEN
    RAISE EXCEPTION 'Not authorized. Only staff can send to checkout.';
  END IF;

  SELECT * INTO appt FROM appointments WHERE id = appointment_id;
  IF appt.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found.';
  END IF;

  IF appt.status != 'serving' THEN
    RAISE EXCEPTION 'Only in-chair (serving) appointments can be sent to checkout.';
  END IF;

  IF caller_role = 'technician' THEN
    IF appt.technician_id IS NULL OR appt.technician_id != caller_id THEN
      RAISE EXCEPTION 'You can only send your own appointments to checkout.';
    END IF;
  END IF;

  UPDATE appointments SET
    status = 'ready_for_checkout',
    checkout_ready_at = NOW(),
    final_price = COALESCE(p_final_price, final_price)
  WHERE id = appointment_id;

  IF appt.technician_id IS NOT NULL THEN
    PERFORM set_technician_workstation_status(appt.technician_id, 'available', true);
    v_dispatch := try_dispatch_for_priority_technician(appt.technician_id);
  END IF;

  SELECT jsonb_build_object('success', true, 'dispatch', v_dispatch) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION decline_assignment(
  caller_phone TEXT,
  appointment_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
  appt RECORD;
  ctx RECORD;
  v_old_tech UUID;
  result JSONB;
BEGIN
  SELECT id, role INTO caller_id, caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician') THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  SELECT * INTO appt FROM appointments WHERE id = appointment_id;
  IF appt.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found.';
  END IF;

  IF appt.status != 'assigned_pending' THEN
    RAISE EXCEPTION 'Only pending assignments can be declined.';
  END IF;

  IF caller_role = 'technician' AND appt.technician_id != caller_id THEN
    RAISE EXCEPTION 'You can only decline your own assignments.';
  END IF;

  v_old_tech := appt.technician_id;

  SELECT * INTO ctx FROM get_appointment_notification_context(appointment_id);

  UPDATE appointments SET
    status = 'waiting',
    technician_id = NULL,
    notes = CASE
      WHEN p_reason IS NOT NULL AND p_reason != '' THEN
        COALESCE(notes || E'\n', '') || 'Declined: ' || p_reason
      ELSE notes
    END
  WHERE id = appointment_id;

  IF v_old_tech IS NOT NULL THEN
    PERFORM set_technician_workstation_status(v_old_tech, 'available', true);
  END IF;

  PERFORM notify_roles(
    ARRAY['admin']::user_role[],
    'Assignment declined',
    format('%s declined assignment for %s — reassign needed.', ctx.technician_name, ctx.customer_name),
    'assignment_declined',
    appointment_id
  );

  SELECT jsonb_build_object('success', true) INTO result;
  RETURN result;
END;
$$;

DROP FUNCTION IF EXISTS update_appointment(
  TEXT, UUID, TEXT, BIGINT, TEXT, NUMERIC, TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, JSONB, TEXT
);

CREATE OR REPLACE FUNCTION update_appointment(
  caller_phone TEXT,
  appointment_id UUID,
  p_status TEXT DEFAULT NULL,
  p_service_id BIGINT DEFAULT NULL,
  p_add_ons TEXT DEFAULT NULL,
  p_final_price NUMERIC DEFAULT NULL,
  p_refreshment_pref TEXT DEFAULT NULL,
  p_technician_id UUID DEFAULT NULL,
  p_start_time TIMESTAMPTZ DEFAULT NULL,
  p_scheduled_at TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_selected_service_names TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
  caller_name TEXT;
  appt_technician_id UUID;
  appt_status TEXT;
  old_row appointments%ROWTYPE;
  new_service_names TEXT;
  old_service_names TEXT;
  new_addons TEXT;
  new_final_price NUMERIC;
  v_change_source TEXT;
  v_new_status TEXT;
  result JSONB;
BEGIN
  SELECT id, role, full_name INTO caller_id, caller_role, caller_name
  FROM profiles WHERE phone = caller_phone;

  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician') THEN
    RAISE EXCEPTION 'Not authorized. Only staff can update appointments.';
  END IF;

  SELECT * INTO old_row FROM appointments WHERE id = appointment_id;

  IF old_row.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found.';
  END IF;

  appt_technician_id := old_row.technician_id;
  appt_status := old_row.status;
  v_new_status := COALESCE(p_status, appt_status);

  IF caller_role = 'technician' THEN
    IF appt_technician_id IS NULL OR appt_technician_id != caller_id THEN
      RAISE EXCEPTION 'You can only update your own appointments.';
    END IF;
    IF appt_status NOT IN ('serving', 'assigned_pending') THEN
      RAISE EXCEPTION 'Can only update active assignments.';
    END IF;
    IF p_technician_id IS NOT NULL AND p_technician_id IS DISTINCT FROM appt_technician_id THEN
      RAISE EXCEPTION 'Technicians cannot reassign appointments.';
    END IF;
    IF p_status IS NOT NULL AND p_status IS DISTINCT FROM appt_status THEN
      RAISE EXCEPTION 'Technicians cannot change appointment status here.';
    END IF;
    IF p_metadata IS NOT NULL AND appt_status != 'serving' THEN
      RAISE EXCEPTION 'Checklist updates require an in-chair (serving) appointment.';
    END IF;
  END IF;

  -- Return to waiting: free technician
  IF v_new_status = 'waiting'
     AND (p_technician_id IS NULL OR p_technician_id IS DISTINCT FROM old_row.technician_id)
     AND old_row.technician_id IS NOT NULL THEN
    PERFORM set_technician_workstation_status(old_row.technician_id, 'available', true);
  END IF;

  -- Assignment / reassignment via cumulative effort core
  IF p_technician_id IS NOT NULL
     AND v_new_status = 'assigned_pending'
     AND (
       old_row.status = 'waiting'
       OR (old_row.status = 'assigned_pending' AND p_technician_id IS DISTINCT FROM old_row.technician_id)
     ) THEN
    RETURN assign_appointment_to_technician_core(
      appointment_id,
      p_technician_id,
      (old_row.status = 'assigned_pending'),
      true,
      caller_phone
    );
  END IF;

  old_service_names := resolve_appointment_service_names(old_row.service_id, old_row.selected_service_names);
  new_service_names := resolve_appointment_service_names(
    COALESCE(p_service_id, old_row.service_id),
    COALESCE(p_selected_service_names, old_row.selected_service_names)
  );
  new_addons := COALESCE(p_add_ons, old_row.add_ons);
  new_final_price := COALESCE(p_final_price, old_row.final_price);

  v_change_source := CASE caller_role
    WHEN 'technician' THEN 'technician'
    ELSE 'admin_lobby'
  END;

  IF p_service_id IS NOT NULL
     OR p_add_ons IS NOT NULL
     OR p_final_price IS NOT NULL
     OR p_selected_service_names IS NOT NULL THEN
    PERFORM log_appointment_service_change(
      appointment_id,
      caller_id,
      caller_name,
      v_change_source,
      old_service_names,
      new_service_names,
      old_row.add_ons,
      new_addons,
      old_row.final_price,
      new_final_price
    );
  END IF;

  UPDATE appointments SET
    status = COALESCE(p_status, status),
    service_id = COALESCE(p_service_id, service_id),
    add_ons = COALESCE(p_add_ons, add_ons),
    selected_service_names = COALESCE(p_selected_service_names, selected_service_names),
    final_price = COALESCE(p_final_price, final_price),
    refreshment_pref = COALESCE(p_refreshment_pref, refreshment_pref),
    technician_id = COALESCE(p_technician_id, technician_id),
    start_time = COALESCE(p_start_time, start_time),
    scheduled_at = COALESCE(p_scheduled_at, scheduled_at),
    notes = COALESCE(p_notes, notes),
    metadata = COALESCE(p_metadata, metadata)
  WHERE id = appointment_id;

  SELECT jsonb_build_object('success', true) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION complete_kiosk_check_in(
  caller_phone TEXT,
  appointment_id UUID,
  p_service_id BIGINT DEFAULT NULL,
  p_add_ons TEXT DEFAULT NULL,
  p_selected_service_names TEXT DEFAULT NULL,
  p_final_price NUMERIC DEFAULT NULL,
  p_refreshment_pref TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  appt RECORD;
  v_appt_id UUID;
  v_refreshment TEXT;
  v_inventory_id UUID;
  v_profile_refreshment TEXT;
  result JSONB;
BEGIN
  v_appt_id := appointment_id;

  SELECT id INTO caller_id
  FROM profiles
  WHERE regexp_replace(phone, '\D', '', 'g') = regexp_replace(COALESCE(caller_phone, ''), '\D', '', 'g')
     OR phone = caller_phone
  ORDER BY created_at ASC
  LIMIT 1;

  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for this phone number.';
  END IF;

  SELECT * INTO appt
  FROM appointments
  WHERE id = v_appt_id AND customer_id = caller_id;

  IF appt.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found or does not belong to you.';
  END IF;

  IF appt.status NOT IN ('checking_in', 'confirmed', 'waiting') THEN
    SELECT jsonb_build_object(
      'success', true,
      'appointment', row_to_json(a.*)::jsonb
    ) INTO result
    FROM appointments a WHERE a.id = v_appt_id;
    RETURN result;
  END IF;

  SELECT NULLIF(TRIM(refreshment_pref), '') INTO v_profile_refreshment
  FROM profiles
  WHERE id = caller_id;

  v_refreshment := COALESCE(
    NULLIF(TRIM(p_refreshment_pref), ''),
    NULLIF(TRIM(appt.refreshment_pref), ''),
    v_profile_refreshment
  );

  UPDATE appointments SET
    service_id = COALESCE(p_service_id, service_id),
    add_ons = COALESCE(p_add_ons, add_ons),
    selected_service_names = COALESCE(p_selected_service_names, selected_service_names),
    final_price = COALESCE(p_final_price, final_price),
    refreshment_pref = COALESCE(NULLIF(TRIM(p_refreshment_pref), ''), refreshment_pref, v_profile_refreshment),
    status = 'waiting',
    checked_in_at = NOW()
  WHERE id = v_appt_id;

  IF v_refreshment IS NOT NULL THEN
    UPDATE profiles
    SET refreshment_pref = v_refreshment
    WHERE id = caller_id;

    SELECT id INTO v_inventory_id
    FROM inventory
    WHERE lower(trim(category)) = 'refreshment'
      AND lower(trim(item_name)) = lower(trim(v_refreshment))
    ORDER BY quantity DESC
    LIMIT 1;

    IF v_inventory_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM inventory_logs il
      WHERE il.appointment_id = v_appt_id
        AND il.inventory_id = v_inventory_id
        AND il.quantity_changed < 0
    ) THEN
      INSERT INTO inventory_logs (
        inventory_id, appointment_id, customer_id, quantity_changed, reason
      ) VALUES (
        v_inventory_id, v_appt_id, caller_id, -1, 'Kiosk check-in refreshment'
      );

      UPDATE inventory
      SET quantity = GREATEST(quantity - 1, 0), updated_at = NOW()
      WHERE id = v_inventory_id;
    END IF;
  END IF;

  SELECT jsonb_build_object(
    'success', true,
    'appointment', row_to_json(a.*)::jsonb,
    'refreshment_deducted', (
      v_refreshment IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM inventory_logs il
        WHERE il.appointment_id = v_appt_id
          AND il.quantity_changed < 0
          AND il.reason = 'Kiosk check-in refreshment'
      )
    )
  ) INTO result
  FROM appointments a WHERE a.id = v_appt_id;

  RETURN result;
END;
$$;

-- Auto-dispatch when appointment enters waiting queue (walk-ins, declines)
CREATE OR REPLACE FUNCTION trg_dispatch_on_waiting()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'waiting'
     AND NEW.technician_id IS NULL
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'waiting') THEN
    PERFORM dispatch_cumulative_effort(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_on_waiting ON appointments;
CREATE TRIGGER trg_dispatch_on_waiting
  AFTER INSERT OR UPDATE OF status ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION trg_dispatch_on_waiting();

-- ============================================================
-- 12) Grants
-- ============================================================
GRANT EXECUTE ON FUNCTION calculate_service_points(SMALLINT, SMALLINT, SMALLINT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION salon_local_date(TIMESTAMPTZ) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_technician_daily_total_points(UUID, DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION assign_appointment_to_technician(TEXT, UUID, UUID, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION dispatch_cumulative_effort(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION dispatch_waiting_queue(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION run_cumulative_effort_dispatcher(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_floor_technician_workload() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_dispatch_audit_log(TEXT, INTEGER) TO anon, authenticated;

-- Realtime for dispatcher log panel (optional; falls back to refresh)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE dispatch_audit_log;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
