-- Migration 068: Allow staff review search by customer mobile number
-- Run once in Supabase SQL Editor after 067_reviews_technician_join_fix.sql

CREATE OR REPLACE FUNCTION review_matches_search(
  p_search TEXT,
  p_customer_name TEXT,
  p_comment TEXT,
  p_service_name TEXT,
  p_technician_name TEXT,
  p_customer_phone TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    p_search IS NULL
    OR trim(p_search) = ''
    OR COALESCE(p_customer_name, '') ILIKE '%' || trim(p_search) || '%'
    OR COALESCE(p_comment, '') ILIKE '%' || trim(p_search) || '%'
    OR COALESCE(p_service_name, '') ILIKE '%' || trim(p_search) || '%'
    OR COALESCE(p_technician_name, '') ILIKE '%' || trim(p_search) || '%'
    OR (
      COALESCE(p_customer_phone, '') <> ''
      AND regexp_replace(trim(COALESCE(p_search, '')), '\D', '', 'g') <> ''
      AND regexp_replace(p_customer_phone, '\D', '', 'g')
        LIKE '%' || regexp_replace(trim(p_search), '\D', '', 'g') || '%'
    );
$$;

CREATE OR REPLACE FUNCTION get_staff_customer_reviews(
  caller_phone TEXT,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_technician_id UUID DEFAULT NULL,
  p_from_date TIMESTAMPTZ DEFAULT NULL,
  p_to_date TIMESTAMPTZ DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
  is_management BOOLEAN := FALSE;
  safe_limit INT;
  safe_offset INT;
  filter_technician UUID;
  summary JSONB;
  reviews JSONB;
  total_count BIGINT;
  safe_search TEXT;
BEGIN
  IF caller_phone IS NULL OR trim(caller_phone) = '' THEN
    RAISE EXCEPTION 'caller_phone is required';
  END IF;

  SELECT id, role INTO caller_id, caller_role
  FROM profiles
  WHERE phone = caller_phone;

  IF caller_id IS NULL OR caller_role NOT IN (
    'super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician'
  ) THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  is_management := caller_role IN ('super_admin', 'owner', 'partner', 'admin');
  safe_limit := GREATEST(1, LEAST(COALESCE(p_limit, 50), 100));
  safe_offset := GREATEST(0, COALESCE(p_offset, 0));
  safe_search := NULLIF(trim(COALESCE(p_search, '')), '');

  IF caller_role = 'technician' THEN
    filter_technician := caller_id;
  ELSE
    filter_technician := p_technician_id;
  END IF;

  SELECT COUNT(*)
  INTO total_count
  FROM customer_reviews cr
  JOIN profiles c ON c.id = cr.customer_id
  JOIN profiles t ON t.id = cr.technician_id
  JOIN services s ON s.id = cr.service_id
  WHERE (filter_technician IS NULL OR cr.technician_id = filter_technician)
    AND (is_management OR NOT cr.is_hidden)
    AND (p_from_date IS NULL OR cr.created_at >= p_from_date)
    AND (p_to_date IS NULL OR cr.created_at <= p_to_date)
    AND review_matches_search(safe_search, c.full_name, cr.comment, s.name, t.full_name, c.phone);

  SELECT jsonb_build_object(
    'avg_rating', ROUND(AVG(rating)::numeric, 1),
    'review_count', COUNT(*)
  )
  INTO summary
  FROM customer_reviews cr
  JOIN profiles c ON c.id = cr.customer_id
  JOIN profiles t ON t.id = cr.technician_id
  JOIN services s ON s.id = cr.service_id
  WHERE (filter_technician IS NULL OR cr.technician_id = filter_technician)
    AND (is_management OR NOT cr.is_hidden)
    AND (p_from_date IS NULL OR cr.created_at >= p_from_date)
    AND (p_to_date IS NULL OR cr.created_at <= p_to_date)
    AND review_matches_search(safe_search, c.full_name, cr.comment, s.name, t.full_name, c.phone);

  summary := COALESCE(summary, jsonb_build_object('avg_rating', NULL, 'review_count', 0));

  SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'created_at' DESC), '[]'::jsonb)
  INTO reviews
  FROM (
    SELECT jsonb_build_object(
      'id', cr.id,
      'rating', cr.rating,
      'comment', cr.comment,
      'created_at', cr.created_at,
      'customer_name', customer_review_display_name(c.full_name, TRUE),
      'customer_phone', c.phone,
      'service_name', COALESCE(s.name, 'Service'),
      'technician_name', COALESCE(t.full_name, 'Technician'),
      'technician_id', cr.technician_id,
      'is_hidden', cr.is_hidden
    ) AS row_data
    FROM customer_reviews cr
    JOIN profiles c ON c.id = cr.customer_id
    JOIN profiles t ON t.id = cr.technician_id
    JOIN services s ON s.id = cr.service_id
    WHERE (filter_technician IS NULL OR cr.technician_id = filter_technician)
      AND (is_management OR NOT cr.is_hidden)
      AND (p_from_date IS NULL OR cr.created_at >= p_from_date)
      AND (p_to_date IS NULL OR cr.created_at <= p_to_date)
      AND review_matches_search(safe_search, c.full_name, cr.comment, s.name, t.full_name, c.phone)
    ORDER BY cr.created_at DESC
    LIMIT safe_limit
    OFFSET safe_offset
  ) sub;

  RETURN summary || jsonb_build_object(
    'reviews', reviews,
    'total_count', total_count,
    'has_more', (safe_offset + safe_limit) < total_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_reviews_for_technician(
  p_technician_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  caller_phone TEXT DEFAULT NULL,
  p_from_date TIMESTAMPTZ DEFAULT NULL,
  p_to_date TIMESTAMPTZ DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  is_staff BOOLEAN := FALSE;
  safe_limit INT;
  safe_offset INT;
  summary JSONB;
  reviews JSONB;
  total_count BIGINT;
  safe_search TEXT;
BEGIN
  IF p_technician_id IS NULL THEN
    RAISE EXCEPTION 'p_technician_id is required';
  END IF;

  IF caller_phone IS NOT NULL AND trim(caller_phone) <> '' THEN
    SELECT role INTO caller_role FROM profiles WHERE phone = caller_phone;
    is_staff := caller_role IN (
      'super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician'
    );
  END IF;

  safe_limit := GREATEST(1, LEAST(COALESCE(p_limit, 20), 100));
  safe_offset := GREATEST(0, COALESCE(p_offset, 0));
  safe_search := NULLIF(trim(COALESCE(p_search, '')), '');

  SELECT COUNT(*)
  INTO total_count
  FROM customer_reviews cr
  JOIN profiles c ON c.id = cr.customer_id
  JOIN profiles t ON t.id = cr.technician_id
  JOIN services s ON s.id = cr.service_id
  WHERE cr.technician_id = p_technician_id
    AND (NOT cr.is_hidden OR is_staff)
    AND (p_from_date IS NULL OR cr.created_at >= p_from_date)
    AND (p_to_date IS NULL OR cr.created_at <= p_to_date)
    AND review_matches_search(safe_search, c.full_name, cr.comment, s.name, t.full_name, c.phone);

  SELECT jsonb_build_object(
    'avg_rating', ROUND(AVG(rating)::numeric, 1),
    'review_count', COUNT(*)
  )
  INTO summary
  FROM customer_reviews cr
  JOIN profiles c ON c.id = cr.customer_id
  JOIN profiles t ON t.id = cr.technician_id
  JOIN services s ON s.id = cr.service_id
  WHERE cr.technician_id = p_technician_id
    AND (NOT cr.is_hidden OR is_staff)
    AND (p_from_date IS NULL OR cr.created_at >= p_from_date)
    AND (p_to_date IS NULL OR cr.created_at <= p_to_date)
    AND review_matches_search(safe_search, c.full_name, cr.comment, s.name, t.full_name, c.phone);

  summary := COALESCE(summary, jsonb_build_object('avg_rating', NULL, 'review_count', 0));

  SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'created_at' DESC), '[]'::jsonb)
  INTO reviews
  FROM (
    SELECT jsonb_build_object(
      'id', cr.id,
      'rating', cr.rating,
      'comment', cr.comment,
      'created_at', cr.created_at,
      'service_name', COALESCE(s.name, 'Service'),
      'customer_name', customer_review_display_name(c.full_name, is_staff),
      'customer_phone', CASE WHEN is_staff THEN c.phone ELSE NULL END,
      'is_hidden', cr.is_hidden
    ) AS row_data
    FROM customer_reviews cr
    JOIN profiles c ON c.id = cr.customer_id
    JOIN profiles t ON t.id = cr.technician_id
    JOIN services s ON s.id = cr.service_id
    WHERE cr.technician_id = p_technician_id
      AND (NOT cr.is_hidden OR is_staff)
      AND (p_from_date IS NULL OR cr.created_at >= p_from_date)
      AND (p_to_date IS NULL OR cr.created_at <= p_to_date)
      AND review_matches_search(safe_search, c.full_name, cr.comment, s.name, t.full_name, c.phone)
    ORDER BY cr.created_at DESC
    LIMIT safe_limit
    OFFSET safe_offset
  ) sub;

  RETURN summary || jsonb_build_object(
    'reviews', reviews,
    'total_count', total_count,
    'has_more', (safe_offset + safe_limit) < total_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_staff_customer_reviews(TEXT, INT, INT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_reviews_for_technician(UUID, INT, INT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO anon, authenticated;
