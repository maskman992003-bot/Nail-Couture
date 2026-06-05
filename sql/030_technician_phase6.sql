-- Migration 030: Technician Phase 6 — service checklists, appointment metadata, inventory usage RPC

-- Service-level checklist templates and default materials
ALTER TABLE services ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Per-appointment checklist progress and session data
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Extend manage_service to persist metadata
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
  result JSONB;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE phone = admin_phone;

  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner') THEN
    RAISE EXCEPTION 'Not authorized. Only super_admin, owner, or partner can manage services.';
  END IF;

  IF action = 'insert' THEN
    INSERT INTO services (name, price, duration_minutes, category, is_addon, metadata)
    VALUES (
      service_data->>'name',
      (service_data->>'price')::numeric,
      (service_data->>'duration_minutes')::int,
      service_data->>'category',
      COALESCE((service_data->>'is_addon')::boolean, false),
      COALESCE(service_data->'metadata', '{}'::jsonb)
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
      END
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

-- Extend update_appointment with metadata (checklist progress)
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
  p_metadata JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
  appt_technician_id UUID;
  appt_status TEXT;
  result JSONB;
BEGIN
  SELECT id, role INTO caller_id, caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician') THEN
    RAISE EXCEPTION 'Not authorized. Only staff can update appointments.';
  END IF;

  SELECT technician_id, status INTO appt_technician_id, appt_status
  FROM appointments WHERE id = appointment_id;

  IF appt_status IS NULL THEN
    RAISE EXCEPTION 'Appointment not found.';
  END IF;

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

  UPDATE appointments SET
    status = COALESCE(p_status, status),
    service_id = COALESCE(p_service_id, service_id),
    add_ons = COALESCE(p_add_ons, add_ons),
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

-- Atomically log inventory usage/waste and adjust stock
CREATE OR REPLACE FUNCTION log_inventory_usage(
  caller_phone TEXT,
  p_inventory_id UUID,
  p_quantity_changed INT,
  p_appointment_id UUID DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_log_type TEXT DEFAULT 'usage'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
  appt_technician_id UUID;
  appt_status TEXT;
  current_qty INT;
  item_name TEXT;
  log_reason TEXT;
  result JSONB;
BEGIN
  SELECT id, role INTO caller_id, caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician') THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  IF p_quantity_changed IS NULL OR p_quantity_changed = 0 THEN
    RAISE EXCEPTION 'quantity_changed must be non-zero.';
  END IF;

  IF p_log_type NOT IN ('usage', 'waste') THEN
    RAISE EXCEPTION 'Invalid log_type. Use usage or waste.';
  END IF;

  IF caller_role = 'technician' THEN
    IF p_appointment_id IS NULL THEN
      RAISE EXCEPTION 'Technicians must link usage to an appointment.';
    END IF;
    SELECT technician_id, status INTO appt_technician_id, appt_status
    FROM appointments WHERE id = p_appointment_id;
    IF appt_technician_id IS NULL OR appt_technician_id != caller_id THEN
      RAISE EXCEPTION 'You can only log usage for your own appointments.';
    END IF;
    IF appt_status != 'serving' THEN
      RAISE EXCEPTION 'Can only log usage during an active service.';
    END IF;
  END IF;

  SELECT quantity, item_name INTO current_qty, item_name
  FROM inventory WHERE id = p_inventory_id;

  IF item_name IS NULL THEN
    RAISE EXCEPTION 'Inventory item not found.';
  END IF;

  IF current_qty + p_quantity_changed < 0 THEN
    RAISE EXCEPTION 'Insufficient stock for %.', item_name;
  END IF;

  log_reason := COALESCE(p_reason, p_log_type);

  INSERT INTO inventory_logs (
    inventory_id, appointment_id, customer_id, quantity_changed, reason
  ) VALUES (
    p_inventory_id, p_appointment_id, p_customer_id, p_quantity_changed, log_reason
  );

  UPDATE inventory
  SET quantity = quantity + p_quantity_changed, updated_at = now()
  WHERE id = p_inventory_id;

  SELECT jsonb_build_object(
    'success', true,
    'item_name', item_name,
    'new_quantity', current_qty + p_quantity_changed
  ) INTO result;
  RETURN result;
END;
$$;
