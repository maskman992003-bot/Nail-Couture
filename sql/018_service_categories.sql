-- Service categories table (single source of truth)
CREATE TABLE IF NOT EXISTS service_categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default categories
INSERT INTO service_categories (name, sort_order) VALUES
  ('Nail Art', 1),
  ('Extensions', 2),
  ('Standard', 3),
  ('Luxury', 4),
  ('Packages', 5),
  ('Other', 999)
ON CONFLICT (name) DO NOTHING;

-- Allow reads (app uses custom auth, not Supabase Auth sessions)
ALTER TABLE service_categories DISABLE ROW LEVEL SECURITY;

-- Security definer RPC for managing categories
CREATE OR REPLACE FUNCTION manage_service_category(
  admin_phone TEXT,
  action TEXT,
  category_name TEXT DEFAULT NULL,
  category_id BIGINT DEFAULT NULL,
  new_sort_order INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  new_id BIGINT;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE phone = admin_phone;
  
  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner') THEN
    RAISE EXCEPTION 'Not authorized. Only super_admin, owner, or partner can manage categories.';
  END IF;

  IF action = 'insert' THEN
    INSERT INTO service_categories (name, sort_order)
    VALUES (category_name, COALESCE(new_sort_order, 0))
    RETURNING id INTO new_id;
    RETURN jsonb_build_object('id', new_id);

  ELSIF action = 'update' THEN
    IF category_id IS NULL THEN RAISE EXCEPTION 'category_id required'; END IF;
    UPDATE service_categories SET
      name = COALESCE(category_name, name),
      sort_order = COALESCE(new_sort_order, sort_order)
    WHERE id = category_id;
    RETURN jsonb_build_object('success', true);

  ELSIF action = 'delete' THEN
    IF category_id IS NULL THEN RAISE EXCEPTION 'category_id required'; END IF;
    DELETE FROM service_categories WHERE id = category_id;
    RETURN jsonb_build_object('success', true);

  ELSE
    RAISE EXCEPTION 'Invalid action: %', action;
  END IF;
END;
$$;
