-- Migration 099: Per-role session timeout configuration (idle + warning duration)
-- Super admins configure timeouts per user_role; clients enforce idle logout.

CREATE TABLE IF NOT EXISTS role_session_settings (
  role user_role PRIMARY KEY,
  idle_timeout_seconds int NOT NULL,
  warning_duration_seconds int NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (idle_timeout_seconds >= 60),
  CHECK (warning_duration_seconds >= 60),
  CHECK (warning_duration_seconds < idle_timeout_seconds)
);

-- Seed defaults: customer 15 min / 1 min warning; staff 60 min / 1 min warning
INSERT INTO role_session_settings (role, idle_timeout_seconds, warning_duration_seconds)
VALUES
  ('customer', 900, 60),
  ('technician', 3600, 60),
  ('admin', 3600, 60),
  ('cashier', 3600, 60),
  ('owner', 3600, 60),
  ('partner', 3600, 60),
  ('super_admin', 3600, 60),
  ('check_in', 900, 60)
ON CONFLICT (role) DO NOTHING;

ALTER TABLE role_session_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read role session settings" ON role_session_settings;
CREATE POLICY "Anyone can read role session settings"
  ON role_session_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION get_role_session_settings(p_role user_role)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT jsonb_build_object(
        'idle_timeout_seconds', idle_timeout_seconds,
        'warning_duration_seconds', warning_duration_seconds
      )
      FROM role_session_settings
      WHERE role = p_role
    ),
    CASE
      WHEN p_role = 'customer' THEN jsonb_build_object('idle_timeout_seconds', 900, 'warning_duration_seconds', 60)
      ELSE jsonb_build_object('idle_timeout_seconds', 3600, 'warning_duration_seconds', 60)
    END
  );
$$;

CREATE OR REPLACE FUNCTION get_all_role_session_settings()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'role', role,
        'idle_timeout_seconds', idle_timeout_seconds,
        'warning_duration_seconds', warning_duration_seconds,
        'updated_at', updated_at
      )
      ORDER BY role::text
    ),
    '[]'::jsonb
  )
  FROM role_session_settings;
$$;

CREATE OR REPLACE FUNCTION set_role_session_settings(
  caller_phone text,
  p_role user_role,
  p_idle int,
  p_warning int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
BEGIN
  IF p_idle IS NULL OR p_warning IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_values');
  END IF;

  IF p_idle < 60 OR p_warning < 60 THEN
    RETURN jsonb_build_object('success', false, 'error', 'minimum_60_seconds');
  END IF;

  IF p_warning >= p_idle THEN
    RETURN jsonb_build_object('success', false, 'error', 'warning_must_be_less_than_idle');
  END IF;

  SELECT role INTO v_role
  FROM profiles
  WHERE phone = caller_phone;

  IF v_role IS NULL OR v_role <> 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  INSERT INTO role_session_settings (role, idle_timeout_seconds, warning_duration_seconds)
  VALUES (p_role, p_idle, p_warning)
  ON CONFLICT (role) DO UPDATE
  SET idle_timeout_seconds = EXCLUDED.idle_timeout_seconds,
      warning_duration_seconds = EXCLUDED.warning_duration_seconds,
      updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'role', p_role,
    'idle_timeout_seconds', p_idle,
    'warning_duration_seconds', p_warning
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_role_session_settings(user_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_all_role_session_settings() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION set_role_session_settings(text, user_role, int, int) TO authenticated;

ALTER TABLE role_session_settings REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE role_session_settings;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END;
$$;

COMMENT ON TABLE role_session_settings IS
  'Per-role idle session timeout and warning duration (seconds). Enforced client-side.';
