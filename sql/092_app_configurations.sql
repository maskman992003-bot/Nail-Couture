-- Migration 092: Global application theme configuration (theme_01 / theme_02)
-- Persists the active visual identity pack for all visitors and users.

CREATE TABLE IF NOT EXISTS app_configurations (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  active_theme text NOT NULL DEFAULT 'theme_01' CHECK (active_theme IN ('theme_01', 'theme_02')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_configurations (id, active_theme)
VALUES (1, 'theme_01')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE app_configurations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app configurations" ON app_configurations;
CREATE POLICY "Anyone can read app configurations"
  ON app_configurations
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION get_app_theme()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT active_theme FROM app_configurations WHERE id = 1),
    'theme_01'
  );
$$;

CREATE OR REPLACE FUNCTION set_app_theme(caller_phone text, p_theme text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
BEGIN
  IF p_theme IS NULL OR p_theme NOT IN ('theme_01', 'theme_02') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_theme');
  END IF;

  SELECT role INTO v_role
  FROM profiles
  WHERE phone = caller_phone;

  IF v_role IS NULL OR v_role <> 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  UPDATE app_configurations
  SET active_theme = p_theme,
      updated_at = now()
  WHERE id = 1;

  IF NOT FOUND THEN
    INSERT INTO app_configurations (id, active_theme)
    VALUES (1, p_theme);
  END IF;

  RETURN jsonb_build_object('success', true, 'active_theme', p_theme);
END;
$$;

GRANT EXECUTE ON FUNCTION get_app_theme() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION set_app_theme(text, text) TO authenticated;

ALTER TABLE app_configurations REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE app_configurations;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END;
$$;

COMMENT ON TABLE app_configurations IS
  'Singleton global app settings. active_theme drives the ThemeEngine visual identity pack.';
