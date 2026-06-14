-- Migration 083: Service "Coming Soon" flag and description support in manage_service

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS is_coming_soon boolean NOT NULL DEFAULT false;

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
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE phone = admin_phone;

  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner') THEN
    RAISE EXCEPTION 'Not authorized. Only super_admin, owner, or partner can manage services.';
  END IF;

  IF action = 'insert' THEN
    INSERT INTO services (
      name, price, duration_minutes, category, is_addon, metadata, description, is_coming_soon
    )
    VALUES (
      service_data->>'name',
      (service_data->>'price')::numeric,
      (service_data->>'duration_minutes')::int,
      service_data->>'category',
      COALESCE((service_data->>'is_addon')::boolean, false),
      COALESCE(service_data->'metadata', '{}'::jsonb),
      NULLIF(service_data->>'description', ''),
      COALESCE((service_data->>'is_coming_soon')::boolean, false)
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
      is_addon = COALESCE((service_data->>'is_addon')::boolean, is_addon),
      metadata = CASE
        WHEN service_data ? 'metadata' THEN service_data->'metadata'
        ELSE metadata
      END,
      description = CASE
        WHEN service_data ? 'description' THEN NULLIF(service_data->>'description', '')
        ELSE description
      END,
      is_coming_soon = CASE
        WHEN service_data ? 'is_coming_soon' THEN COALESCE((service_data->>'is_coming_soon')::boolean, false)
        ELSE is_coming_soon
      END
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
