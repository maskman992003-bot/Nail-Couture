-- Migration 093: Add theme_03 (Boutique Lounge) to global app theme options

ALTER TABLE app_configurations
  DROP CONSTRAINT IF EXISTS app_configurations_active_theme_check;

ALTER TABLE app_configurations
  ADD CONSTRAINT app_configurations_active_theme_check
  CHECK (active_theme IN ('theme_01', 'theme_02', 'theme_03'));

CREATE OR REPLACE FUNCTION set_app_theme(caller_phone text, p_theme text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
BEGIN
  IF p_theme IS NULL OR p_theme NOT IN ('theme_01', 'theme_02', 'theme_03') THEN
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
