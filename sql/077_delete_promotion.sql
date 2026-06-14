-- Migration 077: delete_promotion RPC (management only)
-- Run once in Supabase SQL Editor after 076_promotions_management_roles.sql

CREATE OR REPLACE FUNCTION delete_promotion(
  p_caller_phone text,
  p_promotion_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_deleted_id uuid;
BEGIN
  IF p_caller_phone IS NULL OR trim(p_caller_phone) = '' OR p_promotion_id IS NULL THEN
    RAISE EXCEPTION 'p_caller_phone and p_promotion_id are required';
  END IF;

  SELECT role::text INTO v_caller_role
  FROM profiles
  WHERE phone = p_caller_phone;

  IF NOT promotion_is_management_role(v_caller_role) THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  DELETE FROM promotions
  WHERE id = p_promotion_id
  RETURNING id INTO v_deleted_id;

  IF v_deleted_id IS NULL THEN
    RAISE EXCEPTION 'Promotion not found';
  END IF;
END;
$$;

COMMENT ON FUNCTION delete_promotion IS
  'Permanently deletes a home-screen promotion (management roles only).';
