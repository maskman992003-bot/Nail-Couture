-- Migration 072: add_staff_member RPC (Staff Management UI)
-- Run once in Supabase SQL Editor after 071_customer_my_reviews_rpc.sql

CREATE OR REPLACE FUNCTION add_staff_member(
  p_admin_phone TEXT,
  p_full_name TEXT,
  p_phone TEXT,
  p_role TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_role TEXT;
  clean_admin_phone TEXT;
  clean_phone TEXT;
  trimmed_name TEXT;
  existing_id UUID;
  existing_role user_role;
  staff_role user_role;
BEGIN
  clean_admin_phone := regexp_replace(COALESCE(p_admin_phone, ''), '\D', '', 'g');
  IF length(clean_admin_phone) = 11 AND left(clean_admin_phone, 1) = '1' THEN
    clean_admin_phone := substring(clean_admin_phone from 2);
  END IF;

  IF length(clean_admin_phone) < 10 THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  SELECT role::text INTO admin_role
  FROM profiles
  WHERE regexp_replace(COALESCE(phone, ''), '\D', '', 'g') IN (clean_admin_phone, '1' || clean_admin_phone)
     OR phone = p_admin_phone
  LIMIT 1;

  IF admin_role IS NULL OR admin_role NOT IN ('super_admin', 'owner', 'partner', 'admin') THEN
    RAISE EXCEPTION 'Not authorized. Only managers can add staff members.';
  END IF;

  trimmed_name := trim(p_full_name);
  IF trimmed_name IS NULL OR trimmed_name = '' THEN
    RAISE EXCEPTION 'Full name is required.';
  END IF;

  IF p_role IS NULL OR p_role NOT IN ('technician', 'cashier', 'admin') THEN
    RAISE EXCEPTION 'Invalid role. Must be technician, cashier, or admin.';
  END IF;
  staff_role := p_role::user_role;

  clean_phone := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  IF length(clean_phone) = 11 AND left(clean_phone, 1) = '1' THEN
    clean_phone := substring(clean_phone from 2);
  END IF;
  IF length(clean_phone) <> 10 THEN
    RAISE EXCEPTION 'Please enter a valid 10 or 11 digit US phone number.';
  END IF;

  SELECT id, role INTO existing_id, existing_role
  FROM profiles
  WHERE regexp_replace(COALESCE(phone, ''), '\D', '', 'g') IN (clean_phone, '1' || clean_phone)
     OR phone = p_phone
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    IF existing_role IN ('technician', 'cashier', 'admin', 'super_admin', 'owner', 'partner') THEN
      RAISE EXCEPTION 'A staff account with this phone number already exists.';
    END IF;

    UPDATE profiles
    SET full_name = trimmed_name,
        role = staff_role,
        phone = clean_phone
    WHERE id = existing_id;
    RETURN;
  END IF;

  INSERT INTO profiles (full_name, phone, role)
  VALUES (trimmed_name, clean_phone, staff_role);
END;
$$;

GRANT EXECUTE ON FUNCTION add_staff_member(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
