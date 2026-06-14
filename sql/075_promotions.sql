-- Migration 075: Home-screen promotions (First-Visit, seasonal offers)
-- Run once in Supabase SQL Editor after 074_featured_reviews_home_limit_9.sql

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('first_visit', 'seasonal', 'general')),
  title text NOT NULL,
  subtitle text NULL,
  body text NOT NULL DEFAULT '',
  promo_code text NOT NULL,
  discount_label text NOT NULL DEFAULT '',
  cta_label text NOT NULL DEFAULT 'Copy code',
  cta_action text NOT NULL DEFAULT 'copy_code'
    CHECK (cta_action IN ('copy_code', 'scroll_booking', 'external_url')),
  cta_url text NULL,
  display_surfaces text[] NOT NULL DEFAULT '{public_home}',
  audience text NOT NULL DEFAULT 'all'
    CHECK (audience IN ('all', 'customers', 'first_visit_only')),
  starts_at timestamptz NULL,
  ends_at timestamptz NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  show_slide_in boolean NOT NULL DEFAULT false,
  show_shimmer_cta boolean NOT NULL DEFAULT false,
  created_by uuid NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promotions_active_dates
  ON promotions (is_active, sort_order, created_at DESC);

COMMENT ON TABLE promotions IS
  'Remote-configurable home-screen promotions with promo codes (display/copy in v1).';

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- No permissive customer policies — reads go through SECURITY DEFINER RPCs.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION promotion_is_executive_role(p_role text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_role IN ('super_admin', 'owner');
$$;

CREATE OR REPLACE FUNCTION promotion_customer_completed_visits(p_customer_id uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM appointments a
  WHERE a.customer_id = p_customer_id
    AND a.status = 'completed'
    AND (a.booking_type = 'walk_in' OR a.booking_type IS NULL);
$$;

CREATE OR REPLACE FUNCTION promotion_is_within_window(
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (
    (p_starts_at IS NULL OR p_starts_at <= now())
    AND (p_ends_at IS NULL OR p_ends_at >= now())
  );
$$;

-- ---------------------------------------------------------------------------
-- list_active_promotions — customer/public read via RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION list_active_promotions(
  p_caller_phone text DEFAULT NULL,
  p_surface text DEFAULT 'public_home'
)
RETURNS SETOF promotions
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_caller_role text;
  v_completed_visits int := 0;
  v_is_customer boolean := false;
BEGIN
  IF p_surface IS NULL OR trim(p_surface) = '' THEN
    RAISE EXCEPTION 'p_surface is required';
  END IF;

  IF p_caller_phone IS NOT NULL AND trim(p_caller_phone) <> '' THEN
    SELECT p.id, p.role::text
    INTO v_caller_id, v_caller_role
    FROM profiles p
    WHERE p.phone = p_caller_phone;

    IF v_caller_id IS NOT NULL AND v_caller_role = 'customer' THEN
      v_is_customer := true;
      v_completed_visits := promotion_customer_completed_visits(v_caller_id);
    END IF;
  END IF;

  RETURN QUERY
  SELECT pr.*
  FROM promotions pr
  WHERE pr.is_active = true
    AND p_surface = ANY(pr.display_surfaces)
    AND promotion_is_within_window(pr.starts_at, pr.ends_at)
    AND (
      -- Anonymous: only broad seasonal/general offers
      (v_caller_id IS NULL AND pr.audience = 'all')
      OR (
        v_caller_id IS NOT NULL
        AND v_caller_role = 'customer'
        AND (
          pr.audience = 'all'
          OR pr.audience = 'customers'
          OR (pr.audience = 'first_visit_only' AND v_completed_visits = 0)
        )
      )
    )
  ORDER BY pr.sort_order ASC, pr.created_at DESC;
END;
$$;

COMMENT ON FUNCTION list_active_promotions IS
  'Returns active promotions for a display surface; first_visit_only requires logged-in customer with zero completed walk-in visits.';

-- ---------------------------------------------------------------------------
-- list_promotions_admin — executive CRUD list
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION list_promotions_admin(p_caller_phone text)
RETURNS SETOF promotions
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  IF p_caller_phone IS NULL OR trim(p_caller_phone) = '' THEN
    RAISE EXCEPTION 'p_caller_phone is required';
  END IF;

  SELECT role::text INTO v_caller_role
  FROM profiles
  WHERE phone = p_caller_phone;

  IF NOT promotion_is_executive_role(v_caller_role) THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  RETURN QUERY
  SELECT pr.*
  FROM promotions pr
  ORDER BY pr.sort_order ASC, pr.created_at DESC;
END;
$$;

-- ---------------------------------------------------------------------------
-- upsert_promotion — create or update
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION upsert_promotion(
  p_caller_phone text,
  p_slug text,
  p_kind text,
  p_title text,
  p_body text DEFAULT '',
  p_subtitle text DEFAULT NULL,
  p_promo_code text DEFAULT '',
  p_discount_label text DEFAULT '',
  p_cta_label text DEFAULT 'Copy code',
  p_cta_action text DEFAULT 'copy_code',
  p_cta_url text DEFAULT NULL,
  p_display_surfaces text[] DEFAULT ARRAY['public_home'],
  p_audience text DEFAULT 'all',
  p_starts_at timestamptz DEFAULT NULL,
  p_ends_at timestamptz DEFAULT NULL,
  p_is_active boolean DEFAULT true,
  p_sort_order int DEFAULT 0,
  p_show_slide_in boolean DEFAULT false,
  p_show_shimmer_cta boolean DEFAULT false,
  p_promotion_id uuid DEFAULT NULL
)
RETURNS promotions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_caller_role text;
  v_row promotions%ROWTYPE;
BEGIN
  IF p_caller_phone IS NULL OR trim(p_caller_phone) = '' THEN
    RAISE EXCEPTION 'p_caller_phone is required';
  END IF;

  IF p_slug IS NULL OR trim(p_slug) = '' OR p_title IS NULL OR trim(p_title) = '' THEN
    RAISE EXCEPTION 'slug and title are required';
  END IF;

  SELECT id, role::text INTO v_caller_id, v_caller_role
  FROM profiles
  WHERE phone = p_caller_phone;

  IF NOT promotion_is_executive_role(v_caller_role) THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  IF p_kind NOT IN ('first_visit', 'seasonal', 'general') THEN
    RAISE EXCEPTION 'Invalid kind';
  END IF;

  IF p_audience NOT IN ('all', 'customers', 'first_visit_only') THEN
    RAISE EXCEPTION 'Invalid audience';
  END IF;

  IF p_cta_action NOT IN ('copy_code', 'scroll_booking', 'external_url') THEN
    RAISE EXCEPTION 'Invalid cta_action';
  END IF;

  IF p_promotion_id IS NOT NULL THEN
    UPDATE promotions
    SET
      slug = trim(p_slug),
      kind = p_kind,
      title = trim(p_title),
      subtitle = NULLIF(trim(p_subtitle), ''),
      body = COALESCE(p_body, ''),
      promo_code = upper(trim(COALESCE(p_promo_code, ''))),
      discount_label = COALESCE(p_discount_label, ''),
      cta_label = COALESCE(p_cta_label, 'Copy code'),
      cta_action = p_cta_action,
      cta_url = NULLIF(trim(p_cta_url), ''),
      display_surfaces = COALESCE(p_display_surfaces, ARRAY['public_home']::text[]),
      audience = p_audience,
      starts_at = p_starts_at,
      ends_at = p_ends_at,
      is_active = COALESCE(p_is_active, true),
      sort_order = COALESCE(p_sort_order, 0),
      show_slide_in = COALESCE(p_show_slide_in, false),
      show_shimmer_cta = COALESCE(p_show_shimmer_cta, false),
      updated_at = now()
    WHERE id = p_promotion_id
    RETURNING * INTO v_row;

    IF v_row.id IS NULL THEN
      RAISE EXCEPTION 'Promotion not found';
    END IF;
  ELSE
    INSERT INTO promotions (
      slug, kind, title, subtitle, body, promo_code, discount_label,
      cta_label, cta_action, cta_url, display_surfaces, audience,
      starts_at, ends_at, is_active, sort_order, show_slide_in, show_shimmer_cta,
      created_by
    ) VALUES (
      trim(p_slug),
      p_kind,
      trim(p_title),
      NULLIF(trim(p_subtitle), ''),
      COALESCE(p_body, ''),
      upper(trim(COALESCE(p_promo_code, ''))),
      COALESCE(p_discount_label, ''),
      COALESCE(p_cta_label, 'Copy code'),
      p_cta_action,
      NULLIF(trim(p_cta_url), ''),
      COALESCE(p_display_surfaces, ARRAY['public_home']::text[]),
      p_audience,
      p_starts_at,
      p_ends_at,
      COALESCE(p_is_active, true),
      COALESCE(p_sort_order, 0),
      COALESCE(p_show_slide_in, false),
      COALESCE(p_show_shimmer_cta, false),
      v_caller_id
    )
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

-- ---------------------------------------------------------------------------
-- set_promotion_active — soft deactivate
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_promotion_active(
  p_caller_phone text,
  p_promotion_id uuid,
  p_is_active boolean
)
RETURNS promotions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_row promotions%ROWTYPE;
BEGIN
  IF p_caller_phone IS NULL OR trim(p_caller_phone) = '' OR p_promotion_id IS NULL THEN
    RAISE EXCEPTION 'p_caller_phone and p_promotion_id are required';
  END IF;

  SELECT role::text INTO v_caller_role
  FROM profiles
  WHERE phone = p_caller_phone;

  IF NOT promotion_is_executive_role(v_caller_role) THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  UPDATE promotions
  SET is_active = COALESCE(p_is_active, false), updated_at = now()
  WHERE id = p_promotion_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Promotion not found';
  END IF;

  RETURN v_row;
END;
$$;

-- ---------------------------------------------------------------------------
-- Seed promotions (idempotent by slug)
-- ---------------------------------------------------------------------------

INSERT INTO promotions (
  slug, kind, title, subtitle, body, promo_code, discount_label,
  cta_label, cta_action, display_surfaces, audience,
  is_active, sort_order, show_slide_in, show_shimmer_cta
)
VALUES (
  'first-visit',
  'first_visit',
  'Welcome to Nail Couture',
  'First visit offer',
  'Enjoy a special discount on your first in-salon visit. Mention this code at checkout — our team will apply it for you.',
  'WELCOME15',
  '15% off your first visit',
  'Copy code',
  'copy_code',
  ARRAY['customer_home', 'public_home']::text[],
  'first_visit_only',
  true,
  0,
  true,
  false
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO promotions (
  slug, kind, title, subtitle, body, promo_code, discount_label,
  cta_label, cta_action, display_surfaces, audience,
  starts_at, ends_at, is_active, sort_order, show_slide_in, show_shimmer_cta
)
VALUES (
  'summer-2026',
  'seasonal',
  'Summer Offers',
  'Limited season',
  'Refresh your look with our summer collection. Book your appointment and share this code with our team at checkout.',
  'SUMMER20',
  '20% off select services',
  'Copy code',
  'copy_code',
  ARRAY['public_home', 'customer_home']::text[],
  'all',
  '2026-06-01T00:00:00+00'::timestamptz,
  '2026-08-31T23:59:59+00'::timestamptz,
  true,
  1,
  false,
  true
)
ON CONFLICT (slug) DO NOTHING;
