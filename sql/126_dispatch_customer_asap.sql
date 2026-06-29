-- Migration 126: Customer-ASAP dispatch with technician fairness queue
-- Run after sql/125_cumulative_effort_dispatch.sql
--
-- Customers: assign to any free tech immediately when lobby is waiting.
-- Technicians: lowest-points busy tech keeps assignment_priority until they
-- receive the next customer (priority-first when multiple techs are free).

-- ============================================================
-- 1) Helpers
-- ============================================================
CREATE OR REPLACE FUNCTION get_busy_assignment_priority_technician()
RETURNS TABLE(
  technician_id UUID,
  technician_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.full_name
  FROM profiles p
  WHERE p.role = 'technician'
    AND COALESCE((p.preferences->>'assignment_priority')::boolean, false)
    AND NOT technician_is_available_for_dispatch(p.id)
  ORDER BY p.full_name ASC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION pick_next_available_technician()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chosen_id UUID;
  v_chosen_name TEXT;
  v_chosen_points INTEGER;
  v_chosen_idle TIMESTAMPTZ;
  v_has_priority BOOLEAN;
  v_idle_minutes INTEGER;
  v_reason_code TEXT;
  v_reason_detail TEXT;
  v_retained_id UUID;
  v_retained_name TEXT;
BEGIN
  SELECT
    p.id,
    p.full_name,
    get_technician_daily_total_points(p.id),
    (p.preferences->>'last_available_at')::timestamptz,
    true
  INTO
    v_chosen_id,
    v_chosen_name,
    v_chosen_points,
    v_chosen_idle,
    v_has_priority
  FROM profiles p
  WHERE p.role = 'technician'
    AND technician_is_available_for_dispatch(p.id)
    AND COALESCE((p.preferences->>'assignment_priority')::boolean, false)
  ORDER BY
    (p.preferences->>'last_available_at')::timestamptz ASC NULLS FIRST,
    p.full_name ASC
  LIMIT 1;

  IF v_chosen_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'technician_id', v_chosen_id,
      'technician_name', v_chosen_name,
      'daily_points', v_chosen_points,
      'has_assignment_priority', true,
      'reason_code', 'priority_honored',
      'reason_detail', format('Priority honored (daily points: %s)', v_chosen_points),
      'retained_priority_id', NULL,
      'retained_priority_name', NULL
    );
  END IF;

  v_chosen_id := NULL;
  v_chosen_name := NULL;
  v_chosen_points := NULL;
  v_chosen_idle := NULL;
  v_has_priority := false;

  SELECT
    p.id,
    p.full_name,
    get_technician_daily_total_points(p.id),
    (p.preferences->>'last_available_at')::timestamptz
  INTO
    v_chosen_id,
    v_chosen_name,
    v_chosen_points,
    v_chosen_idle
  FROM profiles p
  WHERE p.role = 'technician'
    AND technician_is_available_for_dispatch(p.id)
  ORDER BY
    get_technician_daily_total_points(p.id) ASC,
    (p.preferences->>'last_available_at')::timestamptz ASC NULLS FIRST,
    p.full_name ASC
  LIMIT 1;

  IF v_chosen_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_reason_code := 'lowest_daily_points';
  v_reason_detail := format('Lowest points: %s', v_chosen_points);

  IF v_chosen_idle IS NOT NULL THEN
    v_idle_minutes := GREATEST(0, EXTRACT(EPOCH FROM (NOW() - v_chosen_idle))::INTEGER / 60);
    IF EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.role = 'technician'
        AND technician_is_available_for_dispatch(p.id)
        AND get_technician_daily_total_points(p.id) = v_chosen_points
        AND p.id <> v_chosen_id
    ) THEN
      v_reason_code := 'idle_tiebreak';
      v_reason_detail := format('Lowest points: %s · Tie-break: idle %sm', v_chosen_points, v_idle_minutes);
    END IF;
  END IF;

  SELECT b.technician_id, b.technician_name
  INTO v_retained_id, v_retained_name
  FROM get_busy_assignment_priority_technician() b;

  IF v_retained_id IS NOT NULL THEN
    v_reason_code := 'next_available';
    v_reason_detail := format(
      'Next available (%s pts); priority retained for %s',
      v_chosen_points,
      v_retained_name
    );
  END IF;

  RETURN jsonb_build_object(
    'technician_id', v_chosen_id,
    'technician_name', v_chosen_name,
    'daily_points', v_chosen_points,
    'has_assignment_priority', false,
    'reason_code', v_reason_code,
    'reason_detail', v_reason_detail,
    'retained_priority_id', v_retained_id,
    'retained_priority_name', v_retained_name
  );
