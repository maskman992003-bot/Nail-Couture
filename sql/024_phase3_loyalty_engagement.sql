-- Phase 3: Loyalty ledger, server-validated redemption, communication prefs, avatars
-- Run once in Supabase SQL Editor.

-- ------------------------------------------------------------
-- 1) loyalty_transactions ledger
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (
    transaction_type IN ('earn', 'redeem', 'referral_bonus', 'signup_bonus', 'birthday_bonus', 'adjustment')
  ),
  points integer NOT NULL,
  balance_after integer NOT NULL,
  description text,
  redemption_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_profile_created
  ON loyalty_transactions (profile_id, created_at DESC);

ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read loyalty_transactions" ON loyalty_transactions;
CREATE POLICY "Allow anon read loyalty_transactions"
  ON loyalty_transactions FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon insert loyalty_transactions" ON loyalty_transactions;
CREATE POLICY "Allow anon insert loyalty_transactions"
  ON loyalty_transactions FOR INSERT TO anon WITH CHECK (true);

-- ------------------------------------------------------------
-- 2) Profile columns — communication prefs + avatar
-- ------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS sms_reminders boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_promotions boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS preferred_contact text NOT NULL DEFAULT 'phone'
    CHECK (preferred_contact IN ('phone', 'email', 'sms'));

COMMENT ON COLUMN profiles.avatar_url IS 'Public URL for profile photo (Supabase Storage avatars bucket)';
COMMENT ON COLUMN profiles.sms_reminders IS 'Opt-in for SMS visit reminders (Phase 3)';
COMMENT ON COLUMN profiles.email_promotions IS 'Opt-in for promotional emails (Phase 3)';
COMMENT ON COLUMN profiles.preferred_contact IS 'Preferred contact channel: phone, email, or sms';

-- ------------------------------------------------------------
-- 3) Award points — now writes to ledger
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS award_loyalty_points(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS award_loyalty_points(uuid, integer, text) CASCADE;
DROP FUNCTION IF EXISTS award_loyalty_points(uuid, integer, text, text) CASCADE;

CREATE OR REPLACE FUNCTION award_loyalty_points(
  p_profile_id uuid,
  p_points integer,
  p_description text DEFAULT 'Points earned',
  p_type text DEFAULT 'earn'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new integer;
  v_type text;
BEGIN
  IF p_points = 0 THEN
    SELECT loyalty_points INTO v_new FROM profiles WHERE id = p_profile_id;
    RETURN COALESCE(v_new, 0);
  END IF;

  v_type := CASE
    WHEN p_type IN ('earn', 'referral_bonus', 'signup_bonus', 'birthday_bonus', 'adjustment') THEN p_type
    ELSE 'earn'
  END;

  UPDATE profiles
  SET loyalty_points = COALESCE(loyalty_points, 0) + p_points
  WHERE id = p_profile_id
  RETURNING loyalty_points INTO v_new;

  IF v_new IS NULL THEN
    RAISE EXCEPTION 'Profile not found: %', p_profile_id;
  END IF;

  INSERT INTO loyalty_transactions (profile_id, transaction_type, points, balance_after, description)
  VALUES (p_profile_id, v_type, p_points, v_new, p_description);

  RETURN v_new;
END;
$$;

-- ------------------------------------------------------------
-- 4) Server-validated reward redemption
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS redeem_loyalty_reward(uuid, integer, text) CASCADE;

CREATE OR REPLACE FUNCTION redeem_loyalty_reward(
  p_profile_id uuid,
  p_points_cost integer,
  p_reward_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current integer;
  v_new integer;
  v_code text;
BEGIN
  IF p_points_cost <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid points cost');
  END IF;

  SELECT loyalty_points INTO v_current
  FROM profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF v_current IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  IF v_current < p_points_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points', 'balance', v_current);
  END IF;

  v_new := v_current - p_points_cost;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  UPDATE profiles SET loyalty_points = v_new WHERE id = p_profile_id;

  INSERT INTO loyalty_transactions (
    profile_id, transaction_type, points, balance_after, description, redemption_code
  )
  VALUES (p_profile_id, 'redeem', -p_points_cost, v_new, p_reward_name, v_code);

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new,
    'redemption_code', v_code,
    'reward', p_reward_name,
    'points_cost', p_points_cost
  );
END;
$$;

-- ------------------------------------------------------------
-- 5) Avatar storage bucket (public read)
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Allow anon avatar uploads" ON storage.objects;
CREATE POLICY "Allow anon avatar uploads"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Allow anon avatar updates" ON storage.objects;
CREATE POLICY "Allow anon avatar updates"
  ON storage.objects FOR UPDATE TO anon
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Allow public avatar read" ON storage.objects;
CREATE POLICY "Allow public avatar read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');
