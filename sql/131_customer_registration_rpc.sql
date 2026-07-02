-- Migration 131: Customer registration completion RPCs for kiosk/portal (anon-safe)
-- The kiosk and registration pages run as anon. Direct UPDATE on profiles/appointments
-- returns 0 rows under RLS, causing PGRST116 ("Cannot coerce the result to a single JSON object").
-- Run after sql/130_registration_complete.sql.

CREATE OR REPLACE FUNCTION complete_customer_registration(
  caller_phone TEXT,
  p_full_name TEXT,
  p_email TEXT,
  p_birthday TEXT DEFAULT NULL,
  p_nail_goal TEXT DEFAULT NULL,
  p_refreshment_pref TEXT DEFAULT NULL,
  p_referral_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_phone TEXT;
  v_profile RECORD;
  v_referral TEXT;
  result JSONB;
BEGIN
  clean_phone := regexp_replace(COALESCE(caller_phone, ''), '\D', '', 'g');
  IF length(clean_phone) < 10 THEN
    RAISE EXCEPTION 'Invalid phone number.';
  END IF;

  SELECT *
  INTO v_profile
  FROM profiles
  WHERE regexp_replace(phone, '\D', '', 'g') = clean_phone
     OR phone = caller_phone
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for this phone number.';
  END IF;

  IF COALESCE(v_profile.role, 'customer') <> 'customer' THEN
    RAISE EXCEPTION 'Only customer profiles can be completed through registration.';
  END IF;

  v_referral := NULLIF(TRIM(COALESCE(p_referral_code, v_profile.referral_code, '')), '');
  IF v_referral IS NULL AND NULLIF(TRIM(COALESCE(p_full_name, '')), '') IS NOT NULL THEN
    v_referral := upper(substr(regexp_replace(p_full_name, '\s+', '', 'g'), 1, 4))
      || upper(substr(md5(random()::text), 1, 4));
  END IF;

  UPDATE profiles SET
    full_name = COALESCE(NULLIF(TRIM(p_full_name), ''), full_name),
    email = COALESCE(NULLIF(TRIM(p_email), ''), email),
    birthday = COALESCE(NULLIF(TRIM(p_birthday), ''), birthday),
    nail_goal = COALESCE(NULLIF(TRIM(p_nail_goal), ''), nail_goal),
    refreshment_pref = COALESCE(NULLIF(TRIM(p_refreshment_pref), ''), refreshment_pref),
    referral_code = COALESCE(v_referral, referral_code),
    registration_complete = true
  WHERE id = v_profile.id;

  SELECT row_to_json(p.*)::jsonb INTO result
  FROM profiles p
  WHERE p.id = v_profile.id;

  RETURN jsonb_build_object('success', true, 'profile', result);
END;
$$;

GRANT EXECUTE ON FUNCTION complete_customer_registration(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION update_my_appointment(
  TEXT, UUID, BIGINT, TEXT, NUMERIC, TEXT, TIMESTAMPTZ, TEXT, TEXT
) TO anon, authenticated;
