-- Migration 064: Customer reviews polish — moderation, featured reviews, checkout nudge
-- Run once in Supabase SQL Editor after 063_customer_reviews.sql

ALTER TABLE customer_reviews
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_customer_reviews_visible_service
  ON customer_reviews (service_id, created_at DESC)
  WHERE is_hidden = false;

-- ============================================================
-- Post-checkout review reminder (when visit completes)
-- ============================================================
CREATE OR REPLACE FUNCTION notify_review_request_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed'
     AND OLD.status IS DISTINCT FROM 'completed'
     AND NEW.customer_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM customer_reviews cr WHERE cr.appointment_id = NEW.id
     ) THEN
    PERFORM create_notification(
      NEW.customer_id,
      'How was your visit?',
      'Share a quick rating in Visit History — it helps us and your technician.',
      'review_request',
      NEW.id,
      jsonb_build_object('path', '/customer/history')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_review_request_on_completion ON appointments;
CREATE TRIGGER trg_notify_review_request_on_completion
  AFTER UPDATE OF status ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_review_request_on_completion();

-- ============================================================
-- Staff moderation
-- ============================================================
CREATE OR REPLACE FUNCTION moderate_customer_review(
  caller_phone TEXT,
  p_review_id UUID,
  p_action TEXT DEFAULT 'hide'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  v_action TEXT;
  updated customer_reviews%ROWTYPE;
BEGIN
  IF caller_phone IS NULL OR trim(caller_phone) = '' OR p_review_id IS NULL THEN
    RAISE EXCEPTION 'caller_phone and p_review_id are required';
  END IF;

  SELECT role INTO caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner', 'admin') THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  v_action := lower(trim(COALESCE(p_action, 'hide')));

  IF v_action = 'delete' THEN
    DELETE FROM customer_reviews WHERE id = p_review_id RETURNING * INTO updated;
    IF updated.id IS NULL THEN
      RAISE EXCEPTION 'Review not found.';
    END IF;
    RETURN jsonb_build_object('id', updated.id, 'deleted', true);
  END IF;

  IF v_action NOT IN ('hide', 'unhide') THEN
    RAISE EXCEPTION 'Invalid action. Use hide, unhide, or delete.';
  END IF;

  UPDATE customer_reviews
  SET is_hidden = (v_action = 'hide')
  WHERE id = p_review_id
  RETURNING * INTO updated;

  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'Review not found.';
  END IF;

  RETURN jsonb_build_object(
    'id', updated.id,
    'is_hidden', updated.is_hidden
  );
END;
$$;

-- ============================================================
-- Featured reviews for public marketing blocks
-- ============================================================
CREATE OR REPLACE FUNCTION get_featured_reviews(p_limit INT DEFAULT 6)
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
  safe_limit := GREATEST(1, LEAST(COALESCE(p_limit, 6), 20));

  SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'created_at' DESC), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'id', cr.id,
      'rating', cr.rating,
      'comment', cr.comment,
      'created_at', cr.created_at,
      'service_name', COALESCE(s.name, 'Service'),
      'technician_name', COALESCE(t.full_name, 'Technician'),
      'customer_name', customer_review_display_name(c.full_name, FALSE)
    ) AS row_data
    FROM customer_reviews cr
    JOIN profiles c ON c.id = cr.customer_id
    JOIN profiles t ON t.id = cr.technician_id
    JOIN services s ON s.id = cr.service_id
    WHERE cr.is_hidden = false
      AND cr.comment IS NOT NULL
      AND length(trim(cr.comment)) >= 8
    ORDER BY cr.rating DESC, cr.created_at DESC
    LIMIT safe_limit
  ) sub;

  RETURN result;
END;
$$;

