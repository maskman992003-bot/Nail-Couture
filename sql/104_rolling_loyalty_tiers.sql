-- Migration 104: Rolling 12-month tiers, Regular Customer tier, FM floors, vault point expiry
-- Run once in Supabase SQL Editor after 103_founding_legacy_cap_100.sql
--
-- Tier spend: rolling 365 days (final_amount + gift_card_amount)
-- FM floor: Vanguard → Diamond, Legacy → Atelier for 1 year from founding_awarded_at
-- Vault points: FIFO lots with tier-based expiry at earn time

-- ============================================================================
-- 1) Schema
-- ============================================================================

ALTER TABLE profiles
  RENAME COLUMN calendar_spend_ytd TO rolling_spend_12m;

COMMENT ON COLUMN profiles.rolling_spend_12m IS
  'Completed checkout spend in the last 365 days (final_amount + gift_card_amount)';

ALTER TABLE profiles
  ALTER COLUMN loyalty_tier SET DEFAULT 'regular_customer',
  ALTER COLUMN loyalty_tier_earned SET DEFAULT 'regular_customer';

-- Extend transaction types for point expiry
ALTER TABLE loyalty_transactions
  DROP CONSTRAINT IF EXISTS loyalty_transactions_transaction_type_check;

ALTER TABLE loyalty_transactions
  ADD CONSTRAINT loyalty_transactions_transaction_type_check
  CHECK (transaction_type IN (
    'earn', 'redeem', 'referral_bonus', 'signup_bonus', 'birthday_bonus', 'adjustment', 'expire'
  ));

CREATE TABLE IF NOT EXISTS loyalty_point_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points_original integer NOT NULL CHECK (points_original > 0),
  points_remaining integer NOT NULL CHECK (points_remaining >= 0),
  expires_at timestamptz NOT NULL,
  tier_at_earn text NOT NULL,
  source_type text NOT NULL DEFAULT 'earn',
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_point_lots_profile_expires
  ON loyalty_point_lots (profile_id, expires_at ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_loyalty_point_lots_expired
  ON loyalty_point_lots (expires_at)
  WHERE points_remaining > 0;

ALTER TABLE loyalty_point_lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read loyalty_point_lots" ON loyalty_point_lots;
CREATE POLICY "Allow anon read loyalty_point_lots"
  ON loyalty_point_lots FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon insert loyalty_point_lots" ON loyalty_point_lots;
CREATE POLICY "Allow anon insert loyalty_point_lots"
  ON loyalty_point_lots FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update loyalty_point_lots" ON loyalty_point_lots;
CREATE POLICY "Allow anon update loyalty_point_lots"
  ON loyalty_point_lots FOR UPDATE TO anon USING (true);

-- ============================================================================
-- 2) Tier config — 4 tiers
-- ============================================================================

INSERT INTO loyalty_tiers (id, display_name, spend_threshold, earn_multiplier, booking_window_days, sort_order, tagline)
VALUES
  ('regular_customer', 'Regular Customer', 0, 1.0, 0, 0, 'Welcome to Nail Couture.'),
  ('pearl', 'Pearl', 500, 1.1, 0, 1, 'Your introduction to the Nail Couture experience.'),
  ('atelier', 'Atelier', 1500, 1.2, 14, 2, 'For clients who make self-care part of their lifestyle.'),
  ('diamond_couture', 'Diamond', 3000, 1.5, 30, 3, 'Reserved for our most valued clients.')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  spend_threshold = EXCLUDED.spend_threshold,
  earn_multiplier = EXCLUDED.earn_multiplier,
  booking_window_days = EXCLUDED.booking_window_days,
  sort_order = EXCLUDED.sort_order,
  tagline = EXCLUDED.tagline;

-- ============================================================================
-- 3) Tier helpers
-- ============================================================================

CREATE OR REPLACE FUNCTION loyalty_tier_rank(p_tier text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_tier
    WHEN 'diamond_couture' THEN 4
    WHEN 'atelier' THEN 3
    WHEN 'pearl' THEN 2
    WHEN 'regular_customer' THEN 1
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION loyalty_tier_from_spend(p_spend numeric)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT id
      FROM loyalty_tiers
      WHERE spend_threshold <= COALESCE(p_spend, 0)
      ORDER BY spend_threshold DESC
      LIMIT 1
    ),
    'regular_customer'
  );
$$;

CREATE OR REPLACE FUNCTION get_tier_earn_multiplier(p_tier text)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT earn_multiplier FROM loyalty_tiers WHERE id = p_tier),
    1.0
  );
$$;

CREATE OR REPLACE FUNCTION get_point_expiry_interval(p_tier text)
RETURNS interval
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_tier
    WHEN 'diamond_couture' THEN interval '1 year'
    WHEN 'atelier' THEN interval '6 months'
    ELSE interval '3 months'
  END;
$$;

