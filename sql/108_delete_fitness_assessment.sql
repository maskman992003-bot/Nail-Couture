-- Migration 108: delete_fitness_assessment RPC
-- Run once in Supabase SQL Editor after 061_assessment_security.sql

CREATE OR REPLACE FUNCTION delete_fitness_assessment(
  caller_phone TEXT,
  p_profile_id UUID,
  p_assessment_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  deleted_id UUID;
BEGIN
  IF caller_phone IS NULL OR trim(caller_phone) = '' OR p_profile_id IS NULL OR p_assessment_id IS NULL THEN
    RAISE EXCEPTION 'caller_phone, p_profile_id, and p_assessment_id are required';
  END IF;

  SELECT id INTO caller_id FROM profiles WHERE phone = caller_phone;
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  IF caller_id <> p_profile_id THEN
    RAISE EXCEPTION 'Not authorized to delete for this profile.';
  END IF;

  DELETE FROM fitness_assessments
  WHERE id = p_assessment_id
    AND profile_id = p_profile_id
  RETURNING id INTO deleted_id;

  IF deleted_id IS NULL THEN
    RAISE EXCEPTION 'Assessment not found.';
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION delete_fitness_assessment IS
  'Deletes a saved fitness assessment for the authenticated profile owner.';

GRANT EXECUTE ON FUNCTION delete_fitness_assessment(TEXT, UUID, UUID) TO anon, authenticated;
