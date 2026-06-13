-- Migration 061: Secure fitness + nail assessments via caller_phone RPCs
-- The app uses custom localStorage auth (no Supabase Auth sessions).
-- Direct table access is denied; clients must use these SECURITY DEFINER RPCs.

-- ============================================================
-- Remove permissive direct-access policies
-- ============================================================
DROP POLICY IF EXISTS "Allow anon read fitness_assessments" ON fitness_assessments;
DROP POLICY IF EXISTS "Allow anon insert fitness_assessments" ON fitness_assessments;
DROP POLICY IF EXISTS "Allow anon read nail_assessments" ON nail_assessments;
DROP POLICY IF EXISTS "Allow anon insert nail_assessments" ON nail_assessments;
DROP POLICY IF EXISTS "Users read own nail assessments" ON nail_assessments;
DROP POLICY IF EXISTS "Users insert own nail assessments" ON nail_assessments;

ALTER TABLE fitness_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE nail_assessments ENABLE ROW LEVEL SECURITY;

-- No permissive RLS policies: direct anon/authenticated table access is denied.
-- SECURITY DEFINER RPCs below bypass RLS after verifying caller_phone.

-- ============================================================
-- Fitness assessment RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION get_fitness_assessment_history(
  caller_phone TEXT,
  p_profile_id UUID,
  p_limit INT DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  result JSONB;
  safe_limit INT;
BEGIN
  IF caller_phone IS NULL OR trim(caller_phone) = '' OR p_profile_id IS NULL THEN
    RAISE EXCEPTION 'caller_phone and p_profile_id are required';
  END IF;

  SELECT id INTO caller_id FROM profiles WHERE phone = caller_phone;
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  IF caller_id <> p_profile_id THEN
    RAISE EXCEPTION 'Not authorized to access this profile.';
  END IF;

  safe_limit := GREATEST(1, LEAST(COALESCE(p_limit, 20), 100));

  SELECT COALESCE(
    jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC),
    '[]'::jsonb
  )
  INTO result
  FROM (
    SELECT id, profile_id, inputs, metrics, health_status, created_at
    FROM fitness_assessments
    WHERE profile_id = p_profile_id
    ORDER BY created_at DESC
    LIMIT safe_limit
  ) t;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION save_fitness_assessment(
  caller_phone TEXT,
  p_profile_id UUID,
  p_inputs JSONB,
  p_metrics JSONB,
  p_health_status JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  inserted fitness_assessments%ROWTYPE;
BEGIN
  IF caller_phone IS NULL OR trim(caller_phone) = '' OR p_profile_id IS NULL THEN
    RAISE EXCEPTION 'caller_phone and p_profile_id are required';
  END IF;

  SELECT id INTO caller_id FROM profiles WHERE phone = caller_phone;
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  IF caller_id <> p_profile_id THEN
    RAISE EXCEPTION 'Not authorized to save for this profile.';
  END IF;

  INSERT INTO fitness_assessments (profile_id, inputs, metrics, health_status)
  VALUES (
    p_profile_id,
    COALESCE(p_inputs, '{}'::jsonb),
    COALESCE(p_metrics, '{}'::jsonb),
    COALESCE(p_health_status, '{}'::jsonb)
  )
  RETURNING * INTO inserted;

  RETURN to_jsonb(inserted);
END;
$$;

-- ============================================================
-- Nail assessment RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION get_nail_assessment_history(
  caller_phone TEXT,
  p_profile_id UUID,
  p_limit INT DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  result JSONB;
  safe_limit INT;
BEGIN
  IF caller_phone IS NULL OR trim(caller_phone) = '' OR p_profile_id IS NULL THEN
    RAISE EXCEPTION 'caller_phone and p_profile_id are required';
  END IF;

  SELECT id INTO caller_id FROM profiles WHERE phone = caller_phone;
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  IF caller_id <> p_profile_id THEN
    RAISE EXCEPTION 'Not authorized to access this profile.';
  END IF;

  safe_limit := GREATEST(1, LEAST(COALESCE(p_limit, 20), 100));

  SELECT COALESCE(
    jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC),
    '[]'::jsonb
  )
  INTO result
  FROM (
    SELECT id, profile_id, inputs, metrics, health_status, created_at
    FROM nail_assessments
    WHERE profile_id = p_profile_id
    ORDER BY created_at DESC
    LIMIT safe_limit
  ) t;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION save_nail_assessment(
  caller_phone TEXT,
  p_profile_id UUID,
  p_inputs JSONB,
  p_metrics JSONB,
  p_health_status JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  inserted nail_assessments%ROWTYPE;
BEGIN
  IF caller_phone IS NULL OR trim(caller_phone) = '' OR p_profile_id IS NULL THEN
    RAISE EXCEPTION 'caller_phone and p_profile_id are required';
  END IF;

  SELECT id INTO caller_id FROM profiles WHERE phone = caller_phone;
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  IF caller_id <> p_profile_id THEN
    RAISE EXCEPTION 'Not authorized to save for this profile.';
  END IF;

  INSERT INTO nail_assessments (profile_id, inputs, metrics, health_status)
  VALUES (
    p_profile_id,
    COALESCE(p_inputs, '{}'::jsonb),
    COALESCE(p_metrics, '{}'::jsonb),
    COALESCE(p_health_status, '{}'::jsonb)
  )
  RETURNING * INTO inserted;

  RETURN to_jsonb(inserted);
END;
$$;

GRANT EXECUTE ON FUNCTION get_fitness_assessment_history(TEXT, UUID, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION save_fitness_assessment(TEXT, UUID, JSONB, JSONB, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_nail_assessment_history(TEXT, UUID, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION save_nail_assessment(TEXT, UUID, JSONB, JSONB, JSONB) TO anon, authenticated;
