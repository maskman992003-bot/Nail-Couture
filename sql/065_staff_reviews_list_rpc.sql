-- Migration 065: Staff reviews list RPC for Reviews tab
-- Run once in Supabase SQL Editor after 064_customer_reviews_polish.sql

CREATE OR REPLACE FUNCTION get_staff_customer_reviews(
  caller_phone TEXT,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_technician_id UUID DEFAULT NULL
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

  IF caller_role = 'technician' THEN
    filter_technician := caller_id;
  ELSE
    filter_technician := p_technician_id;
  END IF;

  SELECT jsonb_build_object(
    'avg_rating', ROUND(AVG(rating)::numeric, 1),
    'review_count', COUNT(*)
  )
  INTO summary
  FROM customer_reviews cr
  WHERE (filter_technician IS NULL OR cr.technician_id = filter_technician)
    AND (is_management OR NOT cr.is_hidden);

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
    ORDER BY cr.created_at DESC
    LIMIT safe_limit
    OFFSET safe_offset
  ) sub;

  RETURN summary || jsonb_build_object('reviews', reviews);
END;
$$;

GRANT EXECUTE ON FUNCTION get_staff_customer_reviews(TEXT, INT, INT, UUID) TO anon, authenticated;
