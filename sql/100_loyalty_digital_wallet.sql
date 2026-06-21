-- Migration 100: Digital Wallet — founding members, calendar-year tiers, vault milestones
-- Run once in Supabase SQL Editor after 099_role_session_settings.sql

-- ============================================================================
-- 1) Config tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  spend_threshold numeric NOT NULL DEFAULT 0,
  earn_multiplier numeric NOT NULL DEFAULT 1.0,
  booking_window_days integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  tagline text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO loyalty_tiers (id, display_name, spend_threshold, earn_multiplier, booking_window_days, sort_order, tagline)
VALUES
  ('pearl', 'Pearl', 500, 1.0, 0, 1, 'Your introduction to the Nail Couture experience.'),
  ('atelier', 'Atelier', 1500, 1.25, 14, 2, 'For clients who make self-care part of their lifestyle.'),
  ('diamond_couture', 'Diamond Couture', 3000, 1.5, 30, 3, 'Reserved for our most valued clients.')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  spend_threshold = EXCLUDED.spend_threshold,
  earn_multiplier = EXCLUDED.earn_multiplier,
  booking_window_days = EXCLUDED.booking_window_days,
  sort_order = EXCLUDED.sort_order,
  tagline = EXCLUDED.tagline;

CREATE TABLE IF NOT EXISTS loyalty_milestones (
  points integer PRIMARY KEY,
  reward_label text NOT NULL,
  reward_value numeric NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

INSERT INTO loyalty_milestones (points, reward_label, reward_value, sort_order)
VALUES
  (100, '$5 reward', 5, 1),
  (250, '$15 reward', 15, 2),
  (500, '$35 reward', 35, 3),
  (1000, '$75 reward', 75, 4)
ON CONFLICT (points) DO UPDATE SET
  reward_label = EXCLUDED.reward_label,
  reward_value = EXCLUDED.reward_value,
  sort_order = EXCLUDED.sort_order;

CREATE TABLE IF NOT EXISTS loyalty_milestone_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  milestone_points integer NOT NULL REFERENCES loyalty_milestones(points),
  redemption_code text NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loyalty_milestone_redemptions_unique UNIQUE (profile_id, milestone_points)
);

CREATE INDEX IF NOT EXISTS idx_loyalty_milestone_redemptions_profile
  ON loyalty_milestone_redemptions (profile_id);

CREATE TABLE IF NOT EXISTS founding_members (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  spot_number integer NOT NULL UNIQUE CHECK (spot_number BETWEEN 1 AND 250),
  founding_type text NOT NULL CHECK (founding_type IN ('vanguard', 'legacy')),
  payment_transaction_id uuid NOT NULL REFERENCES payment_transactions(id),
  appointment_id uuid NOT NULL REFERENCES appointments(id),
  awarded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_founding_members_spot ON founding_members (spot_number);

ALTER TABLE loyalty_milestone_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE founding_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2) Profile columns
-- ============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS founding_type text CHECK (founding_type IS NULL OR founding_type IN ('vanguard', 'legacy')),
  ADD COLUMN IF NOT EXISTS founding_spot integer,
  ADD COLUMN IF NOT EXISTS founding_awarded_at timestamptz,
  ADD COLUMN IF NOT EXISTS calendar_spend_ytd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_tier text NOT NULL DEFAULT 'pearl',
  ADD COLUMN IF NOT EXISTS loyalty_tier_earned text NOT NULL DEFAULT 'pearl',
  ADD COLUMN IF NOT EXISTS tier_unlocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS tier_grace_until date;

COMMENT ON COLUMN profiles.calendar_spend_ytd IS 'Completed checkout spend in current calendar year';
COMMENT ON COLUMN profiles.loyalty_tier IS 'Effective tier (includes grace/lock and vanguard override)';
COMMENT ON COLUMN profiles.loyalty_tier_earned IS 'Tier from current calendar-year spend only';

-- ============================================================================
-- 3) Helpers
-- ============================================================================

