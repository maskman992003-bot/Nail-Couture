-- Migration 046: Multi-technician visits (additive only)
-- Run in Supabase SQL Editor after 045_fix_time_off_notification_reference.sql
-- Rollback: DROP the three new tables + new RPCs; re-run prior get_appointments/process_checkout from 035.

-- ============================================================
-- 1) New tables (no ALTER on appointments / payment_transactions)
-- ============================================================

CREATE TABLE IF NOT EXISTS appointment_service_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_id bigint REFERENCES services(id),
  service_name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  technician_id uuid REFERENCES profiles(id),
  is_addon boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_appointment_service_items_appointment
  ON appointment_service_items(appointment_id);

CREATE TABLE IF NOT EXISTS appointment_visit_technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES profiles(id),
  participation_type text NOT NULL DEFAULT 'primary'
    CHECK (participation_type IN ('primary', 'co_technician', 'handoff')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (appointment_id, technician_id, started_at)
);

CREATE INDEX IF NOT EXISTS idx_appointment_visit_technicians_appointment
  ON appointment_visit_technicians(appointment_id);

CREATE TABLE IF NOT EXISTS payment_tip_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_transaction_id uuid NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES profiles(id),
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  UNIQUE (payment_transaction_id, technician_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_tip_allocations_technician
  ON payment_tip_allocations(technician_id);

ALTER TABLE appointment_service_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_visit_technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_tip_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read appointment_service_items" ON appointment_service_items;
CREATE POLICY "Allow anon read appointment_service_items"
  ON appointment_service_items FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon read appointment_visit_technicians" ON appointment_visit_technicians;
CREATE POLICY "Allow anon read appointment_visit_technicians"
  ON appointment_visit_technicians FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon read payment_tip_allocations" ON payment_tip_allocations;
CREATE POLICY "Allow anon read payment_tip_allocations"
  ON payment_tip_allocations FOR SELECT TO anon USING (true);

-- ============================================================
-- 2) Helpers
-- ============================================================

