-- Migration 103: Founding program — 100 total (25 Vanguard + 75 Legacy)
-- Run once in Supabase SQL Editor after 102_vault_snapshot_milestones.sql
--
-- Vanguard: spots 1–25  → badge 01/25 … 25/25
-- Legacy:  spots 26–100 → badge 1/75 … 75/75

ALTER TABLE founding_members
  DROP CONSTRAINT IF EXISTS founding_members_spot_number_check;

ALTER TABLE founding_members
  ADD CONSTRAINT founding_members_spot_number_check
  CHECK (spot_number BETWEEN 1 AND 100);

CREATE OR REPLACE FUNCTION format_founding_badge(p_type text, p_spot integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_type
    WHEN 'vanguard' THEN lpad(p_spot::text, 2, '0') || '/25'
    WHEN 'legacy' THEN (p_spot - 25)::text || '/75'
    ELSE NULL
  END;
$$;

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
