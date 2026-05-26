-- Enable RLS on services table
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Revoke direct write access for anon and authenticated roles
REVOKE INSERT, UPDATE, DELETE ON services FROM anon, authenticated;

-- Security definer function for managing services (bypasses RLS)
-- Only allows super_admin, owner, or partner roles
CREATE OR REPLACE FUNCTION manage_service(
  admin_phone TEXT,
  action TEXT,
  service_data JSONB DEFAULT '{}',
  service_id BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  new_id BIGINT;
  result JSONB;
BEGIN
  -- Look up caller role
  SELECT role INTO caller_role FROM profiles WHERE phone = admin_phone;
  
  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner') THEN
    RAISE EXCEPTION 'Not authorized. Only super_admin, owner, or partner can manage services.';
  END IF;

  IF action = 'insert' THEN
    INSERT INTO services (name, price, duration_minutes, category, is_addon)
    VALUES (
      service_data->>'name',
      (service_data->>'price')::numeric,
      (service_data->>'duration_minutes')::int,
      service_data->>'category',
      (service_data->>'is_addon')::boolean
    )
    RETURNING id INTO new_id;
    RETURN jsonb_build_object('id', new_id);
    
  ELSIF action = 'update' THEN
    IF service_id IS NULL THEN
      RAISE EXCEPTION 'service_id required for update';
    END IF;
    UPDATE services SET
      name = COALESCE(service_data->>'name', name),
      price = COALESCE((service_data->>'price')::numeric, price),
      duration_minutes = COALESCE((service_data->>'duration_minutes')::int, duration_minutes),
      category = COALESCE(service_data->>'category', category),
      is_addon = COALESCE((service_data->>'is_addon')::boolean, is_addon)
    WHERE id = service_id;
    RETURN jsonb_build_object('success', true);
    
  ELSIF action = 'delete' THEN
    IF service_id IS NULL THEN
      RAISE EXCEPTION 'service_id required for delete';
    END IF;
    DELETE FROM services WHERE id = service_id;
    RETURN jsonb_build_object('success', true);
    
  ELSE
    RAISE EXCEPTION 'Invalid action: %', action;
  END IF;
END;
$$;
