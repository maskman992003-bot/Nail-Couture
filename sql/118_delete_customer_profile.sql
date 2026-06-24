-- Migration 118: delete_customer_profile RPC (owner / super_admin only)
-- Run once in Supabase SQL Editor after 117_gift_card_checkout_phone_fix.sql

CREATE OR REPLACE FUNCTION delete_customer_profile(
  p_caller_phone TEXT,
  p_profile_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_target_role TEXT;
  clean_caller_phone TEXT;
BEGIN
  IF p_caller_phone IS NULL OR trim(p_caller_phone) = '' OR p_profile_id IS NULL THEN
    RAISE EXCEPTION 'p_caller_phone and p_profile_id are required';
  END IF;

  clean_caller_phone := regexp_replace(p_caller_phone, '\D', '', 'g');
  IF length(clean_caller_phone) = 11 AND left(clean_caller_phone, 1) = '1' THEN
    clean_caller_phone := substring(clean_caller_phone from 2);
  END IF;

  IF length(clean_caller_phone) < 10 THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  SELECT role::text INTO v_caller_role
  FROM profiles
  WHERE regexp_replace(COALESCE(phone, ''), '\D', '', 'g') IN (clean_caller_phone, '1' || clean_caller_phone)
     OR phone = p_caller_phone
  LIMIT 1;

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'owner') THEN
    RAISE EXCEPTION 'Not authorized. Only owners can delete customer profiles.';
  END IF;

  SELECT role::text INTO v_target_role
  FROM profiles
  WHERE id = p_profile_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Profile not found.';
  END IF;

  IF v_target_role <> 'customer' THEN
    RAISE EXCEPTION 'Only registered customer profiles can be deleted.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM appointments
    WHERE customer_id = p_profile_id
      AND status IN ('waiting', 'assigned_pending', 'serving', 'ready_for_checkout')
  ) THEN
    RAISE EXCEPTION 'Cannot delete a customer with an active visit. Complete or cancel the visit first.';
  END IF;

  UPDATE profiles
  SET referral_by = NULL
  WHERE referral_by = p_profile_id;

  DELETE FROM gift_cards
  WHERE owner_id = p_profile_id
     OR purchased_by_id = p_profile_id;

  DELETE FROM gift_card_sale_requests
  WHERE buyer_id = p_profile_id
     OR owner_id = p_profile_id
     OR requested_by_id = p_profile_id;

  DELETE FROM profiles
  WHERE id = p_profile_id
    AND role = 'customer';
END;
$$;

COMMENT ON FUNCTION delete_customer_profile IS
  'Permanently deletes a registered customer profile and related gift-card records (owner / super_admin only).';

GRANT EXECUTE ON FUNCTION delete_customer_profile(TEXT, UUID) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
