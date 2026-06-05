-- Migration 033: Fix ambiguous item_name in log_inventory_usage
-- PL/pgSQL variable item_name shadowed inventory.item_name in SELECT.

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
  v_item_name TEXT;
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

  SELECT i.quantity, i.item_name INTO current_qty, v_item_name
  FROM inventory i WHERE i.id = p_inventory_id;

  IF v_item_name IS NULL THEN
    RAISE EXCEPTION 'Inventory item not found.';
  END IF;

  IF current_qty + p_quantity_changed < 0 THEN
    RAISE EXCEPTION 'Insufficient stock for %.', v_item_name;
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
    'item_name', v_item_name,
    'new_quantity', current_qty + p_quantity_changed
  ) INTO result;
  RETURN result;
END;
$$;
