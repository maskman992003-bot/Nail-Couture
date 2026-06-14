-- Migration 081: Show audience=all promos to every caller (including staff)
-- Run once in Supabase SQL Editor after 080_promotions_rpc_grants.sql
--
-- Previously, logged-in staff/admin callers matched neither branch and saw zero promos
-- when their phone was sent to list_active_promotions.

CREATE OR REPLACE FUNCTION list_active_promotions(
  p_caller_phone text DEFAULT NULL,
  p_surface text DEFAULT 'public_home'
)
RETURNS SETOF promotions
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_caller_role text;
  v_completed_visits int := 0;
BEGIN
  IF p_surface IS NULL OR trim(p_surface) = '' THEN
    RAISE EXCEPTION 'p_surface is required';
  END IF;

  IF p_caller_phone IS NOT NULL AND trim(p_caller_phone) <> '' THEN
    SELECT p.id, p.role::text
    INTO v_caller_id, v_caller_role
    FROM profiles p
    WHERE p.phone = p_caller_phone;

    IF v_caller_id IS NOT NULL AND v_caller_role = 'customer' THEN
      v_completed_visits := promotion_customer_completed_visits(v_caller_id);
    END IF;
  END IF;

  RETURN QUERY
  SELECT pr.*
  FROM promotions pr
  WHERE pr.is_active = true
    AND p_surface = ANY(pr.display_surfaces)
    AND promotion_is_within_window(pr.starts_at, pr.ends_at)
    AND (
      pr.audience = 'all'
      OR (
        v_caller_id IS NOT NULL
        AND v_caller_role = 'customer'
        AND (
          pr.audience = 'customers'
          OR (pr.audience = 'first_visit_only' AND v_completed_visits = 0)
        )
      )
    )
  ORDER BY pr.sort_order ASC, pr.created_at DESC;
END;
$$;

COMMENT ON FUNCTION list_active_promotions IS
  'Returns active promotions for a display surface. audience=all is visible to everyone; customer-only audiences require a logged-in customer profile.';