CREATE OR REPLACE FUNCTION loyalty_tier_rank(p_tier text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_tier
    WHEN 'diamond_couture' THEN 3
    WHEN 'atelier' THEN 2
    WHEN 'pearl' THEN 1
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION loyalty_tier_from_spend(p_spend numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(p_spend, 0) >= 3000 THEN 'diamond_couture'
    WHEN COALESCE(p_spend, 0) >= 1500 THEN 'atelier'
    ELSE 'pearl'
  END;
$$;

CREATE OR REPLACE FUNCTION format_founding_badge(p_type text, p_spot integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_type
    WHEN 'vanguard' THEN lpad(p_spot::text, 2, '0') || '/25'
    WHEN 'legacy' THEN p_spot::text || '/250'
    ELSE NULL
  END;
$$;

-- ============================================================================
-- 4) Spend + tier computation
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_calendar_spend(p_profile_id uuid)
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
    AND created_at >= date_trunc('year', now());

  UPDATE profiles
  SET calendar_spend_ytd = v_spend
  WHERE id = p_profile_id;

  RETURN COALESCE(v_spend, 0);
END;
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
  v_now date := (now())::date;
  v_grace_end date;
BEGIN
  SELECT
    founding_type,
    founding_awarded_at,
    calendar_spend_ytd,
    loyalty_tier,
    tier_unlocked_at,
    tier_grace_until
  INTO v_profile
  FROM profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'pearl';
  END IF;

  v_earned := loyalty_tier_from_spend(v_profile.calendar_spend_ytd);
  v_effective := COALESCE(v_profile.loyalty_tier, 'pearl');

  -- Vanguard Year 1 → at least Diamond Couture
  IF v_profile.founding_type = 'vanguard'
    AND v_profile.founding_awarded_at IS NOT NULL
    AND v_profile.founding_awarded_at >= now() - interval '1 year'
  THEN
    IF loyalty_tier_rank('diamond_couture') > loyalty_tier_rank(v_effective) THEN
      v_effective := 'diamond_couture';
      UPDATE profiles SET
        loyalty_tier = v_effective,
        loyalty_tier_earned = v_earned,
        tier_unlocked_at = COALESCE(tier_unlocked_at, now()),
        tier_grace_until = make_date(extract(year FROM now())::int + 1, 12, 31)
      WHERE id = p_profile_id;
      RETURN v_effective;
    END IF;
  END IF;

  -- Upgrade immediately
  IF loyalty_tier_rank(v_earned) > loyalty_tier_rank(v_effective) THEN
    v_effective := v_earned;
    UPDATE profiles SET
      loyalty_tier = v_effective,
      loyalty_tier_earned = v_earned,
      tier_unlocked_at = now(),
      tier_grace_until = make_date(extract(year FROM now())::int + 1, 12, 31)
    WHERE id = p_profile_id;
    RETURN v_effective;
  END IF;

  -- Grace period or 6-month floor
  IF loyalty_tier_rank(v_earned) < loyalty_tier_rank(v_effective) THEN
    IF (v_profile.tier_grace_until IS NOT NULL AND v_now <= v_profile.tier_grace_until)
      OR (v_profile.tier_unlocked_at IS NOT NULL AND now() < v_profile.tier_unlocked_at + interval '6 months')
    THEN
      UPDATE profiles SET loyalty_tier_earned = v_earned WHERE id = p_profile_id;
      RETURN v_effective;
    END IF;

    v_effective := v_earned;
  END IF;

  UPDATE profiles SET
    loyalty_tier = v_effective,
    loyalty_tier_earned = v_earned,
    tier_unlocked_at = CASE
      WHEN v_effective IS DISTINCT FROM COALESCE(v_profile.loyalty_tier, 'pearl') THEN now()
      ELSE tier_unlocked_at
    END,
    tier_grace_until = CASE
      WHEN loyalty_tier_rank(v_effective) > loyalty_tier_rank(COALESCE(v_profile.loyalty_tier, 'pearl'))
        THEN make_date(extract(year FROM now())::int + 1, 12, 31)
      ELSE tier_grace_until
    END
  WHERE id = p_profile_id;

  RETURN v_effective;
END;
$$;

-- ============================================================================
-- 5) Founding member claim (non-blocking on cap)
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

  IF v_count >= 250 THEN
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

  IF v_type = 'vanguard' THEN
    PERFORM compute_loyalty_tier(p_profile_id);
    UPDATE profiles SET
      loyalty_tier = 'diamond_couture',
      tier_unlocked_at = COALESCE(tier_unlocked_at, now()),
      tier_grace_until = make_date(extract(year FROM now())::int + 1, 12, 31)
    WHERE id = p_profile_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'spot', v_spot,
    'type', v_type,
    'badge_label', v_badge
  );
END;
$$;

-- ============================================================================
-- 6) Wallet snapshot + milestone redemption
-- ============================================================================

