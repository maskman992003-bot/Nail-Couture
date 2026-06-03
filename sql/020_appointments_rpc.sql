-- Migration 020: SECURITY DEFINER RPCs for appointments
-- The app uses custom localStorage auth (no Supabase Auth sessions),
-- so auth.uid() is always null. RLS policies can't use auth.uid().
-- These RPCs bypass RLS and authorize by looking up role from profiles via phone.

-- ============================================================
-- STAFF RPC: fetch appointments with joins (authorized by role)
-- ============================================================
CREATE OR REPLACE FUNCTION get_appointments(
  caller_phone TEXT,
  status_filter TEXT DEFAULT NULL,
  date_from TIMESTAMPTZ DEFAULT NULL,
  date_to TIMESTAMPTZ DEFAULT NULL,
  customer_id_filter UUID DEFAULT NULL,
  technician_id_filter UUID DEFAULT NULL,
  count_only BOOLEAN DEFAULT false
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
    RAISE EXCEPTION 'Not authorized. Only staff can call this.';
  END IF;

  IF count_only THEN
    SELECT jsonb_build_object('count', (
      SELECT COUNT(*)::int FROM appointments a
      WHERE (status_filter IS NULL OR a.status = ANY(string_to_array(status_filter, ',')))
        AND (date_from IS NULL OR a.checked_in_at >= date_from)
        AND (date_to IS NULL OR a.checked_in_at < date_to)
        AND (customer_id_filter IS NULL OR a.customer_id = customer_id_filter)
        AND (technician_id_filter IS NULL OR a.technician_id = technician_id_filter)
    )) INTO result;
  ELSE
    SELECT jsonb_agg(sub.* ORDER BY sub.checked_in_at DESC) INTO result FROM (
      SELECT
        a.*,
        row_to_json(srv.*)::jsonb AS services,
        row_to_json(cust.*)::jsonb AS customer,
        row_to_json(tech.*)::jsonb AS technician
      FROM appointments a
      LEFT JOIN services srv ON srv.id = a.service_id
      LEFT JOIN profiles cust ON cust.id = a.customer_id
      LEFT JOIN profiles tech ON tech.id = a.technician_id
      WHERE (status_filter IS NULL OR a.status = ANY(string_to_array(status_filter, ',')))
        AND (date_from IS NULL OR a.checked_in_at >= date_from)
        AND (date_to IS NULL OR a.checked_in_at < date_to)
        AND (customer_id_filter IS NULL OR a.customer_id = customer_id_filter)
        AND (technician_id_filter IS NULL OR a.technician_id = technician_id_filter)
    ) sub;
  END IF;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- ============================================================
-- CUSTOMER RPC: fetch own appointments (authorized by customer_id)
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_appointments(
  customer_id UUID,
  status_filter TEXT DEFAULT NULL,
  booking_type_filter TEXT DEFAULT NULL,
  count_only BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  IF count_only THEN
    SELECT jsonb_build_object('count', (
      SELECT COUNT(*)::int FROM appointments a
      WHERE a.customer_id = customer_id
        AND (status_filter IS NULL OR a.status = status_filter)
        AND (booking_type_filter IS NULL OR a.booking_type = booking_type_filter)
    )) INTO result;
  ELSE
    SELECT jsonb_agg(sub.* ORDER BY sub.checked_in_at DESC, sub.scheduled_at DESC) INTO result FROM (
      SELECT
        a.*,
        row_to_json(srv.*)::jsonb AS services,
        row_to_json(tech.*)::jsonb AS technician
      FROM appointments a
      LEFT JOIN services srv ON srv.id = a.service_id
      LEFT JOIN profiles tech ON tech.id = a.technician_id
      WHERE a.customer_id = customer_id
        AND (status_filter IS NULL OR a.status = ANY(string_to_array(status_filter, ',')))
        AND (booking_type_filter IS NULL OR a.booking_type = booking_type_filter)
    ) sub;
  END IF;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- ============================================================
-- NOTE: The anon SELECT policy is kept for now until all customer-
-- facing components are migrated to use get_my_appointments RPC.
-- Future migration will drop: DROP POLICY IF EXISTS "Allow anon read appointments" ON appointments;
-- ============================================================