END;
$$;

-- ============================================================
-- 2) Dispatcher
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
  v_pick JSONB;
  v_chosen_id UUID;
  v_chosen_points INTEGER;
  v_reason_code TEXT;
  v_reason_detail TEXT;
  v_assign JSONB;
  v_snapshot JSONB;
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
    v_pick := pick_next_available_technician();
    v_chosen_id := (v_pick->>'technician_id')::uuid;
    v_chosen_points := (v_pick->>'daily_points')::integer;
    v_reason_code := v_pick->>'reason_code';
    v_reason_detail := v_pick->>'reason_detail';

    v_assign := assign_appointment_to_technician_core(
      p_appointment_id,
      v_chosen_id,
      false,
      false,
      NULL
    );

    v_snapshot := jsonb_build_object(
      'daily_points', v_chosen_points,
      'candidate_count', jsonb_array_length(v_candidates),
      'all_candidates', v_candidates
    );

    IF v_pick->>'retained_priority_id' IS NOT NULL THEN
      v_snapshot := v_snapshot || jsonb_build_object(
        'retained_priority_id', v_pick->>'retained_priority_id',
        'retained_priority_name', v_pick->>'retained_priority_name'
      );
    END IF;

    IF COALESCE((v_pick->>'has_assignment_priority')::boolean, false) THEN
      v_snapshot := v_snapshot || jsonb_build_object('priority', true);
    END IF;

    PERFORM log_dispatch_audit(
      p_appointment_id,
      v_chosen_id,
      'assigned',
      v_reason_code,
      v_reason_detail,
      v_snapshot
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
  v_waiting_id UUID;
  v_pick JSONB;
  v_assign JSONB;
  v_snapshot JSONB;
BEGIN
  SELECT id INTO v_waiting_id
  FROM appointments
  WHERE status = 'waiting' AND technician_id IS NULL
  ORDER BY checked_in_at ASC NULLS LAST, created_at ASC
  LIMIT 1;

  IF v_waiting_id IS NULL THEN
    RETURN jsonb_build_object('assigned', false, 'reason', 'no_waiting');
  END IF;

  v_pick := pick_next_available_technician();

  IF v_pick IS NOT NULL THEN
    v_assign := assign_appointment_to_technician_core(
      v_waiting_id,
      (v_pick->>'technician_id')::uuid,
      false,
      false,
      NULL
    );

    v_snapshot := jsonb_build_object(
      'daily_points', (v_pick->>'daily_points')::integer,
      'triggered_by_technician_id', p_technician_id
    );

    IF v_pick->>'retained_priority_id' IS NOT NULL THEN
      v_snapshot := v_snapshot || jsonb_build_object(
        'retained_priority_id', v_pick->>'retained_priority_id',
        'retained_priority_name', v_pick->>'retained_priority_name'
      );
    END IF;

    IF COALESCE((v_pick->>'has_assignment_priority')::boolean, false) THEN
      v_snapshot := v_snapshot || jsonb_build_object('priority', true);
    END IF;

    PERFORM log_dispatch_audit(
      v_waiting_id,
      (v_pick->>'technician_id')::uuid,
      'assigned',
      v_pick->>'reason_code',
      v_pick->>'reason_detail',
      v_snapshot
    );

    RETURN jsonb_build_object(
      'assigned', true,
      'appointment_id', v_waiting_id,
      'technician_id', v_pick->>'technician_id',
      'reason', v_pick->>'reason_code',
      'reason_detail', v_pick->>'reason_detail'
    ) || v_assign;
  END IF;

  RETURN dispatch_cumulative_effort(v_waiting_id);
END;
$$;

-- ============================================================
-- 3) Drain waiting queue when a technician frees up
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
    v_dispatch := dispatch_waiting_queue(NULL);
  END IF;

  SELECT jsonb_build_object('success', true, 'dispatch', v_dispatch) INTO result;
  RETURN result;
END;
$$;

-- ============================================================
-- 4) Grants
-- ============================================================
GRANT EXECUTE ON FUNCTION get_busy_assignment_priority_technician() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION pick_next_available_technician() TO anon, authenticated;
