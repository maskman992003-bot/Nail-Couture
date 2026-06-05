-- Phase 4: Staff CRM — internal notes, loyalty adjustments, visit photos
-- Run once in Supabase SQL Editor after 024_phase3_loyalty_engagement.sql

-- ------------------------------------------------------------
-- 1) Internal staff notes on customers
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_staff_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT 'Staff',
  note text NOT NULL CHECK (char_length(trim(note)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_staff_notes_customer
  ON customer_staff_notes (customer_id, created_at DESC);

ALTER TABLE customer_staff_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read customer_staff_notes" ON customer_staff_notes;
CREATE POLICY "Allow anon read customer_staff_notes"
  ON customer_staff_notes FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon insert customer_staff_notes" ON customer_staff_notes;
CREATE POLICY "Allow anon insert customer_staff_notes"
  ON customer_staff_notes FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon delete customer_staff_notes" ON customer_staff_notes;
CREATE POLICY "Allow anon delete customer_staff_notes"
  ON customer_staff_notes FOR DELETE TO anon USING (true);

-- ------------------------------------------------------------
-- 2) Visit before/after photos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visit_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  photo_type text NOT NULL DEFAULT 'after'
    CHECK (photo_type IN ('before', 'after')),
  caption text,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visit_photos_customer
  ON visit_photos (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_visit_photos_appointment
  ON visit_photos (appointment_id);

ALTER TABLE visit_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read visit_photos" ON visit_photos;
CREATE POLICY "Allow anon read visit_photos"
  ON visit_photos FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon insert visit_photos" ON visit_photos;
CREATE POLICY "Allow anon insert visit_photos"
  ON visit_photos FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon delete visit_photos" ON visit_photos;
CREATE POLICY "Allow anon delete visit_photos"
  ON visit_photos FOR DELETE TO anon USING (true);

-- ------------------------------------------------------------
-- 3) Staff loyalty adjustment (audit logged)
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS adjust_loyalty_points(uuid, integer, text, uuid) CASCADE;

CREATE OR REPLACE FUNCTION adjust_loyalty_points(
  p_profile_id uuid,
  p_delta integer,
  p_reason text DEFAULT 'Manual adjustment',
  p_staff_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current integer;
  v_new integer;
  v_reason text;
BEGIN
  IF p_delta = 0 THEN
    SELECT loyalty_points INTO v_current FROM profiles WHERE id = p_profile_id;
    RETURN jsonb_build_object('success', false, 'error', 'Delta must not be zero', 'balance', COALESCE(v_current, 0));
  END IF;

  SELECT loyalty_points INTO v_current
  FROM profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF v_current IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  v_new := v_current + p_delta;
  IF v_new < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Balance cannot go below zero', 'balance', v_current);
  END IF;

  v_reason := COALESCE(NULLIF(trim(p_reason), ''), 'Manual adjustment');

  UPDATE profiles SET loyalty_points = v_new WHERE id = p_profile_id;

  INSERT INTO loyalty_transactions (
    profile_id, transaction_type, points, balance_after, description, metadata
  )
  VALUES (
    p_profile_id,
    'adjustment',
    p_delta,
    v_new,
    v_reason,
    jsonb_build_object('staff_id', p_staff_id)
  );

  RETURN jsonb_build_object('success', true, 'new_balance', v_new, 'delta', p_delta);
END;
$$;

-- ------------------------------------------------------------
-- 4) Visit photos storage bucket
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'visit-photos',
  'visit-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Allow anon visit photo uploads" ON storage.objects;
CREATE POLICY "Allow anon visit photo uploads"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'visit-photos');

DROP POLICY IF EXISTS "Allow anon visit photo updates" ON storage.objects;
CREATE POLICY "Allow anon visit photo updates"
  ON storage.objects FOR UPDATE TO anon
  USING (bucket_id = 'visit-photos');

DROP POLICY IF EXISTS "Allow public visit photo read" ON storage.objects;
CREATE POLICY "Allow public visit photo read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'visit-photos');