-- ============================================================================
-- 4) Rolling spend + tier computation
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_rolling_spend(p_profile_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_spend numeric;
BEGIN
  SELECT COALESCE(SUM(final_amount + COALESCE(gift_card_amount, 0)), 0)
  INTO v_spend
  FROM payment_transactions
  WHERE customer_id = p_profile_id
    AND status = 'completed'
    AND created_at >= now() - interval '365 days';

  UPDATE profiles
  SET rolling_spend_12m = v_spend
  WHERE id = p_profile_id;

  RETURN COALESCE(v_spend, 0);
END;
$$;

-- Backward-compatible alias
CREATE OR REPLACE FUNCTION recalculate_calendar_spend(p_profile_id uuid)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT recalculate_rolling_spend(p_profile_id);
$$;

CREATE OR REPLACE FUNCTION compute_loyalty_tier(p_profile_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_earned text;
  v_effective text;
  v_floor text;
BEGIN
  PERFORM recalculate_rolling_spend(p_profile_id);

  SELECT
    founding_type,
    founding_spot,
    founding_awarded_at,
    rolling_spend_12m,
    loyalty_tier
  INTO v_profile
  FROM profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'regular_customer';
  END IF;

  v_earned := loyalty_tier_from_spend(v_profile.rolling_spend_12m);
  v_effective := v_earned;
  v_floor := NULL;

  IF v_profile.founding_spot IS NOT NULL
    AND v_profile.founding_awarded_at IS NOT NULL
    AND v_profile.founding_awarded_at + interval '1 year' > now()
  THEN
    v_floor := CASE v_profile.founding_type
      WHEN 'vanguard' THEN 'diamond_couture'
      WHEN 'legacy' THEN 'atelier'
      ELSE NULL
    END;

    IF v_floor IS NOT NULL
      AND loyalty_tier_rank(v_floor) > loyalty_tier_rank(v_earned)
    THEN
      v_effective := v_floor;
    END IF;
  END IF;

  UPDATE profiles SET
    loyalty_tier = v_effective,
    loyalty_tier_earned = v_earned,
    tier_unlocked_at = CASE
      WHEN v_effective IS DISTINCT FROM COALESCE(v_profile.loyalty_tier, 'regular_customer') THEN now()
      ELSE tier_unlocked_at
    END
  WHERE id = p_profile_id;

  RETURN v_effective;
END;
$$;

-- ============================================================================
-- 5) Point lots — balance sync, expiry, FIFO deduct
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_loyalty_points_from_lots(p_profile_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
BEGIN
  SELECT COALESCE(SUM(points_remaining), 0)::int
  INTO v_balance
  FROM loyalty_point_lots
  WHERE profile_id = p_profile_id
    AND points_remaining > 0
    AND expires_at > now();

  UPDATE profiles
  SET loyalty_points = v_balance
  WHERE id = p_profile_id;

  RETURN COALESCE(v_balance, 0);
END;
$$;

CREATE OR REPLACE FUNCTION expire_loyalty_points(p_profile_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lot RECORD;
  v_expired_total integer := 0;
  v_profiles integer := 0;
  v_balance integer;
BEGIN
  FOR v_lot IN
    SELECT l.id, l.profile_id, l.points_remaining AS expired_pts
    FROM loyalty_point_lots l
    WHERE l.points_remaining > 0
      AND l.expires_at <= now()
      AND (p_profile_id IS NULL OR l.profile_id = p_profile_id)
    ORDER BY l.expires_at ASC, l.created_at ASC
  LOOP
    v_expired_total := v_expired_total + v_lot.expired_pts;

    UPDATE loyalty_point_lots
    SET points_remaining = 0
    WHERE id = v_lot.id;

    v_balance := sync_loyalty_points_from_lots(v_lot.profile_id);

    INSERT INTO loyalty_transactions (
      profile_id, transaction_type, points, balance_after, description
    ) VALUES (
      v_lot.profile_id,
      'expire',
      -v_lot.expired_pts,
      v_balance,
      format('Points expired (%s pts)', v_lot.expired_pts)
    );

    v_profiles := v_profiles + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'lots_expired', v_profiles,
    'points_expired', v_expired_total
  );
END;
$$;

CREATE OR REPLACE FUNCTION deduct_loyalty_points_fifo(
  p_profile_id uuid,
  p_points integer,
  p_description text DEFAULT 'Points redeemed'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining integer;
  v_lot RECORD;
  v_take integer;
  v_new_balance integer;
BEGIN
  IF p_points <= 0 THEN
    RETURN sync_loyalty_points_from_lots(p_profile_id);
  END IF;

  PERFORM expire_loyalty_points(p_profile_id);

  PERFORM sync_loyalty_points_from_lots(p_profile_id);

  SELECT loyalty_points INTO v_remaining
  FROM profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF v_remaining IS NULL THEN
    RAISE EXCEPTION 'Profile not found: %', p_profile_id;
  END IF;

  IF v_remaining < p_points THEN
    RAISE EXCEPTION 'Insufficient points: have %, need %', v_remaining, p_points;
  END IF;

  v_remaining := p_points;

  FOR v_lot IN
    SELECT id, points_remaining
    FROM loyalty_point_lots
    WHERE profile_id = p_profile_id
      AND points_remaining > 0
      AND expires_at > now()
    ORDER BY expires_at ASC, created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_take := LEAST(v_lot.points_remaining, v_remaining);

    UPDATE loyalty_point_lots
    SET points_remaining = points_remaining - v_take
    WHERE id = v_lot.id;

    v_remaining := v_remaining - v_take;
  END LOOP;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Could not deduct full amount from active lots';
  END IF;

  v_new_balance := sync_loyalty_points_from_lots(p_profile_id);

  INSERT INTO loyalty_transactions (
    profile_id, transaction_type, points, balance_after, description
  ) VALUES (
    p_profile_id,
    'redeem',
    -p_points,
    v_new_balance,
    p_description
  );

  RETURN v_new_balance;
END;
$$;

DROP FUNCTION IF EXISTS award_loyalty_points(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS award_loyalty_points(uuid, integer, text) CASCADE;
DROP FUNCTION IF EXISTS award_loyalty_points(uuid, integer, text, text) CASCADE;
DROP FUNCTION IF EXISTS award_loyalty_points(uuid, integer, text, text, uuid) CASCADE;

CREATE OR REPLACE FUNCTION award_loyalty_points(
  p_profile_id uuid,
  p_points integer,
  p_description text DEFAULT 'Points earned',
  p_type text DEFAULT 'earn',
  p_appointment_id uuid DEFAULT NULL,
  p_tier_at_earn text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new integer;
  v_type text;
  v_metadata jsonb;
  v_notif_type text;
  v_tier text;
BEGIN
  IF p_points = 0 THEN
    PERFORM expire_loyalty_points(p_profile_id);
    RETURN sync_loyalty_points_from_lots(p_profile_id);
  END IF;

  PERFORM expire_loyalty_points(p_profile_id);

  v_type := CASE
    WHEN p_type IN ('earn', 'referral_bonus', 'signup_bonus', 'birthday_bonus', 'adjustment') THEN p_type
    ELSE 'earn'
  END;

  v_metadata := CASE
    WHEN p_appointment_id IS NOT NULL THEN jsonb_build_object('appointment_id', p_appointment_id)
    ELSE '{}'::jsonb
  END;

  IF p_points > 0 THEN
    SELECT COALESCE(p_tier_at_earn, loyalty_tier, 'regular_customer')
    INTO v_tier
    FROM profiles
    WHERE id = p_profile_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Profile not found: %', p_profile_id;
    END IF;

    INSERT INTO loyalty_point_lots (
      profile_id, points_original, points_remaining, expires_at,
      tier_at_earn, source_type, appointment_id
    ) VALUES (
      p_profile_id,
      p_points,
      p_points,
      now() + get_point_expiry_interval(v_tier),
      v_tier,
      v_type,
      p_appointment_id
    );
  ELSE
    PERFORM deduct_loyalty_points_fifo(p_profile_id, ABS(p_points), p_description);
    RETURN sync_loyalty_points_from_lots(p_profile_id);
  END IF;

  v_new := sync_loyalty_points_from_lots(p_profile_id);

  INSERT INTO loyalty_transactions (
    profile_id, transaction_type, points, balance_after, description, metadata
  ) VALUES (
    p_profile_id, v_type, p_points, v_new, p_description, v_metadata
  );

  IF v_type IN ('referral_bonus', 'signup_bonus', 'birthday_bonus') THEN
    v_notif_type := CASE v_type
      WHEN 'referral_bonus' THEN 'referral_bonus'
      WHEN 'birthday_bonus' THEN 'loyalty_earned'
      ELSE 'loyalty_earned'
    END;
    PERFORM create_notification(
      p_profile_id,
      CASE v_type WHEN 'referral_bonus' THEN 'Referral bonus' ELSE 'Points earned' END,
      format('+%s points — %s', p_points, p_description),
      v_notif_type,
      p_appointment_id,
      jsonb_build_object('points', p_points)
    );
  END IF;

  RETURN v_new;
END;
$$;

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
  v_new integer;
  v_reason text;
  v_tier text;
BEGIN
  IF p_delta = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Delta must not be zero',
      'balance', sync_loyalty_points_from_lots(p_profile_id)
    );
  END IF;

  v_reason := COALESCE(NULLIF(trim(p_reason), ''), 'Manual adjustment');

  IF p_delta > 0 THEN
    SELECT loyalty_tier INTO v_tier FROM profiles WHERE id = p_profile_id;
    v_new := award_loyalty_points(
      p_profile_id,
      p_delta,
      v_reason,
      'adjustment',
      NULL,
      COALESCE(v_tier, 'regular_customer')
    );
  ELSE
    v_new := deduct_loyalty_points_fifo(p_profile_id, ABS(p_delta), v_reason);
  END IF;

  UPDATE loyalty_transactions
  SET metadata = jsonb_build_object('staff_id', p_staff_id)
  WHERE id = (
    SELECT id FROM loyalty_transactions
    WHERE profile_id = p_profile_id
    ORDER BY created_at DESC
    LIMIT 1
  );

  RETURN jsonb_build_object('success', true, 'new_balance', v_new, 'delta', p_delta);
END;
$$;

-- ============================================================================
-- 6) Founding member claim — FM floors via compute_loyalty_tier
-- ============================================================================

CREATE OR REPLACE FUNCTION claim_founding_member_spot(
  p_profile_id uuid,
  p_payment_id uuid,
  p_appointment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing RECORD;
  v_count integer;
  v_spot integer;
  v_type text;
  v_badge text;
BEGIN
  IF p_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_customer');
  END IF;

  SELECT spot_number, founding_type
  INTO v_existing
  FROM founding_members
  WHERE profile_id = p_profile_id;

  IF FOUND THEN
    v_badge := format_founding_badge(v_existing.founding_type, v_existing.spot_number);
    RETURN jsonb_build_object(
      'success', true,
      'already_member', true,
      'spot', v_existing.spot_number,
      'type', v_existing.founding_type,
      'badge_label', v_badge
    );
  END IF;

  PERFORM pg_advisory_xact_lock(424250);

  SELECT count(*)::int INTO v_count FROM founding_members;

  IF v_count >= 100 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'cap_reached');
  END IF;

  v_spot := v_count + 1;
  v_type := CASE WHEN v_spot <= 25 THEN 'vanguard' ELSE 'legacy' END;
  v_badge := format_founding_badge(v_type, v_spot);

  INSERT INTO founding_members (
    profile_id, spot_number, founding_type,
    payment_transaction_id, appointment_id
  ) VALUES (
    p_profile_id, v_spot, v_type, p_payment_id, p_appointment_id
  );

  UPDATE profiles SET
    founding_type = v_type,
    founding_spot = v_spot,
    founding_awarded_at = now()
  WHERE id = p_profile_id;

  PERFORM compute_loyalty_tier(p_profile_id);

  RETURN jsonb_build_object(
    'success', true,
    'spot', v_spot,
    'type', v_type,
    'badge_label', v_badge
  );
END;
$$;

-- ============================================================================
-- 7) Vault redemption — FIFO deduct
-- ============================================================================

CREATE OR REPLACE FUNCTION redeem_vault_milestone(
  p_profile_id uuid,
  p_milestone_points integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
  v_new integer;
  v_milestone RECORD;
  v_existing text;
  v_code text;
BEGIN
  SELECT * INTO v_milestone
  FROM loyalty_milestones
  WHERE points = p_milestone_points;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_milestone');
  END IF;

  SELECT redemption_code INTO v_existing
  FROM loyalty_milestone_redemptions
  WHERE profile_id = p_profile_id AND milestone_points = p_milestone_points;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_redeemed', true,
      'redemption_code', v_existing,
      'milestone_points', p_milestone_points
    );
  END IF;

  PERFORM expire_loyalty_points(p_profile_id);
  v_balance := sync_loyalty_points_from_lots(p_profile_id);

  IF v_balance < p_milestone_points THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_points',
      'balance', v_balance,
      'required', p_milestone_points
    );
  END IF;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  v_new := deduct_loyalty_points_fifo(
    p_profile_id,
    p_milestone_points,
    format('Vault %s claimed', v_milestone.reward_label)
  );

  INSERT INTO loyalty_milestone_redemptions (profile_id, milestone_points, redemption_code)
  VALUES (p_profile_id, p_milestone_points, v_code);

  RETURN jsonb_build_object(
    'success', true,
    'redemption_code', v_code,
    'milestone_points', p_milestone_points,
    'reward_label', v_milestone.reward_label,
    'new_balance', v_new
  );
END;
$$;

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

  PERFORM expire_loyalty_points(p_profile_id);
  v_current := sync_loyalty_points_from_lots(p_profile_id);

  IF v_current < p_points_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points', 'balance', v_current);
  END IF;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  v_new := deduct_loyalty_points_fifo(
    p_profile_id,
    p_points_cost,
    COALESCE(p_reward_name, 'Checkout redemption')
  );

  UPDATE loyalty_transactions
  SET redemption_code = v_code
  WHERE id = (
    SELECT id FROM loyalty_transactions
    WHERE profile_id = p_profile_id
    ORDER BY created_at DESC
    LIMIT 1
  );

  PERFORM create_notification(
    p_profile_id,
    'Reward applied',
    format('You redeemed %s (%s points).', COALESCE(p_reward_name, 'reward'), p_points_cost),
    'loyalty_redeemed',
    NULL,
    jsonb_build_object('points', p_points_cost, 'reward', p_reward_name, 'redemption_code', v_code)
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new,
    'redemption_code', v_code,
    'reward', p_reward_name,
    'points_cost', p_points_cost
  );
END;
$$;

-- ============================================================================
-- 8) Wallet snapshot
-- ============================================================================

