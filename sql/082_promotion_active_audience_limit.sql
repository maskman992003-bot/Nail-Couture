-- Migration 082: Limit concurrent active promotions per audience
-- Run once in Supabase SQL Editor after 081_promotions_audience_all_visibility.sql

CREATE OR REPLACE FUNCTION promotion_date_ranges_overlap(
  a_starts timestamptz,
  a_ends timestamptz,
  b_starts timestamptz,
  b_ends timestamptz
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(a_starts, '-infinity'::timestamptz) <= COALESCE(b_ends, 'infinity'::timestamptz)
     AND COALESCE(b_starts, '-infinity'::timestamptz) <= COALESCE(a_ends, 'infinity'::timestamptz);
$$;

CREATE OR REPLACE FUNCTION assert_promotion_active_limit(
  p_audience text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_exclude_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*)::int INTO v_count
  FROM promotions pr
  WHERE pr.is_active = true
    AND pr.audience = p_audience
    AND (p_exclude_id IS NULL OR pr.id <> p_exclude_id)
    AND promotion_date_ranges_overlap(pr.starts_at, pr.ends_at, p_starts_at, p_ends_at);

  IF v_count >= 2 THEN
    RAISE EXCEPTION 'Only 2 promotions can be active at the same time for this audience. Deactivate or adjust dates on another offer first.';
  END IF;
END;
$$;

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
  p_slide_in_auto_hide_seconds int DEFAULT NULL,
  p_suppress_after_dismiss boolean DEFAULT false,
  p_suppress_after_copy boolean DEFAULT false,
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

  IF NOT promotion_is_management_role(v_caller_role) THEN
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

  IF p_slide_in_auto_hide_seconds IS NOT NULL AND p_slide_in_auto_hide_seconds < 0 THEN
    RAISE EXCEPTION 'slide_in_auto_hide_seconds must be >= 0';
  END IF;

  IF COALESCE(p_is_active, true) THEN
    PERFORM assert_promotion_active_limit(p_audience, p_starts_at, p_ends_at, p_promotion_id);
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
      slide_in_auto_hide_seconds = NULLIF(p_slide_in_auto_hide_seconds, 0),
      suppress_after_dismiss = COALESCE(p_suppress_after_dismiss, false),
      suppress_after_copy = COALESCE(p_suppress_after_copy, false),
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
      slide_in_auto_hide_seconds, suppress_after_dismiss, suppress_after_copy,
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
      NULLIF(p_slide_in_auto_hide_seconds, 0),
      COALESCE(p_suppress_after_dismiss, false),
      COALESCE(p_suppress_after_copy, false),
      v_caller_id
    )
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

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

  IF NOT promotion_is_management_role(v_caller_role) THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  SELECT * INTO v_row
  FROM promotions
  WHERE id = p_promotion_id;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Promotion not found';
  END IF;

  IF COALESCE(p_is_active, false) THEN
    PERFORM assert_promotion_active_limit(v_row.audience, v_row.starts_at, v_row.ends_at, v_row.id);
  END IF;

  UPDATE promotions
  SET is_active = COALESCE(p_is_active, false), updated_at = now()
  WHERE id = p_promotion_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
