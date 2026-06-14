-- Migration 074: Cap home-page featured reviews at 9
-- Run once in Supabase SQL Editor after 073_review_publish.sql
-- (Skip if 073 was not applied yet — re-run 073 instead, which includes this cap.)

CREATE OR REPLACE FUNCTION get_featured_reviews(p_limit INT DEFAULT 9)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  safe_limit INT;
  result JSONB;
BEGIN
  -- Home page shows at most 9 published reviews; social publish has no cap.
  safe_limit := GREATEST(1, LEAST(COALESCE(p_limit, 9), 9));

  SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'published_at' DESC), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'id', cr.id,
      'rating', cr.rating,
      'comment', cr.comment,
      'created_at', cr.created_at,
      'published_at', cr.published_at,
      'service_name', COALESCE(s.name, 'Service'),
      'technician_name', COALESCE(t.full_name, 'Technician'),
      'customer_name', customer_review_display_name(c.full_name, FALSE)
    ) AS row_data
    FROM customer_reviews cr
    JOIN profiles c ON c.id = cr.customer_id
    JOIN profiles t ON t.id = cr.technician_id
    JOIN services s ON s.id = cr.service_id
    WHERE cr.is_hidden = false
      AND cr.is_published = true
      AND cr.comment IS NOT NULL
      AND length(trim(cr.comment)) >= 1
    ORDER BY cr.published_at DESC NULLS LAST, cr.created_at DESC
    LIMIT safe_limit
  ) sub;

  RETURN result;
END;
$$;