CREATE OR REPLACE FUNCTION get_wallet_snapshot(p_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
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
  v_locked_until timestamptz;
BEGIN
  SELECT
    loyalty_points,
    loyalty_tier,
    loyalty_tier_earned,
    calendar_spend_ytd,
    tier_grace_until,
    tier_unlocked_at,
    founding_type,
    founding_spot
  INTO v_profile
  FROM profiles
  WHERE id = p_profile_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'profile_not_found');
  END IF;

  SELECT id, spend_threshold INTO v_next_tier, v_next_threshold
  FROM loyalty_tiers
  WHERE spend_threshold > COALESCE(v_profile.calendar_spend_ytd, 0)
  ORDER BY spend_threshold ASC
  LIMIT 1;

  v_spend_to_next := CASE
    WHEN v_next_threshold IS NULL THEN 0
    ELSE GREATEST(v_next_threshold - COALESCE(v_profile.calendar_spend_ytd, 0), 0)
  END;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'points', m.points,
      'reward_label', m.reward_label,
      'reward_value', m.reward_value,
      'unlocked', (
        COALESCE(v_profile.loyalty_points, 0) >= m.points
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

  v_locked_until := CASE
    WHEN v_profile.tier_unlocked_at IS NOT NULL
      THEN v_profile.tier_unlocked_at + interval '6 months'
    ELSE NULL
  END;

  RETURN jsonb_build_object(
    'success', true,
    'points', COALESCE(v_profile.loyalty_points, 0),
    'tier', COALESCE(v_profile.loyalty_tier, 'pearl'),
    'tier_earned', COALESCE(v_profile.loyalty_tier_earned, 'pearl'),
    'calendar_spend_ytd', COALESCE(v_profile.calendar_spend_ytd, 0),
    'tier_grace_until', v_profile.tier_grace_until,
    'tier_locked_until', v_locked_until,
    'next_tier', v_next_tier,
    'spend_to_next_tier', v_spend_to_next,
    'founding', v_founding,
    'milestones', v_milestones,
    'earn_rate', get_tier_earn_multiplier(COALESCE(v_profile.loyalty_tier, 'pearl'))
  );
END;
$$;

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

  SELECT loyalty_points INTO v_balance
  FROM profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'profile_not_found');
  END IF;

  IF v_balance < p_milestone_points THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_points',
      'balance', v_balance,
      'required', p_milestone_points
    );
  END IF;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  v_new := v_balance - p_milestone_points;
  UPDATE profiles SET loyalty_points = v_new WHERE id = p_profile_id;

  INSERT INTO loyalty_transactions (
    profile_id, transaction_type, points, balance_after, description, redemption_code
  ) VALUES (
    p_profile_id,
    'redeem',
    -p_milestone_points,
    v_new,
    format('Vault %s claimed', v_milestone.reward_label),
    v_code
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
    PERFORM recalculate_calendar_spend(v_profile_id);
    PERFORM compute_loyalty_tier(v_profile_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'profiles_updated', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION recalculate_calendar_spend(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION compute_loyalty_tier(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_tier_earn_multiplier(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_founding_member_spot(uuid, uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_wallet_snapshot(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION redeem_vault_milestone(uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION backfill_wallet_state() TO anon, authenticated;

-- ============================================================================
-- 7) process_checkout — tier multiplier, founding claim, wallet in response
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
  p_gift_card_amount numeric DEFAULT NULL
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

  IF appt.loyalty_points_cost IS NOT NULL AND appt.loyalty_points_cost > 0 THEN
    v_loyalty_redeem := appt.loyalty_points_cost;
    v_loyalty_name := appt.loyalty_reward_name;
    IF v_discount = 0 AND COALESCE(appt.loyalty_discount_amount, 0) > 0 THEN
      v_discount := LEAST(appt.loyalty_discount_amount, v_amount);
    END IF;
  ELSE
    v_loyalty_redeem := COALESCE(p_loyalty_points_redeem, 0);
    v_loyalty_name := p_loyalty_reward_name;
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

  IF v_loyalty_redeem > 0 AND appt.customer_id IS NOT NULL THEN
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

  -- Digital Wallet: spend, tier, founding (non-blocking)
  v_founding_result := NULL;
  IF appt.customer_id IS NOT NULL THEN
    PERFORM recalculate_calendar_spend(appt.customer_id);
    PERFORM compute_loyalty_tier(appt.customer_id);
    v_founding_result := claim_founding_member_spot(appt.customer_id, payment_id, appointment_id);

    SELECT loyalty_tier INTO v_tier FROM profiles WHERE id = appt.customer_id;
    v_multiplier := get_tier_earn_multiplier(COALESCE(v_tier, 'pearl'));
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
        format('Points earned from visit checkout (%s tier)', COALESCE(v_tier, 'pearl')),
        'earn',
        appointment_id
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
    'wallet_snapshot', v_wallet_snapshot
  ) INTO result;

  RETURN result;
END;
$$;

-- Enable Realtime on profiles for founding reveal (ignore error if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
