-- Migration 102: Vault milestone snapshot — keep claimed milestones accessible, expose used_at
-- Run after 101_vault_redemption_unify.sql

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
