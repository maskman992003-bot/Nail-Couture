-- Loyalty points at checkout: earn on services/add-ons only (after discounts).
-- Excludes tips. Cash and gift card both count toward the service total.
-- Run after sql/104_rolling_loyalty_tiers.sql (or includes 104 compatibility patches below).

-- ============================================================================
-- 104 compatibility — rolling_spend_12m + RPCs that still referenced calendar_spend_ytd
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'calendar_spend_ytd'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'rolling_spend_12m'
  ) THEN
    ALTER TABLE profiles RENAME COLUMN calendar_spend_ytd TO rolling_spend_12m;
  END IF;
END $$;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS rolling_spend_12m numeric NOT NULL DEFAULT 0;

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

GRANT EXECUTE ON FUNCTION recalculate_rolling_spend(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION compute_loyalty_tier(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_wallet_snapshot(uuid) TO anon, authenticated;

-- ============================================================================
-- process_checkout — service-only loyalty points
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
  v_points_base numeric;
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

  -- Points: service/add-on total after discounts (not tips). Gift card and cash both count.
  v_points_base := GREATEST(v_service_due, 0);

  IF appt.customer_id IS NOT NULL AND v_points_base > 0 THEN
    v_points_earned := FLOOR(v_points_base * COALESCE(v_multiplier, 1.0))::integer;
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
    'points_base', COALESCE(v_points_base, 0),
    'tier', v_tier,
    'founding_result', COALESCE(v_founding_result, jsonb_build_object('success', false, 'reason', 'no_customer')),
    'wallet_snapshot', v_wallet_snapshot,
    'vault_code_applied', v_vault_code
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION process_checkout(
  text, uuid, numeric, numeric, text, numeric, text, text, integer, text, numeric, jsonb, uuid, numeric, text
) TO anon, authenticated;
