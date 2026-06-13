-- Migration 063: Customer reviews (post-visit, one per appointment)
-- Run once in Supabase SQL Editor after 062_staff_nail_assessment_rpc.sql
-- Links completed visits to technician + primary service ratings.

CREATE TABLE IF NOT EXISTS customer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_reviews_technician_created
  ON customer_reviews (technician_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_reviews_service_created
  ON customer_reviews (service_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_reviews_customer_created
  ON customer_reviews (customer_id, created_at DESC);

COMMENT ON TABLE customer_reviews IS 'Post-visit customer ratings tied to appointment, technician, and primary service';

ALTER TABLE customer_reviews ENABLE ROW LEVEL SECURITY;

-- No permissive policies: all access via SECURITY DEFINER RPCs below.

-- ============================================================
-- Helpers
-- ============================================================
CREATE OR REPLACE FUNCTION customer_review_display_name(
  p_full_name TEXT,
  p_is_staff BOOLEAN DEFAULT FALSE
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_is_staff THEN COALESCE(NULLIF(trim(p_full_name), ''), 'Customer')
    ELSE COALESCE(NULLIF(split_part(trim(COALESCE(p_full_name, '')), ' ', 1), ''), 'Customer')
  END;
$$;

CREATE OR REPLACE FUNCTION resolve_appointment_technician_id(p_appointment_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  tech_id UUID;
BEGIN
  SELECT technician_id INTO tech_id
  FROM appointments
  WHERE id = p_appointment_id;

  IF tech_id IS NOT NULL THEN
    RETURN tech_id;
  END IF;

  SELECT avt.technician_id INTO tech_id
  FROM appointment_visit_technicians avt
  WHERE avt.appointment_id = p_appointment_id
    AND avt.participation_type = 'primary'
  ORDER BY avt.started_at DESC
  LIMIT 1;

  RETURN tech_id;
END;
$$;

-- ============================================================
-- Submit review (customers only, post-visit)
-- ============================================================
CREATE OR REPLACE FUNCTION submit_customer_review(
  caller_phone TEXT,
  p_appointment_id UUID,
  p_rating SMALLINT,
  p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
  appt RECORD;
  tech_id UUID;
  safe_comment TEXT;
  inserted customer_reviews%ROWTYPE;
BEGIN
  IF caller_phone IS NULL OR trim(caller_phone) = '' OR p_appointment_id IS NULL THEN
    RAISE EXCEPTION 'caller_phone and p_appointment_id are required';
  END IF;

  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5.';
  END IF;

  SELECT id, role INTO caller_id, caller_role
  FROM profiles
  WHERE phone = caller_phone;

  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  IF caller_role <> 'customer' THEN
    RAISE EXCEPTION 'Only customers can submit reviews.';
  END IF;

  SELECT id, customer_id, service_id, status
  INTO appt
  FROM appointments
  WHERE id = p_appointment_id;

  IF appt.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found.';
  END IF;

  IF appt.customer_id <> caller_id THEN
    RAISE EXCEPTION 'Not authorized to review this visit.';
  END IF;

  IF appt.status <> 'completed' THEN
    RAISE EXCEPTION 'Visit must be completed before reviewing.';
  END IF;

  IF appt.service_id IS NULL THEN
    RAISE EXCEPTION 'No service found for this visit.';
  END IF;

  IF EXISTS (SELECT 1 FROM customer_reviews WHERE appointment_id = p_appointment_id) THEN
    RAISE EXCEPTION 'A review has already been submitted for this visit.';
  END IF;

  tech_id := resolve_appointment_technician_id(p_appointment_id);
  IF tech_id IS NULL THEN
    RAISE EXCEPTION 'No technician found for this visit.';
  END IF;

  safe_comment := NULLIF(left(trim(COALESCE(p_comment, '')), 1000), '');

  INSERT INTO customer_reviews (
    appointment_id, customer_id, technician_id, service_id, rating, comment
  )
  VALUES (
    p_appointment_id, caller_id, tech_id, appt.service_id, p_rating, safe_comment
  )
  RETURNING * INTO inserted;

  RETURN jsonb_build_object(
    'id', inserted.id,
    'appointment_id', inserted.appointment_id,
    'rating', inserted.rating,
    'comment', inserted.comment,
    'technician_id', inserted.technician_id,
    'service_id', inserted.service_id,
    'created_at', inserted.created_at
  );
END;
$$;

-- ============================================================
-- Completed visits without a review yet
-- ============================================================
CREATE OR REPLACE FUNCTION get_reviewable_appointments(
  caller_phone TEXT,
  p_limit INT DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
  safe_limit INT;
  result JSONB;
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

  safe_limit := GREATEST(1, LEAST(COALESCE(p_limit, 20), 100));

  SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'visit_date' DESC), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'appointment_id', a.id,
      'visit_date', COALESCE(a.completed_at, a.checked_in_at, a.scheduled_at, a.created_at),
      'service_name', COALESCE(s.name, 'Service'),
      'technician_name', COALESCE(t.full_name, 'Technician')
    ) AS row_data
    FROM appointments a
    LEFT JOIN services s ON s.id = a.service_id
    LEFT JOIN profiles t ON t.id = resolve_appointment_technician_id(a.id)
    WHERE a.customer_id = caller_id
      AND a.status = 'completed'
      AND NOT EXISTS (
        SELECT 1 FROM customer_reviews cr WHERE cr.appointment_id = a.id
      )
    ORDER BY COALESCE(a.completed_at, a.checked_in_at, a.scheduled_at, a.created_at) DESC
    LIMIT safe_limit
  ) sub;

  RETURN result;
END;
$$;

-- ============================================================
-- Technician reviews + summary
-- ============================================================
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
  WHERE technician_id = p_technician_id;

  RETURN COALESCE(summary, jsonb_build_object('avg_rating', NULL, 'review_count', 0));
END;
$$;

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

  summary := get_technician_review_summary(p_technician_id);

  SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'created_at' DESC), '[]'::jsonb)
  INTO reviews
  FROM (
    SELECT jsonb_build_object(
      'id', cr.id,
      'rating', cr.rating,
      'comment', cr.comment,
      'created_at', cr.created_at,
      'service_name', COALESCE(s.name, 'Service'),
      'customer_name', customer_review_display_name(c.full_name, is_staff)
    ) AS row_data
    FROM customer_reviews cr
    JOIN profiles c ON c.id = cr.customer_id
    JOIN services s ON s.id = cr.service_id
    WHERE cr.technician_id = p_technician_id
    ORDER BY cr.created_at DESC
    LIMIT safe_limit
    OFFSET safe_offset
  ) sub;

  RETURN summary || jsonb_build_object('reviews', reviews);
END;
$$;

-- ============================================================
-- Service reviews + batch summaries
-- ============================================================
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
  WHERE service_id = p_service_id;

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
    ORDER BY cr.created_at DESC
    LIMIT safe_limit
    OFFSET safe_offset
  ) sub;

  RETURN summary || jsonb_build_object('reviews', reviews);
END;
$$;

GRANT EXECUTE ON FUNCTION submit_customer_review(TEXT, UUID, SMALLINT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_reviewable_appointments(TEXT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_technician_review_summary(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_reviews_for_technician(UUID, INT, INT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_service_review_summary(BIGINT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_service_review_summaries(BIGINT[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_reviews_for_service(BIGINT, INT, INT) TO anon, authenticated;
