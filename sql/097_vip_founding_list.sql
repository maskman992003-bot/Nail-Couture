-- Migration 097: VIP Founding List — landing email signups
-- Run once in Supabase SQL Editor after 096_kiosk_checking_in_status.sql

CREATE TABLE IF NOT EXISTS vip_founding_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  source text NOT NULL DEFAULT 'landing',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vip_founding_list_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_vip_founding_list_created_at
  ON vip_founding_list (created_at DESC);

COMMENT ON TABLE vip_founding_list IS
  'VIP Founding List signups from the public landing page.';

ALTER TABLE vip_founding_list ENABLE ROW LEVEL SECURITY;

-- No permissive policies: all access via SECURITY DEFINER RPCs below.

-- ============================================================
-- Public signup (anon landing visitors)
-- ============================================================

CREATE OR REPLACE FUNCTION join_vip_founding_list(
  p_email text,
  p_source text DEFAULT 'landing'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_source text;
  v_inserted boolean := false;
BEGIN
  v_email := lower(trim(COALESCE(p_email, '')));
  v_source := COALESCE(NULLIF(trim(p_source), ''), 'landing');

  IF v_email = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_email');
  END IF;

  IF v_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_email');
  END IF;

  INSERT INTO vip_founding_list (email, source)
  VALUES (v_email, v_source)
  ON CONFLICT (email) DO NOTHING
  RETURNING true INTO v_inserted;

  RETURN jsonb_build_object(
    'success', true,
    'already_subscribed', NOT COALESCE(v_inserted, false)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION join_vip_founding_list(text, text) TO anon, authenticated;

-- ============================================================
-- Management list (super_admin, owner, partner, admin)
-- ============================================================

CREATE OR REPLACE FUNCTION get_vip_founding_list(caller_phone text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  signups jsonb;
  total_count int;
BEGIN
  IF caller_phone IS NULL OR trim(caller_phone) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT role INTO caller_role
  FROM profiles
  WHERE phone = caller_phone;

  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(v)::jsonb ORDER BY v.created_at DESC), '[]'::jsonb)
  INTO signups
  FROM (
    SELECT id, email, source, created_at
    FROM vip_founding_list
    ORDER BY created_at DESC
  ) v;

  SELECT count(*)::int INTO total_count FROM vip_founding_list;

  RETURN jsonb_build_object(
    'success', true,
    'signups', signups,
    'total', total_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_vip_founding_list(text) TO anon, authenticated;
