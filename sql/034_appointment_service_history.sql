-- Migration 034: Appointment service change audit log
-- Tracks check-in services, later additions, and who made each change.

-- ============================================================
-- 1) appointment_service_history table
-- ============================================================
CREATE TABLE IF NOT EXISTS appointment_service_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  changed_by_name text,
  change_source text NOT NULL DEFAULT 'check_in'
    CHECK (change_source IN ('check_in', 'kiosk', 'technician', 'admin_lobby', 'customer_kiosk')),
  previous_service_names text,
  new_service_names text,
  previous_addons text,
  new_addons text,
  previous_final_price numeric,
  new_final_price numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointment_service_history_appt
  ON appointment_service_history (appointment_id, created_at ASC);

ALTER TABLE appointment_service_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read appointment_service_history" ON appointment_service_history;
CREATE POLICY "Allow anon read appointment_service_history"
  ON appointment_service_history FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon insert appointment_service_history" ON appointment_service_history;
CREATE POLICY "Allow anon insert appointment_service_history"
  ON appointment_service_history FOR INSERT TO anon WITH CHECK (true);

-- ============================================================
-- 2) Helper: resolve display service names from appointment fields
-- ============================================================
CREATE OR REPLACE FUNCTION resolve_appointment_service_names(
  p_service_id BIGINT,
  p_selected_service_names TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  IF p_selected_service_names IS NOT NULL AND trim(p_selected_service_names) != '' THEN
    RETURN p_selected_service_names;
  END IF;
  IF p_service_id IS NOT NULL THEN
    RETURN (SELECT name FROM services WHERE id = p_service_id);
  END IF;
  RETURN NULL;
END;
$$;

-- ============================================================
-- 3) Helper: log a service change row
-- ============================================================
CREATE OR REPLACE FUNCTION log_appointment_service_change(
  p_appointment_id UUID,
  p_changed_by UUID,
  p_changed_by_name TEXT,
  p_change_source TEXT,
  p_previous_service_names TEXT,
  p_new_service_names TEXT,
  p_previous_addons TEXT,
  p_new_addons TEXT,
  p_previous_final_price NUMERIC,
  p_new_final_price NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_appointment_id IS NULL THEN
    RETURN;
  END IF;

  IF p_previous_service_names IS NOT DISTINCT FROM p_new_service_names
     AND p_previous_addons IS NOT DISTINCT FROM p_new_addons
     AND p_previous_final_price IS NOT DISTINCT FROM p_new_final_price THEN
    RETURN;
  END IF;

  INSERT INTO appointment_service_history (
    appointment_id,
    changed_by,
    changed_by_name,
    change_source,
    previous_service_names,
    new_service_names,
    previous_addons,
    new_addons,
    previous_final_price,
    new_final_price
  ) VALUES (
    p_appointment_id,
    p_changed_by,
    COALESCE(NULLIF(trim(p_changed_by_name), ''), 'Staff'),
    p_change_source,
    p_previous_service_names,
    p_new_service_names,
    p_previous_addons,
    p_new_addons,
    p_previous_final_price,
    p_new_final_price
  );
END;
$$;

-- ============================================================
-- 4) Trigger: log check-in services on direct appointment INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION trg_log_appointment_service_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_names TEXT;
  v_changed_by_name TEXT;
BEGIN
  v_service_names := resolve_appointment_service_names(NEW.service_id, NEW.selected_service_names);

  IF v_service_names IS NULL AND NEW.add_ons IS NULL AND NEW.final_price IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.checked_in_by IS NOT NULL THEN
    SELECT full_name INTO v_changed_by_name FROM profiles WHERE id = NEW.checked_in_by;
  END IF;

  PERFORM log_appointment_service_change(
    NEW.id,
    NEW.checked_in_by,
    COALESCE(v_changed_by_name, 'Kiosk'),
    'check_in',
    NULL,
    v_service_names,
    NULL,
    NEW.add_ons,
    NULL,
    NEW.final_price
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointment_service_history_insert ON appointments;
CREATE TRIGGER trg_appointment_service_history_insert
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION trg_log_appointment_service_on_insert();

-- ============================================================
-- 5) Backfill existing visits (best-effort check-in snapshot)
-- ============================================================
INSERT INTO appointment_service_history (
  appointment_id,
  change_source,
  new_service_names,
  new_addons,
  new_final_price,
  created_at
)
SELECT
  a.id,
  'check_in',
  resolve_appointment_service_names(a.service_id, a.selected_service_names),
  a.add_ons,
  a.final_price,
  COALESCE(a.checked_in_at, a.created_at)
FROM appointments a
WHERE (a.selected_service_names IS NOT NULL OR a.service_id IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM appointment_service_history h WHERE h.appointment_id = a.id
  );

-- ============================================================
-- 6) Extend update_appointment — selected_service_names + audit log
-- ============================================================
DROP FUNCTION IF EXISTS update_appointment(
  TEXT, UUID, TEXT, BIGINT, TEXT, NUMERIC, TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, JSONB
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

-- ============================================================
-- 7) Extend update_my_appointment — audit log for customer kiosk
-- ============================================================
CREATE OR REPLACE FUNCTION update_my_appointment(
  caller_phone TEXT,
  appointment_id UUID,
  p_service_id BIGINT DEFAULT NULL,
  p_add_ons TEXT DEFAULT NULL,
  p_final_price NUMERIC DEFAULT NULL,
  p_refreshment_pref TEXT DEFAULT NULL,
  p_scheduled_at TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_selected_service_names TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  caller_name TEXT;
  old_row appointments%ROWTYPE;
  old_service_names TEXT;
  new_service_names TEXT;
  new_addons TEXT;
  new_final_price NUMERIC;
  result JSONB;
BEGIN
  SELECT id, full_name INTO caller_id, caller_name FROM profiles WHERE phone = caller_phone;
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for this phone number.';
  END IF;

  SELECT * INTO old_row
  FROM appointments
  WHERE id = appointment_id AND customer_id = caller_id;

  IF old_row.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found or does not belong to you.';
  END IF;

  old_service_names := resolve_appointment_service_names(old_row.service_id, old_row.selected_service_names);
  new_service_names := resolve_appointment_service_names(
    COALESCE(p_service_id, old_row.service_id),
    COALESCE(p_selected_service_names, old_row.selected_service_names)
  );
  new_addons := COALESCE(p_add_ons, old_row.add_ons);
  new_final_price := COALESCE(p_final_price, old_row.final_price);

  IF p_service_id IS NOT NULL
     OR p_add_ons IS NOT NULL
     OR p_final_price IS NOT NULL
     OR p_selected_service_names IS NOT NULL THEN
    PERFORM log_appointment_service_change(
      appointment_id,
      caller_id,
      COALESCE(caller_name, 'Customer'),
      'customer_kiosk',
      old_service_names,
      new_service_names,
      old_row.add_ons,
      new_addons,
      old_row.final_price,
      new_final_price
    );
  END IF;

  UPDATE appointments SET
    service_id = COALESCE(p_service_id, service_id),
    add_ons = COALESCE(p_add_ons, add_ons),
    selected_service_names = COALESCE(p_selected_service_names, selected_service_names),
    final_price = COALESCE(p_final_price, final_price),
    refreshment_pref = COALESCE(p_refreshment_pref, refreshment_pref),
    scheduled_at = COALESCE(p_scheduled_at, scheduled_at),
    notes = COALESCE(p_notes, notes)
  WHERE id = appointment_id AND customer_id = caller_id;

  SELECT jsonb_build_object('success', true) INTO result;
  RETURN result;
END;
$$;