CREATE OR REPLACE FUNCTION get_wallet_snapshot(p_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_next_tier text;
  v_next_threshold numeric;
  v_spend_to_next numeric;
  v_milestones jsonb;
  v_founding jsonb;
  v_fm_floor_active boolean := false;
  v_fm_floor_until timestamptz;
  v_points_expiring_soon integer := 0;
  v_next_points_expiry timestamptz;
  v_balance integer;
BEGIN
  PERFORM expire_loyalty_points(p_profile_id);
  PERFORM recalculate_rolling_spend(p_profile_id);
  PERFORM compute_loyalty_tier(p_profile_id);
  v_balance := sync_loyalty_points_from_lots(p_profile_id);

  SELECT
    loyalty_points,
    loyalty_tier,
    loyalty_tier_earned,
    rolling_spend_12m,
    founding_type,
    founding_spot,
    founding_awarded_at
  INTO v_profile
  FROM profiles
  WHERE id = p_profile_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'profile_not_found');
  END IF;

  SELECT id, spend_threshold INTO v_next_tier, v_next_threshold
  FROM loyalty_tiers
  WHERE spend_threshold > COALESCE(v_profile.rolling_spend_12m, 0)
  ORDER BY spend_threshold ASC
  LIMIT 1;

  v_spend_to_next := CASE
    WHEN v_next_threshold IS NULL THEN 0
    ELSE GREATEST(v_next_threshold - COALESCE(v_profile.rolling_spend_12m, 0), 0)
  END;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'points', m.points,
      'reward_label', m.reward_label,
      'reward_value', m.reward_value,
      'unlocked', (
        COALESCE(v_balance, 0) >= m.points
        OR EXISTS (
          SELECT 1 FROM loyalty_milestone_redemptions r
          WHERE r.profile_id = p_profile_id AND r.milestone_points = m.points
        )
      ),
      'redeemed', EXISTS (
        SELECT 1 FROM loyalty_milestone_redemptions r
        WHERE r.profile_id = p_profile_id AND r.milestone_points = m.points
      ),
      'redemption_code', (
        SELECT r.redemption_code FROM loyalty_milestone_redemptions r
        WHERE r.profile_id = p_profile_id AND r.milestone_points = m.points
        LIMIT 1
      ),
      'used_at', (
        SELECT r.used_at FROM loyalty_milestone_redemptions r
        WHERE r.profile_id = p_profile_id AND r.milestone_points = m.points
        LIMIT 1
      )
    ) ORDER BY m.sort_order
  ), '[]'::jsonb)
  INTO v_milestones
  FROM loyalty_milestones m;

  v_founding := CASE
    WHEN v_profile.founding_spot IS NOT NULL THEN
      jsonb_build_object(
        'type', v_profile.founding_type,
        'spot', v_profile.founding_spot,
        'badge', format_founding_badge(v_profile.founding_type, v_profile.founding_spot)
      )
    ELSE NULL
  END;

  IF v_profile.founding_spot IS NOT NULL AND v_profile.founding_awarded_at IS NOT NULL THEN
    v_fm_floor_until := v_profile.founding_awarded_at + interval '1 year';
    v_fm_floor_active := v_fm_floor_until > now();
  END IF;

  SELECT
    COALESCE(SUM(points_remaining), 0)::int,
    MIN(expires_at)
  INTO v_points_expiring_soon, v_next_points_expiry
  FROM loyalty_point_lots
  WHERE profile_id = p_profile_id
    AND points_remaining > 0
    AND expires_at > now()
    AND expires_at <= now() + interval '30 days';

  RETURN jsonb_build_object(
    'success', true,
    'points', COALESCE(v_balance, 0),
    'tier', COALESCE(v_profile.loyalty_tier, 'regular_customer'),
    'tier_earned', COALESCE(v_profile.loyalty_tier_earned, 'regular_customer'),
    'rolling_spend_12m', COALESCE(v_profile.rolling_spend_12m, 0),
    'calendar_spend_ytd', COALESCE(v_profile.rolling_spend_12m, 0),
    'next_tier', v_next_tier,
    'spend_to_next_tier', v_spend_to_next,
    'founding', v_founding,
    'fm_floor_active', v_fm_floor_active,
    'fm_floor_until', v_fm_floor_until,
    'points_expiring_soon', COALESCE(v_points_expiring_soon, 0),
    'next_points_expiry', v_next_points_expiry,
    'milestones', v_milestones,
    'earn_rate', get_tier_earn_multiplier(COALESCE(v_profile.loyalty_tier, 'regular_customer'))
  );