-- ============================================================
-- Refresh public read RPCs to respect is_hidden
-- ============================================================
CREATE OR REPLACE FUNCTION get_reviews_for_technician(
  p_technician_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  caller_phone TEXT DEFAULT NULL
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

  SELECT jsonb_build_object(
    'avg_rating', ROUND(AVG(rating)::numeric, 1),
    'review_count', COUNT(*)
  )
  INTO summary
  FROM customer_reviews
  WHERE technician_id = p_technician_id
    AND (NOT is_hidden OR is_staff);

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
    JOIN services s ON s.id = cr.service_id
    WHERE cr.technician_id = p_technician_id
      AND (NOT cr.is_hidden OR is_staff)
    ORDER BY cr.created_at DESC
    LIMIT safe_limit
    OFFSET safe_offset
  ) sub;

  RETURN summary || jsonb_build_object('reviews', reviews);
END;
$$;

CREATE OR REPLACE FUNCTION get_service_review_summary(p_service_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  summary JSONB;
BEGIN
  IF p_service_id IS NULL THEN
    RETURN jsonb_build_object('service_id', NULL, 'avg_rating', NULL, 'review_count', 0);
  END IF;

  SELECT jsonb_build_object(
    'service_id', p_service_id,
    'avg_rating', ROUND(AVG(rating)::numeric, 1),
    'review_count', COUNT(*)
  )
  INTO summary
  FROM customer_reviews
  WHERE service_id = p_service_id
    AND is_hidden = false;

  RETURN COALESCE(
    summary,
    jsonb_build_object('service_id', p_service_id, 'avg_rating', NULL, 'review_count', 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_service_review_summaries(p_service_ids BIGINT[])
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  IF p_service_ids IS NULL OR array_length(p_service_ids, 1) IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'service_id', s.id,
      'avg_rating', ROUND(stats.avg_rating::numeric, 1),
      'review_count', COALESCE(stats.review_count, 0)
    )
  ), '[]'::jsonb)
  INTO result
  FROM unnest(p_service_ids) AS s(id)
  LEFT JOIN LATERAL (
    SELECT AVG(cr.rating) AS avg_rating, COUNT(*) AS review_count
    FROM customer_reviews cr
    WHERE cr.service_id = s.id
      AND cr.is_hidden = false
  ) stats ON TRUE;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_reviews_for_service(
  p_service_id BIGINT,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  safe_limit INT;
  safe_offset INT;
  summary JSONB;
  reviews JSONB;
BEGIN
  IF p_service_id IS NULL THEN
    RAISE EXCEPTION 'p_service_id is required';
  END IF;

  safe_limit := GREATEST(1, LEAST(COALESCE(p_limit, 10), 100));
  safe_offset := GREATEST(0, COALESCE(p_offset, 0));

  summary := get_service_review_summary(p_service_id);

  SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'created_at' DESC), '[]'::jsonb)
  INTO reviews
  FROM (
    SELECT jsonb_build_object(
      'id', cr.id,
      'rating', cr.rating,
      'comment', cr.comment,
      'created_at', cr.created_at,
      'technician_name', COALESCE(t.full_name, 'Technician'),
      'customer_name', customer_review_display_name(c.full_name, FALSE)
    ) AS row_data
    FROM customer_reviews cr
    JOIN profiles c ON c.id = cr.customer_id
    JOIN profiles t ON t.id = cr.technician_id
    WHERE cr.service_id = p_service_id
      AND cr.is_hidden = false
    ORDER BY cr.created_at DESC
    LIMIT safe_limit
    OFFSET safe_offset
  ) sub;

  RETURN summary || jsonb_build_object('reviews', reviews);
END;
$$;

CREATE OR REPLACE FUNCTION get_technician_review_summary(p_technician_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  summary JSONB;
BEGIN
  IF p_technician_id IS NULL THEN
    RETURN jsonb_build_object('avg_rating', NULL, 'review_count', 0);
  END IF;

  SELECT jsonb_build_object(
    'avg_rating', ROUND(AVG(rating)::numeric, 1),
    'review_count', COUNT(*)
  )
  INTO summary
  FROM customer_reviews
  WHERE technician_id = p_technician_id
    AND is_hidden = false;

  RETURN COALESCE(summary, jsonb_build_object('avg_rating', NULL, 'review_count', 0));
END;
$$;

GRANT EXECUTE ON FUNCTION moderate_customer_review(TEXT, UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_featured_reviews(INT) TO anon, authenticated;
