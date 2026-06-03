-- Migration 022: SECURITY DEFINER RPCs for appointment management
-- The app uses custom localStorage auth (no Supabase Auth sessions),
-- so auth.role() is always 'anon'. Direct UPDATE/DELETE on appointments
-- is blocked because the only UPDATE/DELETE policies are TO authenticated.
-- These RPCs bypass RLS and authorize by phone-based role lookup.

-- Drop old overloaded versions (parameter type change)
DROP FUNCTION IF EXISTS cancel_appointment(TEXT, BIGINT);
DROP FUNCTION IF EXISTS start_appointment(TEXT, BIGINT);
DROP FUNCTION IF EXISTS update_appointment(TEXT, BIGINT, TEXT, BIGINT, TEXT, NUMERIC, TEXT, UUID, TIMESTAMPTZ, TEXT);
DROP FUNCTION IF EXISTS update_appointment(TEXT, UUID, TEXT, BIGINT, TEXT, NUMERIC, TEXT, UUID, TIMESTAMPTZ, TEXT);

-- ============================================================
-- Staff: Cancel any appointment
-- ============================================================
CREATE OR REPLACE FUNCTION cancel_appointment(
  caller_phone TEXT,
  appointment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  result JSONB;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician') THEN
    RAISE EXCEPTION 'Not authorized. Only staff can cancel appointments.';
  END IF;

  UPDATE appointments SET status = 'cancelled' WHERE id = appointment_id;

  SELECT jsonb_build_object('success', true) INTO result;
  RETURN result;
END;
$$;

-- ============================================================
-- Staff: Start serving an appointment
-- ============================================================
CREATE OR REPLACE FUNCTION start_appointment(
  caller_phone TEXT,
  appointment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  result JSONB;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician') THEN
    RAISE EXCEPTION 'Not authorized. Only staff can start appointments.';
  END IF;

  UPDATE appointments SET status = 'serving', start_time = NOW() WHERE id = appointment_id;

  SELECT jsonb_build_object('success', true) INTO result;
  RETURN result;
END;
$$;

-- ============================================================
-- Staff: Update appointment fields
-- ============================================================
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
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  result JSONB;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician') THEN
    RAISE EXCEPTION 'Not authorized. Only staff can update appointments.';
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
    notes = COALESCE(p_notes, notes)
  WHERE id = appointment_id;

  SELECT jsonb_build_object('success', true) INTO result;
  RETURN result;
END;
$$;

-- ============================================================
-- Staff: Delete an appointment
-- ============================================================
CREATE OR REPLACE FUNCTION delete_appointment(
  caller_phone TEXT,
  appointment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  result JSONB;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician') THEN
    RAISE EXCEPTION 'Not authorized. Only staff can delete appointments.';
  END IF;

  DELETE FROM appointments WHERE id = appointment_id;

  SELECT jsonb_build_object('success', true) INTO result;
  RETURN result;
END;
$$;

-- ============================================================
-- Staff: Update a customer profile field
-- ============================================================
CREATE OR REPLACE FUNCTION update_profile_field(
  caller_phone TEXT,
  profile_id UUID,
  field_name TEXT,
  field_value TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  result JSONB;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician') THEN
    RAISE EXCEPTION 'Not authorized. Only staff can update profiles.';
  END IF;

  EXECUTE format('UPDATE profiles SET %I = $1 WHERE id = $2', field_name) USING field_value, profile_id;

  SELECT jsonb_build_object('success', true) INTO result;
  RETURN result;
END;
$$;

-- ============================================================
-- Customer: Cancel own appointment (checks phone match)
-- ============================================================
CREATE OR REPLACE FUNCTION cancel_my_appointment(
  caller_phone TEXT,
  appointment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  result JSONB;
BEGIN
  SELECT id INTO caller_id FROM profiles WHERE phone = caller_phone;
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for this phone number.';
  END IF;

  UPDATE appointments SET status = 'cancelled'
  WHERE id = appointment_id AND customer_id = caller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found or does not belong to you.';
  END IF;

  SELECT jsonb_build_object('success', true) INTO result;
  RETURN result;
END;
$$;

-- ============================================================
-- Customer: Update own appointment services (used by kiosk check-in)
-- ============================================================
CREATE OR REPLACE FUNCTION update_my_appointment(
  caller_phone TEXT,
  appointment_id UUID,
  p_service_id BIGINT DEFAULT NULL,
  p_add_ons TEXT DEFAULT NULL,
  p_final_price NUMERIC DEFAULT NULL,
  p_refreshment_pref TEXT DEFAULT NULL,
  p_scheduled_at TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  result JSONB;
BEGIN
  SELECT id INTO caller_id FROM profiles WHERE phone = caller_phone;
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for this phone number.';
  END IF;

  UPDATE appointments SET
    service_id = COALESCE(p_service_id, service_id),
    add_ons = COALESCE(p_add_ons, add_ons),
    final_price = COALESCE(p_final_price, final_price),
    refreshment_pref = COALESCE(p_refreshment_pref, refreshment_pref),
    scheduled_at = COALESCE(p_scheduled_at, scheduled_at),
    notes = COALESCE(p_notes, notes)
  WHERE id = appointment_id AND customer_id = caller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found or does not belong to you.';
  END IF;

  SELECT jsonb_build_object('success', true) INTO result;
  RETURN result;
END;
$$;

-- ============================================================
-- Staff: Complete an appointment (used by technician)
-- ============================================================
CREATE OR REPLACE FUNCTION complete_appointment(
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
  caller_role TEXT;
  result JSONB;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician') THEN
    RAISE EXCEPTION 'Not authorized. Only staff can complete appointments.';
  END IF;

  UPDATE appointments SET
    status = 'completed',
    start_time = COALESCE(start_time, NOW()),
    final_price = COALESCE(p_final_price, final_price)
  WHERE id = appointment_id;

  SELECT jsonb_build_object('success', true) INTO result;
  RETURN result;
END;
$$;
