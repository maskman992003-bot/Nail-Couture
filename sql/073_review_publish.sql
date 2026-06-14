-- Migration 073: Management publish gate for featured testimonials
-- Run once in Supabase SQL Editor after 072_add_staff_member_rpc.sql
-- Reviews appear on the public site only after management clicks Publish.

ALTER TABLE customer_reviews
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customer_reviews_published
  ON customer_reviews (published_at DESC NULLS LAST)
  WHERE is_published = true AND is_hidden = false;

COMMENT ON COLUMN customer_reviews.is_published IS 'When true, review may appear in public marketing blocks (CustomerTestimonials)';

-- ============================================================
-- Publish / unpublish (management only)
-- ============================================================
CREATE OR REPLACE FUNCTION publish_customer_review(
  caller_phone TEXT,
  p_review_id UUID,
  p_action TEXT DEFAULT 'publish'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
  v_action TEXT;
  existing customer_reviews%ROWTYPE;
  updated customer_reviews%ROWTYPE;
BEGIN
  IF caller_phone IS NULL OR trim(caller_phone) = '' OR p_review_id IS NULL THEN
    RAISE EXCEPTION 'caller_phone and p_review_id are required';
  END IF;

  SELECT id, role INTO caller_id, caller_role
  FROM profiles
  WHERE phone = caller_phone;

  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner', 'admin') THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  v_action := lower(trim(COALESCE(p_action, 'publish')));
  IF v_action NOT IN ('publish', 'unpublish') THEN
    RAISE EXCEPTION 'Invalid action. Use publish or unpublish.';
  END IF;

  SELECT * INTO existing FROM customer_reviews WHERE id = p_review_id;
  IF existing.id IS NULL THEN
    RAISE EXCEPTION 'Review not found.';
  END IF;

  IF v_action = 'publish' THEN
    IF existing.is_hidden THEN
      RAISE EXCEPTION 'Unhide this review before publishing it publicly.';
    END IF;
    IF existing.comment IS NULL OR length(trim(existing.comment)) < 1 THEN
      RAISE EXCEPTION 'Review must include a comment before publishing.';
    END IF;

    UPDATE customer_reviews
    SET
      is_published = true,
      published_at = now(),
      published_by = caller_id
    WHERE id = p_review_id
    RETURNING * INTO updated;
  ELSE
    UPDATE customer_reviews
    SET
      is_published = false,
      published_at = NULL,
      published_by = NULL
    WHERE id = p_review_id
    RETURNING * INTO updated;
  END IF;

  RETURN jsonb_build_object(
    'id', updated.id,
    'is_published', updated.is_published,
    'published_at', updated.published_at
  );
END;
$$;

-- Auto-unpublish when a review is hidden
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
  SET
    is_hidden = (v_action = 'hide'),
    is_published = CASE WHEN v_action = 'hide' THEN false ELSE is_published END,
    published_at = CASE WHEN v_action = 'hide' THEN NULL ELSE published_at END,
    published_by = CASE WHEN v_action = 'hide' THEN NULL ELSE published_by END
  WHERE id = p_review_id
  RETURNING * INTO updated;

  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'Review not found.';
  END IF;

  RETURN jsonb_build_object(
    'id', updated.id,
    'is_hidden', updated.is_hidden,
    'is_published', updated.is_published
  );
END;
$$;

-- ============================================================
-- Featured reviews — management-published only
-- ============================================================
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

-- Include is_published in staff list RPCs
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
  can_view_hidden BOOLEAN := FALSE;
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

  can_view_hidden := caller_role IN ('super_admin', 'owner', 'partner');
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
    AND (can_view_hidden OR NOT cr.is_hidden)
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
    AND (can_view_hidden OR NOT cr.is_hidden)
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
      'is_hidden', cr.is_hidden,
      'is_published', cr.is_published,
      'published_at', cr.published_at
    ) AS row_data
    FROM customer_reviews cr
    JOIN profiles c ON c.id = cr.customer_id
    JOIN profiles t ON t.id = cr.technician_id
    JOIN services s ON s.id = cr.service_id
    WHERE (filter_technician IS NULL OR cr.technician_id = filter_technician)
      AND (can_view_hidden OR NOT cr.is_hidden)
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
  can_view_hidden BOOLEAN := FALSE;
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
    can_view_hidden := caller_role IN ('super_admin', 'owner', 'partner');
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
    AND (can_view_hidden OR NOT cr.is_hidden)
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
    AND (can_view_hidden OR NOT cr.is_hidden)
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
      'is_hidden', cr.is_hidden,
      'is_published', cr.is_published,
      'published_at', cr.published_at
    ) AS row_data
    FROM customer_reviews cr
    JOIN profiles c ON c.id = cr.customer_id
    JOIN profiles t ON t.id = cr.technician_id
    JOIN services s ON s.id = cr.service_id
    WHERE cr.technician_id = p_technician_id
      AND (can_view_hidden OR NOT cr.is_hidden)
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

GRANT EXECUTE ON FUNCTION publish_customer_review(TEXT, UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_featured_reviews(INT) TO anon, authenticated;
