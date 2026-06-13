-- Migration 067: Fix missing JOIN in get_reviews_for_technician list query
-- Run once in Supabase SQL Editor if you see: missing FROM-clause entry for table "t"
-- (Applies the same fix as the corrected 066_reviews_date_filters.sql reviews subquery.)

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
    AND review_matches_search(safe_search, c.full_name, cr.comment, s.name, t.full_name);

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
    AND review_matches_search(safe_search, c.full_name, cr.comment, s.name, t.full_name);

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
      AND review_matches_search(safe_search, c.full_name, cr.comment, s.name, t.full_name)
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

GRANT EXECUTE ON FUNCTION get_reviews_for_technician(UUID, INT, INT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO anon, authenticated;