CREATE OR REPLACE FUNCTION multi_tech_is_management_role(p_role text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_role IN ('super_admin', 'owner', 'partner', 'admin');
$$;

CREATE OR REPLACE FUNCTION multi_tech_visit_status_ok(p_status text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_status IN ('waiting', 'assigned_pending', 'serving', 'ready_for_checkout');
$$;

CREATE OR REPLACE FUNCTION multi_tech_technician_available(p_technician_id uuid, p_appointment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_prefs jsonb;
BEGIN
  SELECT role, preferences INTO v_role, v_prefs
  FROM profiles WHERE id = p_technician_id;

  IF v_role IS NULL OR v_role != 'technician' THEN
    RETURN false;
  END IF;

  IF COALESCE(v_prefs->>'workstation_status', 'available') = 'on_break' THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.id != p_appointment_id
      AND a.technician_id = p_technician_id
      AND a.status IN ('assigned_pending', 'serving')
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION sync_appointment_service_items(p_appointment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  appt RECORD;
  v_name text;
  v_sort int := 0;
  v_svc RECORD;
  v_updated int;
BEGIN
  SELECT * INTO appt FROM appointments WHERE id = p_appointment_id;
  IF appt.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found.';
  END IF;

  IF appt.selected_service_names IS NOT NULL AND appt.selected_service_names != '' THEN
    FOREACH v_name IN ARRAY string_to_array(appt.selected_service_names, ',') LOOP
      v_name := trim(v_name);
      IF v_name = '' THEN CONTINUE; END IF;
      SELECT id, price INTO v_svc FROM services WHERE name = v_name LIMIT 1;
      UPDATE appointment_service_items SET
        service_id = COALESCE(v_svc.id, appointment_service_items.service_id),
        price = COALESCE(v_svc.price, appointment_service_items.price),
        sort_order = v_sort
      WHERE appointment_id = p_appointment_id
        AND service_name = v_name
        AND is_addon = false;
      GET DIAGNOSTICS v_updated = ROW_COUNT;
      IF v_updated = 0 THEN
        INSERT INTO appointment_service_items (
          appointment_id, service_id, service_name, price, is_addon, sort_order
        ) VALUES (
          p_appointment_id, v_svc.id, v_name, COALESCE(v_svc.price, 0), false, v_sort
        );
      END IF;
      v_sort := v_sort + 1;
    END LOOP;
  ELSIF appt.service_id IS NOT NULL THEN
    SELECT id, name, price INTO v_svc FROM services WHERE id = appt.service_id;
    IF FOUND THEN
      UPDATE appointment_service_items SET
        service_id = v_svc.id,
        price = COALESCE(v_svc.price, 0),
        sort_order = 0
      WHERE appointment_id = p_appointment_id
        AND service_name = v_svc.name
        AND is_addon = false;
      GET DIAGNOSTICS v_updated = ROW_COUNT;
      IF v_updated = 0 THEN
        INSERT INTO appointment_service_items (
          appointment_id, service_id, service_name, price, is_addon, sort_order
        ) VALUES (
          p_appointment_id, v_svc.id, v_svc.name, COALESCE(v_svc.price, 0), false, 0
        );
      END IF;
    END IF;
  END IF;

  IF appt.add_ons IS NOT NULL AND appt.add_ons != '' THEN
    FOREACH v_name IN ARRAY string_to_array(appt.add_ons, ',') LOOP
      v_name := trim(v_name);
      IF v_name = '' THEN CONTINUE; END IF;
      SELECT id, price INTO v_svc FROM services WHERE name = v_name LIMIT 1;
      UPDATE appointment_service_items SET
        service_id = COALESCE(v_svc.id, appointment_service_items.service_id),
        price = COALESCE(v_svc.price, appointment_service_items.price),
        sort_order = v_sort
      WHERE appointment_id = p_appointment_id
        AND service_name = v_name
        AND is_addon = true;
      GET DIAGNOSTICS v_updated = ROW_COUNT;
      IF v_updated = 0 THEN
        INSERT INTO appointment_service_items (
          appointment_id, service_id, service_name, price, is_addon, sort_order
        ) VALUES (
          p_appointment_id, v_svc.id, v_name, COALESCE(v_svc.price, 0), true, v_sort
        );
      END IF;
      v_sort := v_sort + 1;
    END LOOP;
  END IF;
END;
$$;

-- ============================================================
-- 3) Standalone multi-tech RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION get_visit_participating_technicians(
  caller_phone text,
  p_appointment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  appt RECORD;
  v_techs jsonb;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN (
    'super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician'
  ) THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  SELECT * INTO appt FROM appointments WHERE id = p_appointment_id;
  IF appt.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found.';
  END IF;

  SELECT COALESCE(jsonb_agg(sub.* ORDER BY sub.is_primary DESC, sub.full_name), '[]'::jsonb)
  INTO v_techs
  FROM (
    SELECT DISTINCT ON (t.technician_id)
      t.technician_id,
      p.full_name,
      t.participation_type,
      t.is_active,
      (t.technician_id = appt.technician_id) AS is_primary
    FROM (
      SELECT avt.technician_id, avt.participation_type, avt.is_active
      FROM appointment_visit_technicians avt
      WHERE avt.appointment_id = p_appointment_id AND avt.is_active = true
      UNION
      SELECT appt.technician_id, 'primary'::text, true
      WHERE appt.technician_id IS NOT NULL
    ) t
    JOIN profiles p ON p.id = t.technician_id
    ORDER BY t.technician_id, t.is_active DESC
  ) sub;

  RETURN jsonb_build_object('technicians', v_techs);
END;
$$;

CREATE OR REPLACE FUNCTION assign_service_technician(
  caller_phone text,
  p_appointment_id uuid,
  p_service_item_id uuid,
  p_technician_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  appt RECORD;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE phone = caller_phone;
  IF NOT multi_tech_is_management_role(caller_role) THEN
    RAISE EXCEPTION 'Not authorized. Management role required.';
  END IF;

  SELECT * INTO appt FROM appointments WHERE id = p_appointment_id;
  IF appt.id IS NULL THEN RAISE EXCEPTION 'Appointment not found.'; END IF;
  IF NOT multi_tech_visit_status_ok(appt.status) THEN
    RAISE EXCEPTION 'Cannot assign technicians when visit status is %.', appt.status;
  END IF;
  IF NOT multi_tech_technician_available(p_technician_id, p_appointment_id) THEN
    RAISE EXCEPTION 'Technician is unavailable (busy or on break).';
  END IF;

  PERFORM sync_appointment_service_items(p_appointment_id);

  UPDATE appointment_service_items
  SET technician_id = p_technician_id
  WHERE id = p_service_item_id AND appointment_id = p_appointment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service item not found for this visit.';
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION add_visit_co_technician(
  caller_phone text,
  p_appointment_id uuid,
  p_technician_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  caller_id uuid;
  appt RECORD;
  v_co_tech_count int;
BEGIN
  SELECT id, role INTO caller_id, caller_role FROM profiles WHERE phone = caller_phone;
  IF NOT multi_tech_is_management_role(caller_role) THEN
    RAISE EXCEPTION 'Not authorized. Management role required.';
  END IF;

  SELECT * INTO appt FROM appointments WHERE id = p_appointment_id;
  IF appt.id IS NULL THEN RAISE EXCEPTION 'Appointment not found.'; END IF;
  IF NOT multi_tech_visit_status_ok(appt.status) THEN
    RAISE EXCEPTION 'Cannot add technicians when visit status is %.', appt.status;
  END IF;
  IF p_technician_id = appt.technician_id THEN
    RAISE EXCEPTION 'Technician is already the primary technician.';
  END IF;
  IF NOT multi_tech_technician_available(p_technician_id, p_appointment_id) THEN
    RAISE EXCEPTION 'Technician is unavailable (busy or on break).';
  END IF;

  IF EXISTS (
    SELECT 1 FROM appointment_visit_technicians
    WHERE appointment_id = p_appointment_id
      AND technician_id = p_technician_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Technician is already on this visit.';
  END IF;

  SELECT COUNT(*)::int INTO v_co_tech_count
  FROM appointment_visit_technicians
  WHERE appointment_id = p_appointment_id
    AND participation_type = 'co_technician'
    AND is_active = true;

  IF v_co_tech_count >= 3 THEN
    RAISE EXCEPTION 'Maximum of 3 co-technicians per visit.';
  END IF;

  INSERT INTO appointment_visit_technicians (
    appointment_id, technician_id, participation_type, is_active
  ) VALUES (
    p_appointment_id, p_technician_id, 'co_technician', true
  );

  PERFORM create_notification(
    p_technician_id,
    'Added to visit',
    format('You were added as co-technician on a visit.'),
    'visit_co_technician_added',
    p_appointment_id
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION handoff_visit_technician(
  caller_phone text,
  p_appointment_id uuid,
  p_new_technician_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  appt RECORD;
  v_old_tech uuid;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE phone = caller_phone;
  IF NOT multi_tech_is_management_role(caller_role) THEN
    RAISE EXCEPTION 'Not authorized. Management role required.';
  END IF;

  SELECT * INTO appt FROM appointments WHERE id = p_appointment_id;
  IF appt.id IS NULL THEN RAISE EXCEPTION 'Appointment not found.'; END IF;
  IF NOT multi_tech_visit_status_ok(appt.status) THEN
    RAISE EXCEPTION 'Cannot hand off when visit status is %.', appt.status;
  END IF;
  IF NOT multi_tech_technician_available(p_new_technician_id, p_appointment_id) THEN
    RAISE EXCEPTION 'Technician is unavailable (busy or on break).';
  END IF;

  v_old_tech := appt.technician_id;

  PERFORM sync_appointment_service_items(p_appointment_id);

  UPDATE appointment_visit_technicians
  SET ended_at = NOW(), is_active = false
  WHERE appointment_id = p_appointment_id
    AND technician_id = v_old_tech
    AND is_active = true
    AND participation_type IN ('primary', 'handoff');

  INSERT INTO appointment_visit_technicians (
    appointment_id, technician_id, participation_type, is_active
  ) VALUES (
    p_appointment_id, p_new_technician_id, 'handoff', true
  );

  UPDATE appointments SET technician_id = p_new_technician_id WHERE id = p_appointment_id;

  RETURN jsonb_build_object('success', true, 'previous_technician_id', v_old_tech);
END;
$$;

CREATE OR REPLACE FUNCTION remove_visit_technician(
  caller_phone text,
  p_appointment_id uuid,
  p_technician_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  appt RECORD;
  v_participation text;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE phone = caller_phone;
  IF NOT multi_tech_is_management_role(caller_role) THEN
    RAISE EXCEPTION 'Not authorized. Management role required.';
  END IF;

  SELECT * INTO appt FROM appointments WHERE id = p_appointment_id;
  IF appt.id IS NULL THEN RAISE EXCEPTION 'Appointment not found.'; END IF;
  IF NOT multi_tech_visit_status_ok(appt.status) THEN
    RAISE EXCEPTION 'Cannot remove technicians when visit status is %.', appt.status;
  END IF;

  IF p_technician_id = appt.technician_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM appointment_visit_technicians
      WHERE appointment_id = p_appointment_id
        AND technician_id != p_technician_id
        AND is_active = true
    ) AND NOT EXISTS (
      SELECT 1 FROM appointment_service_items
      WHERE appointment_id = p_appointment_id
        AND technician_id IS NOT NULL
        AND technician_id != p_technician_id
    ) THEN
      RAISE EXCEPTION 'Cannot remove the sole primary technician while visit is active.';
    END IF;
  END IF;

  UPDATE appointment_visit_technicians
  SET ended_at = NOW(), is_active = false
  WHERE appointment_id = p_appointment_id
    AND technician_id = p_technician_id
    AND is_active = true;

  UPDATE appointment_service_items
  SET technician_id = NULL
  WHERE appointment_id = p_appointment_id
    AND technician_id = p_technician_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 4) Extend get_appointments (optional param only)
-- ============================================================

DROP FUNCTION IF EXISTS get_appointments(text, text, timestamptz, timestamptz, uuid, uuid, boolean, boolean);

CREATE OR REPLACE FUNCTION get_appointments(
  caller_phone text,
  status_filter text DEFAULT NULL,
  date_from timestamptz DEFAULT NULL,
  date_to timestamptz DEFAULT NULL,
  customer_id_filter uuid DEFAULT NULL,
  technician_id_filter uuid DEFAULT NULL,
  count_only boolean DEFAULT false,
  order_asc boolean DEFAULT false,
  p_include_co_technician_visits boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  result jsonb;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN (
    'super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician'
  ) THEN
    RAISE EXCEPTION 'Not authorized. Only staff can call this.';
  END IF;

  IF count_only THEN
    SELECT jsonb_build_object('count', (
      SELECT COUNT(*)::int FROM appointments a
      WHERE (status_filter IS NULL OR a.status = ANY(string_to_array(status_filter, ',')))
        AND (date_from IS NULL OR a.checked_in_at >= date_from)
        AND (date_to IS NULL OR a.checked_in_at < date_to)
        AND (customer_id_filter IS NULL OR a.customer_id = customer_id_filter)
        AND (
          technician_id_filter IS NULL
          OR a.technician_id = technician_id_filter
          OR (
            p_include_co_technician_visits
            AND (
              EXISTS (
                SELECT 1 FROM appointment_visit_technicians avt
                WHERE avt.appointment_id = a.id AND avt.technician_id = technician_id_filter
              )
              OR EXISTS (
                SELECT 1 FROM appointment_service_items asi
                WHERE asi.appointment_id = a.id AND asi.technician_id = technician_id_filter
              )
            )
          )
        )
    )) INTO result;
  ELSE
    IF order_asc THEN
      SELECT jsonb_agg(sub.* ORDER BY sub.checked_in_at ASC) INTO result FROM (
        SELECT
          a.*,
          row_to_json(srv.*)::jsonb AS services,
          row_to_json(cust.*)::jsonb AS customer,
          row_to_json(tech.*)::jsonb AS technician,
          COALESCE((
            SELECT jsonb_agg(row_to_json(si.*)::jsonb ORDER BY si.sort_order, si.service_name)
            FROM appointment_service_items si WHERE si.appointment_id = a.id
          ), '[]'::jsonb) AS service_items,
          COALESCE((
            SELECT jsonb_agg(row_to_json(vt.*)::jsonb ORDER BY vt.started_at)
            FROM appointment_visit_technicians vt WHERE vt.appointment_id = a.id
          ), '[]'::jsonb) AS visit_technicians
        FROM appointments a
        LEFT JOIN services srv ON srv.id = a.service_id
        LEFT JOIN profiles cust ON cust.id = a.customer_id
        LEFT JOIN profiles tech ON tech.id = a.technician_id
        WHERE (status_filter IS NULL OR a.status = ANY(string_to_array(status_filter, ',')))
          AND (date_from IS NULL OR a.checked_in_at >= date_from)
          AND (date_to IS NULL OR a.checked_in_at < date_to)
          AND (customer_id_filter IS NULL OR a.customer_id = customer_id_filter)
          AND (
            technician_id_filter IS NULL
            OR a.technician_id = technician_id_filter
            OR (
              p_include_co_technician_visits
              AND (
                EXISTS (
                  SELECT 1 FROM appointment_visit_technicians avt
                  WHERE avt.appointment_id = a.id AND avt.technician_id = technician_id_filter
                )
                OR EXISTS (
                  SELECT 1 FROM appointment_service_items asi
                  WHERE asi.appointment_id = a.id AND asi.technician_id = technician_id_filter
                )
              )
            )
          )
      ) sub;
    ELSE
      SELECT jsonb_agg(sub.* ORDER BY sub.checked_in_at DESC) INTO result FROM (
        SELECT
          a.*,
          row_to_json(srv.*)::jsonb AS services,
          row_to_json(cust.*)::jsonb AS customer,
          row_to_json(tech.*)::jsonb AS technician,
          COALESCE((
            SELECT jsonb_agg(row_to_json(si.*)::jsonb ORDER BY si.sort_order, si.service_name)
            FROM appointment_service_items si WHERE si.appointment_id = a.id
          ), '[]'::jsonb) AS service_items,
          COALESCE((
            SELECT jsonb_agg(row_to_json(vt.*)::jsonb ORDER BY vt.started_at)
            FROM appointment_visit_technicians vt WHERE vt.appointment_id = a.id
          ), '[]'::jsonb) AS visit_technicians
        FROM appointments a
        LEFT JOIN services srv ON srv.id = a.service_id
        LEFT JOIN profiles cust ON cust.id = a.customer_id
        LEFT JOIN profiles tech ON tech.id = a.technician_id
        WHERE (status_filter IS NULL OR a.status = ANY(string_to_array(status_filter, ',')))
          AND (date_from IS NULL OR a.checked_in_at >= date_from)
          AND (date_to IS NULL OR a.checked_in_at < date_to)
          AND (customer_id_filter IS NULL OR a.customer_id = customer_id_filter)
          AND (
            technician_id_filter IS NULL
            OR a.technician_id = technician_id_filter
            OR (
              p_include_co_technician_visits
              AND (
                EXISTS (
                  SELECT 1 FROM appointment_visit_technicians avt
                  WHERE avt.appointment_id = a.id AND avt.technician_id = technician_id_filter
                )
                OR EXISTS (
                  SELECT 1 FROM appointment_service_items asi
                  WHERE asi.appointment_id = a.id AND asi.technician_id = technician_id_filter
                )
              )
            )
          )
      ) sub;
    END IF;
  END IF;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- ============================================================
-- 5) Extend process_checkout (optional p_tip_allocations)
-- ============================================================

DROP FUNCTION IF EXISTS process_checkout(
  text, uuid, numeric, numeric, text, numeric, text, text, integer, text, numeric
);

CREATE OR REPLACE FUNCTION process_checkout(
  caller_phone text,
  appointment_id uuid,
  p_amount numeric DEFAULT NULL,
  p_discount_amount numeric DEFAULT 0,
  p_discount_type text DEFAULT NULL,
  p_final_amount numeric DEFAULT NULL,
  p_payment_method text DEFAULT 'card',
  p_notes text DEFAULT NULL,
  p_loyalty_points_redeem integer DEFAULT 0,
  p_loyalty_reward_name text DEFAULT NULL,
  p_extras_amount numeric DEFAULT 0,
  p_tip_allocations jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid;
  caller_role text;
  appt RECORD;
  v_amount numeric;
  v_extras numeric;
  v_discount numeric;
  v_final numeric;
  v_discount_type text;
  v_payment_method text;
  v_points_earned integer;
  v_inventory_id uuid;
  v_refreshment text;
  v_loyalty_redeem integer;
  v_loyalty_name text;
  payment_id uuid;
  result jsonb;
  alloc jsonb;
  alloc_sum numeric := 0;
  tipped_tech uuid;
BEGIN
  SELECT id, role INTO caller_id, caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN ('cashier', 'super_admin', 'owner', 'partner') THEN
    RAISE EXCEPTION 'Not authorized. Only cashier or management can process checkout.';
  END IF;

  SELECT a.*, p.refreshment_pref AS customer_refreshment
  INTO appt
  FROM appointments a
  LEFT JOIN profiles p ON p.id = a.customer_id
  WHERE a.id = appointment_id;

  IF appt.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found.';
  END IF;

  IF appt.status NOT IN ('ready_for_checkout', 'serving') THEN
    RAISE EXCEPTION 'Appointment is not ready for checkout (status: %).', appt.status;
  END IF;

  v_extras := COALESCE(p_extras_amount, 0);
  v_amount := COALESCE(p_amount, appt.final_price, 0);
  v_discount := LEAST(COALESCE(p_discount_amount, 0), v_amount);

  IF appt.loyalty_points_cost IS NOT NULL AND appt.loyalty_points_cost > 0 THEN
    v_loyalty_redeem := appt.loyalty_points_cost;
    v_loyalty_name := appt.loyalty_reward_name;
    IF v_discount = 0 AND COALESCE(appt.loyalty_discount_amount, 0) > 0 THEN
      v_discount := LEAST(appt.loyalty_discount_amount, v_amount);
    END IF;
  ELSE
    v_loyalty_redeem := COALESCE(p_loyalty_points_redeem, 0);
    v_loyalty_name := p_loyalty_reward_name;
  END IF;

  v_final := COALESCE(p_final_amount, GREATEST(v_amount - v_discount, 0) + v_extras);

  v_discount_type := CASE
    WHEN p_discount_type IN ('percentage', 'fixed', 'loyalty', 'coupon') THEN p_discount_type
    WHEN p_discount_type = 'percent' THEN 'percentage'
    WHEN p_discount_type = 'amount' THEN 'fixed'
    WHEN v_discount > 0 AND v_loyalty_redeem > 0 THEN 'loyalty'
    WHEN v_discount > 0 THEN 'fixed'
    ELSE NULL
  END;

  v_payment_method := CASE
    WHEN lower(p_payment_method) IN ('cash', 'card', 'other') THEN lower(p_payment_method)
    WHEN lower(p_payment_method) = 'transfer' THEN 'other'
    ELSE 'card'
  END;

  IF v_loyalty_redeem > 0 AND appt.customer_id IS NOT NULL THEN
    PERFORM redeem_loyalty_reward(
      appt.customer_id,
      v_loyalty_redeem,
      COALESCE(v_loyalty_name, 'Checkout redemption')
    );
  END IF;

  INSERT INTO payment_transactions (
    appointment_id, customer_id, technician_id, cashier_id, service_id,
    amount, extras_amount, discount_amount, discount_type, final_amount,
    payment_method, status, notes
  ) VALUES (
    appointment_id, appt.customer_id, appt.technician_id, caller_id, appt.service_id,
    v_amount, v_extras, v_discount, v_discount_type, v_final,
    v_payment_method, 'completed', p_notes
  )
  RETURNING id INTO payment_id;

  -- Tip allocations (default: 100% to lead technician — same outcome as before)
  IF p_tip_allocations IS NOT NULL
    AND jsonb_typeof(p_tip_allocations) = 'array'
    AND jsonb_array_length(p_tip_allocations) > 0
  THEN
    FOR alloc IN SELECT * FROM jsonb_array_elements(p_tip_allocations) LOOP
      alloc_sum := alloc_sum + COALESCE((alloc->>'amount')::numeric, 0);
      INSERT INTO payment_tip_allocations (
        payment_transaction_id, technician_id, amount
      ) VALUES (
        payment_id,
        (alloc->>'technician_id')::uuid,
        COALESCE((alloc->>'amount')::numeric, 0)
      );
    END LOOP;
    IF round(alloc_sum::numeric, 2) != round(v_extras::numeric, 2) THEN
      RAISE EXCEPTION 'Tip allocations must sum to total tip (got %, expected %).', alloc_sum, v_extras;
    END IF;
  ELSIF v_extras > 0 AND appt.technician_id IS NOT NULL THEN
    INSERT INTO payment_tip_allocations (
      payment_transaction_id, technician_id, amount
    ) VALUES (
      payment_id, appt.technician_id, v_extras
    );
  END IF;

  UPDATE appointments SET
    status = 'completed',
    completed_at = NOW(),
    final_price = v_final,
    loyalty_reward_id = NULL,
    loyalty_reward_name = NULL,
    loyalty_points_cost = NULL,
    loyalty_discount_amount = NULL,
    loyalty_redemption_code = NULL
  WHERE id = appointment_id;

  v_refreshment := appt.customer_refreshment;
  IF v_refreshment IS NOT NULL AND v_refreshment != '' THEN
    SELECT id INTO v_inventory_id
    FROM inventory
    WHERE item_name = v_refreshment AND category = 'refreshment'
    LIMIT 1;

    IF v_inventory_id IS NOT NULL THEN
      INSERT INTO inventory_logs (
        inventory_id, appointment_id, customer_id, quantity_changed, reason
      ) VALUES (
        v_inventory_id, appointment_id, appt.customer_id, -1, 'Consumed during service'
      );

      UPDATE inventory
      SET quantity = GREATEST(quantity - 1, 0)
      WHERE id = v_inventory_id;
    END IF;
  END IF;

  IF appt.customer_id IS NOT NULL AND v_final > 0 THEN
    v_points_earned := FLOOR(v_final)::integer;
    IF v_points_earned > 0 THEN
      PERFORM award_loyalty_points(
        appt.customer_id,
        v_points_earned,
        'Points earned from visit checkout',
        'earn',
        appointment_id
      );
    END IF;
  END IF;

  IF appt.customer_id IS NOT NULL THEN
    PERFORM create_notification(
      appt.customer_id,
      'Payment receipt',
      format('Receipt: $%s paid via %s.', trim(to_char(v_final, '999990.99')), v_payment_method),
      'payment_receipt',
      appointment_id,
      jsonb_build_object('payment_id', payment_id, 'final_amount', v_final)
    );
    IF COALESCE(v_points_earned, 0) > 0 THEN
      PERFORM create_notification(
        appt.customer_id,
        'Points earned',
        format('+%s loyalty points earned from your visit.', v_points_earned),
        'loyalty_earned',
        appointment_id,
        jsonb_build_object('points', v_points_earned)
      );
    END IF;
  END IF;

  -- Notify lead technician (unchanged)
  IF appt.technician_id IS NOT NULL THEN
    PERFORM create_notification(
      appt.technician_id,
      'Checkout complete',
      format('Checkout completed for your client ($%s).', trim(to_char(v_final, '999990.99'))),
      'your_client_checkout',
      appointment_id
    );
  END IF;

  -- Notify all tipped technicians (multi-tech)
  FOR tipped_tech IN
    SELECT DISTINCT technician_id FROM payment_tip_allocations
    WHERE payment_transaction_id = payment_id
      AND amount > 0
      AND technician_id IS DISTINCT FROM appt.technician_id
  LOOP
    PERFORM create_notification(
      tipped_tech,
      'Tip received',
      format('You received a $%s tip from a visit checkout.', trim(to_char(
        (SELECT amount FROM payment_tip_allocations
         WHERE payment_transaction_id = payment_id AND technician_id = tipped_tech),
        '999990.99'
      ))),
      'tip_received',
      appointment_id,
      jsonb_build_object('payment_id', payment_id)
    );
  END LOOP;

  SELECT jsonb_build_object(
    'success', true,
    'payment_id', payment_id,
    'final_amount', v_final,
    'points_earned', COALESCE(v_points_earned, 0)
  ) INTO result;

  RETURN result;
END;
$$;
