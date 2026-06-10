-- Migration 053: Fix staff recipient counting and validation for "both" audience
-- Run after 052_announcement_attachments.sql

-- Inline staff pool query to avoid nested SETOF edge cases in plpgsql.
CREATE OR REPLACE FUNCTION announcement_resolve_staff_ids(
  p_staff_target_mode text,
  p_staff_profile_ids uuid[]
)
RETURNS SETOF uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode text;
  v_ids uuid[];
BEGIN
  v_mode := COALESCE(p_staff_target_mode, 'all');
  v_ids := COALESCE(p_staff_profile_ids, ARRAY[]::uuid[]);

  IF v_mode = 'all' THEN
    RETURN QUERY
    SELECT p.id
    FROM profiles p
    WHERE p.role = ANY(announcement_staff_roles())
    ORDER BY p.id;
    RETURN;
  END IF;

  IF v_mode = 'only' THEN
    RETURN QUERY
    SELECT p.id
    FROM profiles p
    WHERE p.id = ANY(v_ids)
      AND p.role = ANY(announcement_staff_roles())
    ORDER BY p.id;
    RETURN;
  END IF;

  -- exclude
  RETURN QUERY
  SELECT p.id
  FROM profiles p
  WHERE p.role = ANY(announcement_staff_roles())
    AND (cardinality(v_ids) = 0 OR NOT (p.id = ANY(v_ids)))
  ORDER BY p.id;
END;
$$;

CREATE OR REPLACE FUNCTION announcement_count_recipients(
  p_audience text,
  p_staff_target_mode text DEFAULT 'all',
  p_staff_profile_ids uuid[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_count int := 0;
  v_staff_count int := 0;
  v_total int := 0;
BEGIN
  IF p_audience IN ('customers', 'both') THEN
    SELECT COUNT(*)::int INTO v_customer_count
    FROM profiles p
    WHERE p.role = 'customer';
  END IF;

  IF p_audience IN ('staff', 'both') THEN
    SELECT COUNT(*)::int INTO v_staff_count
    FROM announcement_resolve_staff_ids(
      p_staff_target_mode,
      p_staff_profile_ids
    ) AS staff_ids(id);
  END IF;

  IF p_audience = 'both' THEN
    v_total := v_customer_count + v_staff_count;
  ELSE
    v_total := v_customer_count + v_staff_count;
  END IF;

  RETURN jsonb_build_object(
    'total', v_total,
    'customer_count', v_customer_count,
    'staff_count', v_staff_count
  );
END;
$$;

-- Only require staff recipients when audience is staff-only.
-- "both" may still send to customers when staff pool is empty.
CREATE OR REPLACE FUNCTION announcement_validate_staff_targeting(
  p_audience text,
  p_staff_target_mode text,
  p_staff_profile_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_count int;
  v_invalid_count int;
BEGIN
  IF p_audience = 'customers' THEN
    RETURN;
  END IF;

  IF p_staff_target_mode = 'only' AND COALESCE(cardinality(p_staff_profile_ids), 0) = 0 THEN
    RAISE EXCEPTION 'Select at least one staff member when using only selected staff.';
  END IF;

  IF COALESCE(cardinality(p_staff_profile_ids), 0) > 0 THEN
    SELECT COUNT(*)::int INTO v_invalid_count
    FROM unnest(p_staff_profile_ids) AS sid(id)
    WHERE NOT EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = sid.id AND p.role = ANY(announcement_staff_roles())
    );

    IF v_invalid_count > 0 THEN
      RAISE EXCEPTION 'One or more selected staff members are invalid.';
    END IF;
  END IF;

  IF p_audience = 'staff' THEN
    SELECT COUNT(*)::int INTO v_staff_count
    FROM announcement_resolve_staff_ids(
      p_staff_target_mode,
      p_staff_profile_ids
    ) AS staff_ids(id);

    IF v_staff_count = 0 THEN
      RAISE EXCEPTION 'No staff recipients match the selected targeting.';
    END IF;
  END IF;
END;
$$;
