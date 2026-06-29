-- Migration 128: Salon-wide lobby auto-assign on/off toggle
-- Run after sql/127_fix_lobby_dispatch_stuck.sql
--
-- When off, automatic dispatch is paused; staff assign manually via drag-and-drop.
-- Default: on. Toggling on drains the waiting queue.

ALTER TABLE app_configurations
  ADD COLUMN IF NOT EXISTS lobby_auto_assign_enabled BOOLEAN NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION is_lobby_auto_assign_enabled()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT lobby_auto_assign_enabled FROM app_configurations WHERE id = 1),
    true
  );
$$;

CREATE OR REPLACE FUNCTION get_lobby_auto_assign_enabled()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_lobby_auto_assign_enabled();
$$;

CREATE OR REPLACE FUNCTION set_lobby_auto_assign_enabled(
  caller_phone TEXT,
  p_enabled BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  v_dispatch JSONB;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE phone = caller_phone;

  IF caller_role IS NULL OR caller_role NOT IN (
    'super_admin', 'owner', 'partner', 'admin', 'cashier'
  ) THEN
    RAISE EXCEPTION 'Not authorized. Only floor staff can change auto-assign.';
  END IF;

  UPDATE app_configurations
  SET lobby_auto_assign_enabled = p_enabled,
      updated_at = NOW()
  WHERE id = 1;

  IF NOT FOUND THEN
    INSERT INTO app_configurations (id, lobby_auto_assign_enabled)
    VALUES (1, p_enabled);
  END IF;

  IF p_enabled THEN
    v_dispatch := dispatch_waiting_queue(caller_phone);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'enabled', p_enabled,
    'dispatch', v_dispatch
  );
END;
$$;

-- Gate automatic dispatcher
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
  v_pick JSONB;
  v_snapshot JSONB;
BEGIN
  PERFORM reconcile_all_technician_workstations();

  IF NOT is_lobby_auto_assign_enabled() THEN
    RETURN jsonb_build_object(
      'assigned', false,
      'reason', 'auto_assign_disabled',
      'reason_detail', 'Lobby auto-assign is off'
    );
  END IF;

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

CREATE OR REPLACE FUNCTION trg_dispatch_on_waiting()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_lobby_auto_assign_enabled() THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'waiting'
     AND NEW.technician_id IS NULL
     AND (
       TG_OP = 'INSERT'
       OR OLD.status IS DISTINCT FROM 'waiting'
       OR OLD.technician_id IS DISTINCT FROM NEW.technician_id
     ) THEN
    PERFORM dispatch_cumulative_effort(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION set_technician_break_status(
  caller_phone TEXT,
  on_break BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
  v_dispatch JSONB;
  v_status TEXT;
  v_prefs JSONB;
BEGIN
  SELECT id, role INTO caller_id, caller_role
  FROM profiles WHERE phone = caller_phone;

  IF caller_role IS NULL OR caller_role != 'technician' THEN
    RAISE EXCEPTION 'Only technicians can update break status.';
  END IF;

  IF on_break THEN
    PERFORM set_technician_workstation_status(caller_id, 'on_break', false);
    v_status := 'on_break';
  ELSE
    IF technician_has_active_assignment(caller_id) THEN
      PERFORM set_technician_workstation_status(caller_id, 'busy', false);
      v_status := 'busy';
    ELSE
      PERFORM set_technician_workstation_status(caller_id, 'available', true);
      v_status := 'available';
      IF is_lobby_auto_assign_enabled() THEN
        v_dispatch := dispatch_waiting_queue(NULL);
      END IF;
    END IF;
  END IF;

  SELECT COALESCE(preferences, '{}'::jsonb) INTO v_prefs
  FROM profiles WHERE id = caller_id;

  RETURN jsonb_build_object(
    'success', true,
    'workstation_status', v_status,
    'preferences', v_prefs,
    'dispatch', v_dispatch
  );
END;
$$;

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
    IF is_lobby_auto_assign_enabled() THEN
      v_dispatch := dispatch_waiting_queue(NULL);
    END IF;
  END IF;

  SELECT jsonb_build_object('success', true, 'dispatch', v_dispatch) INTO result;
  RETURN result;
END;
$$;

-- Patch update_appointment return-to-waiting redispatch guard
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
  v_dispatch JSONB;
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

  IF v_new_status = 'waiting'
     AND (p_technician_id IS NULL OR p_technician_id IS DISTINCT FROM old_row.technician_id)
     AND old_row.technician_id IS NOT NULL THEN
    PERFORM set_technician_workstation_status(old_row.technician_id, 'available', true);
  END IF;

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
    technician_id = CASE
      WHEN v_new_status = 'waiting' AND p_technician_id IS NULL THEN NULL
      ELSE COALESCE(p_technician_id, technician_id)
    END,
    start_time = COALESCE(p_start_time, start_time),
    scheduled_at = COALESCE(p_scheduled_at, scheduled_at),
    notes = COALESCE(p_notes, notes),
    metadata = COALESCE(p_metadata, metadata)
  WHERE id = appointment_id;

  IF v_new_status = 'waiting'
     AND old_row.status IS DISTINCT FROM 'waiting'
     AND old_row.technician_id IS NOT NULL
     AND is_lobby_auto_assign_enabled() THEN
    v_dispatch := dispatch_cumulative_effort(appointment_id);
    SELECT jsonb_build_object('success', true, 'dispatch', v_dispatch) INTO result;
    RETURN result;
  END IF;

  SELECT jsonb_build_object('success', true) INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION is_lobby_auto_assign_enabled() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_lobby_auto_assign_enabled() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION set_lobby_auto_assign_enabled(TEXT, BOOLEAN) TO anon, authenticated;