END;
$$;

-- ============================================================================
-- 9) Backfill existing point balances into lots
-- ============================================================================

INSERT INTO loyalty_point_lots (
  profile_id, points_original, points_remaining, expires_at, tier_at_earn, source_type
)
SELECT
  p.id,
  p.loyalty_points,
  p.loyalty_points,
  now() + interval '3 months',
  COALESCE(p.loyalty_tier, 'regular_customer'),
  'adjustment'
FROM profiles p
WHERE COALESCE(p.loyalty_points, 0) > 0
  AND NOT EXISTS (
    SELECT 1 FROM loyalty_point_lots l WHERE l.profile_id = p.id
  );

SELECT sync_loyalty_points_from_lots(id) FROM profiles WHERE COALESCE(loyalty_points, 0) > 0;

-- ============================================================================
-- 10) process_checkout — rolling spend + tier at earn
-- ============================================================================

CREATE OR REPLACE FUNCTION process_checkout(
  caller_phone text,
  appointment_id uuid,
  p_amount numeric DEFAULT NULL,
  p_discount_amount numeric DEFAULT 0,
  p_discount_type text DEFAULT NULL,
  p_final_amount numeric DEFAULT NULL,
  p_payment_method text DEFAULT 'card',
  p_notes text DEFAULT NULL,
  p_loyalty_points_redeem integer DEFAULT 0,
  p_loyalty_reward_name text DEFAULT NULL,
  p_extras_amount numeric DEFAULT 0,
  p_tip_allocations jsonb DEFAULT NULL,
  p_gift_card_id uuid DEFAULT NULL,
  p_gift_card_amount numeric DEFAULT NULL,
  p_vault_redemption_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid;
  caller_role text;
  appt RECORD;
  v_amount numeric;
  v_extras numeric;
  v_discount numeric;
  v_service_due numeric;
  v_total_due numeric;
  v_gc_apply numeric;
  v_cash_due numeric;
  v_final numeric;
  v_discount_type text;
  v_payment_method text;
  v_points_earned integer;
  v_inventory_id uuid;
  v_refreshment text;
  v_loyalty_redeem integer;
  v_loyalty_name text;
  payment_id uuid;
  result jsonb;
  alloc jsonb;
  alloc_sum numeric := 0;
  tipped_tech uuid;
  v_card gift_cards%ROWTYPE;
  v_new_balance numeric;
  v_receipt_method text;
  v_founding_result jsonb;
  v_wallet_snapshot jsonb;
  v_tier text;
  v_multiplier numeric;
  v_skip_loyalty_deduct boolean := false;
  v_vault_redemption_id uuid;
  v_vault_code text;
  v_vault_discount numeric;
BEGIN
  SELECT id, role INTO caller_id, caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN ('cashier', 'super_admin', 'owner', 'partner') THEN
    RAISE EXCEPTION 'Not authorized. Only cashier or management can process checkout.';
  END IF;

  SELECT a.*, p.refreshment_pref AS customer_refreshment
  INTO appt
  FROM appointments a
  LEFT JOIN profiles p ON p.id = a.customer_id
  WHERE a.id = appointment_id;

  IF appt.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found.';
  END IF;

  IF appt.status NOT IN ('ready_for_checkout', 'serving') THEN
    RAISE EXCEPTION 'Appointment is not ready for checkout (status: %).', appt.status;
  END IF;

  v_extras := COALESCE(p_extras_amount, 0);
  v_amount := COALESCE(p_amount, appt.final_price, 0);
  v_discount := LEAST(COALESCE(p_discount_amount, 0), v_amount);
  v_loyalty_redeem := 0;
  v_loyalty_name := NULL;
  v_vault_code := NULL;

  IF p_vault_redemption_code IS NOT NULL AND trim(p_vault_redemption_code) != '' AND appt.customer_id IS NOT NULL THEN
    SELECT
      r.id,
      r.milestone_points,
      r.redemption_code,
      m.reward_label,
      m.reward_value
    INTO
      v_vault_redemption_id,
      v_loyalty_redeem,
      v_vault_code,
      v_loyalty_name,
      v_vault_discount
    FROM loyalty_milestone_redemptions r
    JOIN loyalty_milestones m ON m.points = r.milestone_points
    WHERE r.profile_id = appt.customer_id
      AND r.redemption_code = upper(trim(p_vault_redemption_code))
      AND r.used_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid or already used vault redemption code.';
    END IF;

    IF v_discount = 0 THEN
      v_discount := LEAST(v_vault_discount, v_amount);
    END IF;
    v_skip_loyalty_deduct := true;
  ELSIF appt.loyalty_points_cost IS NOT NULL AND appt.loyalty_points_cost > 0 THEN
    v_loyalty_redeem := appt.loyalty_points_cost;
    v_loyalty_name := appt.loyalty_reward_name;
    IF v_discount = 0 AND COALESCE(appt.loyalty_discount_amount, 0) > 0 THEN
      v_discount := LEAST(appt.loyalty_discount_amount, v_amount);
    END IF;

    IF appt.loyalty_redemption_code IS NOT NULL AND appt.customer_id IS NOT NULL THEN
      SELECT r.id INTO v_vault_redemption_id
      FROM loyalty_milestone_redemptions r
      WHERE r.profile_id = appt.customer_id
        AND r.redemption_code = appt.loyalty_redemption_code
        AND r.used_at IS NULL;
      IF FOUND THEN
        v_skip_loyalty_deduct := true;
      END IF;
    END IF;
  ELSE
    v_loyalty_redeem := COALESCE(p_loyalty_points_redeem, 0);
    v_loyalty_name := p_loyalty_reward_name;

    IF v_loyalty_redeem > 0 AND appt.customer_id IS NOT NULL THEN
      SELECT r.id INTO v_vault_redemption_id
      FROM loyalty_milestone_redemptions r
      WHERE r.profile_id = appt.customer_id
        AND r.milestone_points = v_loyalty_redeem
        AND r.used_at IS NULL
      ORDER BY r.redeemed_at ASC
      LIMIT 1;
      IF FOUND THEN
        v_skip_loyalty_deduct := true;
      END IF;
    END IF;
  END IF;

  v_service_due := GREATEST(v_amount - v_discount, 0);
  v_total_due := v_service_due + v_extras;
  v_gc_apply := 0;

  IF p_gift_card_id IS NOT NULL THEN
    SELECT * INTO v_card FROM gift_cards WHERE id = p_gift_card_id FOR UPDATE;
    IF v_card.id IS NULL THEN
      RAISE EXCEPTION 'Gift card not found.';
    END IF;

    v_card := gift_card_enforce_expiration(v_card);

    IF v_card.status = 'expired' THEN
      RAISE EXCEPTION 'Gift card expired on %.', to_char(v_card.expires_at, 'Mon DD, YYYY');
    END IF;
    IF v_card.status != 'active' OR v_card.balance <= 0 THEN
      RAISE EXCEPTION 'Gift card is not active or has no balance.';
    END IF;
    IF appt.customer_id IS NULL OR v_card.owner_id != appt.customer_id THEN
      RAISE EXCEPTION 'Gift card must belong to the visit customer.';
    END IF;
    v_gc_apply := LEAST(
      v_card.balance,
      v_total_due,
      COALESCE(p_gift_card_amount, v_total_due)
    );
    IF v_gc_apply <= 0 THEN
      RAISE EXCEPTION 'Invalid gift card amount.';
    END IF;
  END IF;

  v_cash_due := GREATEST(v_total_due - v_gc_apply, 0);
  v_final := COALESCE(p_final_amount, v_cash_due);

  v_discount_type := CASE
    WHEN p_discount_type IN ('percentage', 'fixed', 'loyalty', 'coupon') THEN p_discount_type
    WHEN p_discount_type = 'percent' THEN 'percentage'
    WHEN p_discount_type = 'amount' THEN 'fixed'
    WHEN v_discount > 0 AND v_loyalty_redeem > 0 THEN 'loyalty'
    WHEN v_discount > 0 THEN 'fixed'
    ELSE NULL
  END;

  v_payment_method := CASE
    WHEN lower(p_payment_method) IN ('cash', 'card', 'other') THEN lower(p_payment_method)
    WHEN lower(p_payment_method) = 'transfer' THEN 'other'
    ELSE 'card'
  END;

  IF v_gc_apply > 0 AND v_cash_due > 0 THEN
    v_receipt_method := 'mixed';
  ELSIF v_gc_apply > 0 AND v_cash_due = 0 THEN
    v_receipt_method := 'gift_card';
  ELSE
    v_receipt_method := v_payment_method;
  END IF;

  IF v_loyalty_redeem > 0 AND appt.customer_id IS NOT NULL AND NOT v_skip_loyalty_deduct THEN
    PERFORM redeem_loyalty_reward(
      appt.customer_id,
      v_loyalty_redeem,
      COALESCE(v_loyalty_name, 'Checkout redemption')
    );
  END IF;

  INSERT INTO payment_transactions (
    appointment_id, customer_id, technician_id, cashier_id, service_id,
    amount, extras_amount, discount_amount, discount_type, final_amount,
    payment_method, status, notes, gift_card_id, gift_card_amount
  ) VALUES (
    appointment_id, appt.customer_id, appt.technician_id, caller_id, appt.service_id,
    v_amount, v_extras, v_discount, v_discount_type, v_final,
    v_receipt_method, 'completed', p_notes,
    CASE WHEN v_gc_apply > 0 THEN p_gift_card_id ELSE NULL END,
    CASE WHEN v_gc_apply > 0 THEN v_gc_apply ELSE 0 END
  )
  RETURNING id INTO payment_id;

  IF v_vault_redemption_id IS NOT NULL THEN
    UPDATE loyalty_milestone_redemptions
    SET used_at = now(), payment_transaction_id = payment_id
    WHERE id = v_vault_redemption_id;
  END IF;

  IF v_gc_apply > 0 THEN
    v_new_balance := round((v_card.balance - v_gc_apply)::numeric, 2);
    UPDATE gift_cards SET
      balance = v_new_balance,
      first_used_at = COALESCE(first_used_at, now()),
      status = CASE WHEN v_new_balance <= 0 THEN 'depleted' ELSE 'active' END,
      updated_at = now()
    WHERE id = v_card.id;

    INSERT INTO gift_card_transactions (
      gift_card_id, transaction_type, amount, balance_after,
      performed_by_id, payment_transaction_id, appointment_id, description
    ) VALUES (
      v_card.id, 'redeem', -v_gc_apply, v_new_balance,
      caller_id, payment_id, appointment_id,
      format('Redeemed $%s at checkout', trim(to_char(v_gc_apply, '999990.99')))
    );
  END IF;

  IF p_tip_allocations IS NOT NULL
    AND jsonb_typeof(p_tip_allocations) = 'array'
    AND jsonb_array_length(p_tip_allocations) > 0
  THEN
    FOR alloc IN SELECT * FROM jsonb_array_elements(p_tip_allocations) LOOP
      alloc_sum := alloc_sum + COALESCE((alloc->>'amount')::numeric, 0);
      INSERT INTO payment_tip_allocations (
        payment_transaction_id, technician_id, amount
      ) VALUES (
        payment_id,
        (alloc->>'technician_id')::uuid,
        COALESCE((alloc->>'amount')::numeric, 0)
      );
    END LOOP;
    IF round(alloc_sum::numeric, 2) != round(v_extras::numeric, 2) THEN
      RAISE EXCEPTION 'Tip allocations must sum to total tip (got %, expected %).', alloc_sum, v_extras;
    END IF;
  ELSIF v_extras > 0 AND appt.technician_id IS NOT NULL THEN
    INSERT INTO payment_tip_allocations (
      payment_transaction_id, technician_id, amount
    ) VALUES (
      payment_id, appt.technician_id, v_extras
    );
  END IF;

  UPDATE appointments SET
    status = 'completed',
    completed_at = NOW(),
    final_price = v_final,
    loyalty_reward_id = NULL,
    loyalty_reward_name = NULL,
    loyalty_points_cost = NULL,
    loyalty_discount_amount = NULL,
    loyalty_redemption_code = NULL
  WHERE id = appointment_id;

  v_founding_result := NULL;
  IF appt.customer_id IS NOT NULL THEN
    PERFORM recalculate_rolling_spend(appt.customer_id);
    PERFORM compute_loyalty_tier(appt.customer_id);
    v_founding_result := claim_founding_member_spot(appt.customer_id, payment_id, appointment_id);

    SELECT loyalty_tier INTO v_tier FROM profiles WHERE id = appt.customer_id;
    v_multiplier := get_tier_earn_multiplier(COALESCE(v_tier, 'regular_customer'));
    v_wallet_snapshot := get_wallet_snapshot(appt.customer_id);
  END IF;

  v_refreshment := appt.customer_refreshment;
  IF v_refreshment IS NOT NULL AND v_refreshment != '' THEN
    SELECT id INTO v_inventory_id
    FROM inventory
    WHERE item_name = v_refreshment AND category = 'refreshment'
    LIMIT 1;

    IF v_inventory_id IS NOT NULL THEN
      INSERT INTO inventory_logs (
        inventory_id, appointment_id, customer_id, quantity_changed, reason
      ) VALUES (
        v_inventory_id, appointment_id, appt.customer_id, -1, 'Consumed during service'
      );

      UPDATE inventory
      SET quantity = GREATEST(quantity - 1, 0)
      WHERE id = v_inventory_id;
    END IF;
  END IF;

  IF appt.customer_id IS NOT NULL AND v_cash_due > 0 THEN
    v_points_earned := FLOOR(v_cash_due * COALESCE(v_multiplier, 1.0))::integer;
    IF v_points_earned > 0 THEN
      PERFORM award_loyalty_points(
        appt.customer_id,
        v_points_earned,
        format('Points earned from visit checkout (%s tier)', COALESCE(v_tier, 'regular_customer')),
        'earn',
        appointment_id,
        v_tier
      );
      v_wallet_snapshot := get_wallet_snapshot(appt.customer_id);
    END IF;
  END IF;

  IF appt.customer_id IS NOT NULL THEN
    PERFORM create_notification(
      appt.customer_id,
      'Payment receipt',
      CASE
        WHEN v_gc_apply > 0 AND v_cash_due > 0 THEN
          format('Receipt: $%s gift card + $%s via %s.', trim(to_char(v_gc_apply, '999990.99')), trim(to_char(v_cash_due, '999990.99')), v_payment_method)
        WHEN v_gc_apply > 0 THEN
          format('Receipt: $%s paid via gift card.', trim(to_char(v_gc_apply, '999990.99')))
        ELSE
          format('Receipt: $%s paid via %s.', trim(to_char(v_final, '999990.99')), v_payment_method)
      END,
      'payment_receipt',
      appointment_id,
      jsonb_build_object(
        'payment_id', payment_id,
        'final_amount', v_final,
        'gift_card_amount', v_gc_apply,
        'cash_amount', v_cash_due
      )
    );
    IF COALESCE(v_points_earned, 0) > 0 THEN
      PERFORM create_notification(
        appt.customer_id,
        'Points earned',
        format('+%s loyalty points earned from your visit.', v_points_earned),
        'loyalty_earned',
        appointment_id,
        jsonb_build_object('points', v_points_earned, 'tier', v_tier)
      );
    END IF;
    IF v_founding_result IS NOT NULL AND (v_founding_result->>'success')::boolean = true
      AND COALESCE(v_founding_result->>'already_member', 'false') != 'true'
    THEN
      PERFORM create_notification(
        appt.customer_id,
        'Founding Member',
        format('Welcome, Founding Member %s!', v_founding_result->>'badge_label'),
        'founding_member_awarded',
        appointment_id,
        v_founding_result
      );
    END IF;
  END IF;

  IF appt.technician_id IS NOT NULL THEN
    PERFORM create_notification(
      appt.technician_id,
      'Checkout complete',
      format('Checkout completed for your client ($%s).', trim(to_char(v_total_due, '999990.99'))),
      'your_client_checkout',
      appointment_id
    );
  END IF;

  FOR tipped_tech IN
    SELECT DISTINCT technician_id FROM payment_tip_allocations
    WHERE payment_transaction_id = payment_id
      AND amount > 0
      AND technician_id IS DISTINCT FROM appt.technician_id
  LOOP
    PERFORM create_notification(
      tipped_tech,
      'Tip received',
      format('You received a $%s tip from a visit checkout.', trim(to_char(
        (SELECT amount FROM payment_tip_allocations
         WHERE payment_transaction_id = payment_id AND technician_id = tipped_tech),
        '999990.99'
      ))),
      'tip_received',
      appointment_id,
      jsonb_build_object('payment_id', payment_id)
    );
  END LOOP;

  SELECT jsonb_build_object(
    'success', true,
    'payment_id', payment_id,
    'final_amount', v_final,
    'gift_card_amount', v_gc_apply,
    'cash_amount', v_cash_due,
    'points_earned', COALESCE(v_points_earned, 0),
    'tier', v_tier,
    'founding_result', COALESCE(v_founding_result, jsonb_build_object('success', false, 'reason', 'no_customer')),
    'wallet_snapshot', v_wallet_snapshot,
    'vault_code_applied', v_vault_code
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION backfill_wallet_state()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_count integer := 0;
BEGIN
  FOR v_profile_id IN SELECT id FROM profiles LOOP
    PERFORM recalculate_rolling_spend(v_profile_id);
    PERFORM compute_loyalty_tier(v_profile_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'profiles_updated', v_count);
END;
$$;

-- ============================================================================
-- 11) Grants
-- ============================================================================

GRANT EXECUTE ON FUNCTION recalculate_rolling_spend(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION recalculate_calendar_spend(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION compute_loyalty_tier(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_tier_earn_multiplier(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_point_expiry_interval(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION sync_loyalty_points_from_lots(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION expire_loyalty_points(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION deduct_loyalty_points_fifo(uuid, integer, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION award_loyalty_points(uuid, integer, text, text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_founding_member_spot(uuid, uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_wallet_snapshot(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION redeem_vault_milestone(uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION redeem_loyalty_reward(uuid, integer, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION adjust_loyalty_points(uuid, integer, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION backfill_wallet_state() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION process_checkout(
  text, uuid, numeric, numeric, text, numeric, text, text, integer, text, numeric, jsonb, uuid, numeric, text
) TO anon, authenticated;
