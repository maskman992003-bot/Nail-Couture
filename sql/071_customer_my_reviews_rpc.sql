-- Migration 071: Customer profile — list own submitted reviews
-- Run once in Supabase SQL Editor after 070_reviews_executive_see_hidden.sql

CREATE OR REPLACE FUNCTION get_my_customer_reviews(
  caller_phone TEXT,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_from_date TIMESTAMPTZ DEFAULT NULL,
  p_to_date TIMESTAMPTZ DEFAULT NULL
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
  safe_limit INT;
  safe_offset INT;
  summary JSONB;
  reviews JSONB;
  total_count BIGINT;
BEGIN
  IF caller_phone IS NULL OR trim(caller_phone) = '' THEN
    RAISE EXCEPTION 'caller_phone is required';
  END IF;

  SELECT id, role INTO caller_id, caller_role
  FROM profiles
  WHERE phone = caller_phone;

  IF caller_id IS NULL OR caller_role <> 'customer' THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  safe_limit := GREATEST(1, LEAST(COALESCE(p_limit, 50), 100));
  safe_offset := GREATEST(0, COALESCE(p_offset, 0));

  SELECT COUNT(*)
  INTO total_count
  FROM customer_reviews cr
  WHERE cr.customer_id = caller_id
    AND (p_from_date IS NULL OR cr.created_at >= p_from_date)
    AND (p_to_date IS NULL OR cr.created_at <= p_to_date);

  SELECT jsonb_build_object(
    'avg_rating', ROUND(AVG(cr.rating)::numeric, 1),
    'review_count', COUNT(*)
  )
  INTO summary
  FROM customer_reviews cr
  WHERE cr.customer_id = caller_id
    AND (p_from_date IS NULL OR cr.created_at >= p_from_date)
    AND (p_to_date IS NULL OR cr.created_at <= p_to_date);

  summary := COALESCE(summary, jsonb_build_object('avg_rating', NULL, 'review_count', 0));

  SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'created_at' DESC), '[]'::jsonb)
  INTO reviews
  FROM (
    SELECT jsonb_build_object(
      'id', cr.id,
      'appointment_id', cr.appointment_id,
      'rating', cr.rating,
      'comment', cr.comment,
      'created_at', cr.created_at,
      'service_name', COALESCE(s.name, 'Service'),
      'technician_name', COALESCE(t.full_name, 'Technician'),
      'is_hidden', cr.is_hidden
    ) AS row_data
    FROM customer_reviews cr
    JOIN services s ON s.id = cr.service_id
    JOIN profiles t ON t.id = cr.technician_id
    WHERE cr.customer_id = caller_id
      AND (p_from_date IS NULL OR cr.created_at >= p_from_date)
      AND (p_to_date IS NULL OR cr.created_at <= p_to_date)
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

GRANT EXECUTE ON FUNCTION get_my_customer_reviews(TEXT, INT, INT, TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;
