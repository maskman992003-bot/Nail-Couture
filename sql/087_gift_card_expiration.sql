-- Migration 087: Gift card expiration — 6 months from purchase date (never reset on transfer)
-- Run once in Supabase SQL Editor after 086_fix_gift_card_sale_requests_agg.sql

-- ---------------------------------------------------------------------------
-- 1) Schema — expired status + expire ledger type
-- ---------------------------------------------------------------------------

ALTER TABLE gift_cards DROP CONSTRAINT IF EXISTS gift_cards_status_check;
ALTER TABLE gift_cards ADD CONSTRAINT gift_cards_status_check
  CHECK (status IN ('active', 'depleted', 'voided', 'expired'));

ALTER TABLE gift_card_transactions DROP CONSTRAINT IF EXISTS gift_card_transactions_transaction_type_check;
ALTER TABLE gift_card_transactions ADD CONSTRAINT gift_card_transactions_transaction_type_check
  CHECK (transaction_type IN ('purchase', 'transfer', 'redeem', 'void', 'adjustment', 'expire'));

COMMENT ON COLUMN gift_cards.expires_at IS
  'Fixed expiration date — always 6 months after purchase (created_at). Never reset on transfer.';

-- Backfill missing expiration dates from purchase date
UPDATE gift_cards
SET expires_at = created_at + interval '6 months'
WHERE expires_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2) Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION gift_card_purchase_expires_at(p_purchased_at timestamptz DEFAULT now())
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_purchased_at + interval '6 months';
$$;

CREATE OR REPLACE FUNCTION gift_card_is_expired(p_expires_at timestamptz, p_status text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT p_status = 'expired'
    OR (p_expires_at IS NOT NULL AND p_expires_at <= now());
$$;

CREATE OR REPLACE FUNCTION gift_card_enforce_expiration(p_card gift_cards)
RETURNS gift_cards
LANGUAGE plpgsql
AS $$
DECLARE
  v_card gift_cards%ROWTYPE := p_card;
  v_prev_balance numeric;
BEGIN
  IF v_card.id IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_card.status = 'active'
     AND gift_card_is_expired(v_card.expires_at, v_card.status) THEN
    v_prev_balance := v_card.balance;
    UPDATE gift_cards SET
      status = 'expired',
      balance = 0,
      updated_at = now()
    WHERE id = v_card.id
    RETURNING * INTO v_card;

    IF v_prev_balance > 0 THEN
      INSERT INTO gift_card_transactions (
        gift_card_id, transaction_type, amount, balance_after, description
      ) VALUES (
        v_card.id,
        'expire',
        -v_prev_balance,
        0,
        format(
          'Expired on %s (6 months from purchase)',
          to_char(v_card.expires_at, 'Mon DD, YYYY')
        )
      );
    END IF;
  END IF;

  RETURN v_card;
END;
$$;

CREATE OR REPLACE FUNCTION gift_card_enforce_all_pending_expirations()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_row gift_cards%ROWTYPE;
BEGIN
  FOR v_row IN
    SELECT * FROM gift_cards
    WHERE status = 'active'
      AND expires_at IS NOT NULL
      AND expires_at <= now()
    FOR UPDATE
  LOOP
    PERFORM gift_card_enforce_expiration(v_row);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION gift_card_row_to_json(p_card gift_cards)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'id', p_card.id,
    'code', p_card.code,
    'initial_amount', p_card.initial_amount,
    'balance', p_card.balance,
    'status', p_card.status,
    'purchased_by_id', p_card.purchased_by_id,
    'owner_id', p_card.owner_id,
    'recipient_name', p_card.recipient_name,
    'gift_message', p_card.gift_message,
    'sold_by_id', p_card.sold_by_id,
    'first_used_at', p_card.first_used_at,
    'expires_at', p_card.expires_at,
    'created_at', p_card.created_at,
    'is_expired', gift_card_is_expired(p_card.expires_at, p_card.status),
    'can_transfer', (
      p_card.status = 'active'
      AND p_card.first_used_at IS NULL
      AND p_card.balance = p_card.initial_amount
      AND NOT gift_card_is_expired(p_card.expires_at, p_card.status)
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- 3) purchase_gift_card — set expires_at at sale (085 version + expiry)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION purchase_gift_card(
  caller_phone text,
  buyer_phone text,
  p_amount numeric,
  p_payment_method text DEFAULT 'card',
  p_owner_phone text DEFAULT NULL,
  p_recipient_name text DEFAULT NULL,
  p_gift_message text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_request_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_caller_role text;
  v_buyer RECORD;
  v_owner RECORD;
  v_owner_id uuid;
  v_payment_method text;
  v_amount numeric;
  v_code text;
  v_card gift_cards%ROWTYPE;
  v_request gift_card_sale_requests%ROWTYPE;
  v_recipient_name text;
  v_gift_message text;
  v_notes text;
  v_purchased_at timestamptz := now();
BEGIN
  SELECT id, role INTO v_caller_id, v_caller_role
  FROM profiles WHERE phone = caller_phone;

  IF NOT gift_card_can_complete_sale(v_caller_role) THEN
    RAISE EXCEPTION 'Not authorized. Only cashier or super admin can complete gift card sales.';
  END IF;

  IF p_request_id IS NOT NULL THEN
    SELECT * INTO v_request
    FROM gift_card_sale_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF v_request.id IS NULL THEN
      RAISE EXCEPTION 'Gift card sale request not found.';
    END IF;
    IF v_request.status != 'pending' THEN
      RAISE EXCEPTION 'This gift card sale request is no longer pending.';
    END IF;

    SELECT id, full_name, phone, role INTO v_buyer
    FROM profiles WHERE id = v_request.buyer_id;

    SELECT id, full_name, phone, role INTO v_owner
    FROM profiles WHERE id = v_request.owner_id;

    v_owner_id := v_request.owner_id;
    v_amount := v_request.amount;
    v_recipient_name := v_request.recipient_name;
    v_gift_message := v_request.gift_message;
    v_notes := COALESCE(NULLIF(trim(p_notes), ''), v_request.notes);
  ELSE
    v_amount := round(COALESCE(p_amount, 0)::numeric, 2);
    IF v_amount < 10 OR v_amount > 500 THEN
      RAISE EXCEPTION 'Gift card amount must be between $10 and $500.';
    END IF;

    SELECT id, full_name, phone, role INTO v_buyer
    FROM profiles WHERE phone = buyer_phone;

    IF v_buyer.id IS NULL THEN
      RAISE EXCEPTION 'Buyer not found. Customer must register before purchasing a gift card.';
    END IF;

    IF p_owner_phone IS NOT NULL AND trim(p_owner_phone) != '' AND p_owner_phone != buyer_phone THEN
      SELECT id, full_name, phone, role INTO v_owner
      FROM profiles WHERE phone = p_owner_phone;
      IF v_owner.id IS NULL THEN
        RAISE EXCEPTION 'Recipient not found. They must register before receiving a gift card.';
      END IF;
      v_owner_id := v_owner.id;
    ELSE
      v_owner := v_buyer;
      v_owner_id := v_buyer.id;
    END IF;

    v_recipient_name := NULLIF(trim(p_recipient_name), '');
    v_gift_message := NULLIF(trim(p_gift_message), '');
    v_notes := NULLIF(trim(p_notes), '');
  END IF;

  v_payment_method := CASE
    WHEN lower(p_payment_method) IN ('cash', 'card', 'other') THEN lower(p_payment_method)
    WHEN lower(p_payment_method) = 'transfer' THEN 'other'
    ELSE 'card'
  END;

  v_code := gift_card_generate_code();

  INSERT INTO gift_cards (
    code, initial_amount, balance, status,
    purchased_by_id, owner_id, recipient_name, gift_message, sold_by_id,
    expires_at
  ) VALUES (
    v_code, v_amount, v_amount, 'active',
    v_buyer.id, v_owner_id, v_recipient_name, v_gift_message, v_caller_id,
    gift_card_purchase_expires_at(v_purchased_at)
  )
  RETURNING * INTO v_card;

  INSERT INTO gift_card_purchases (
    gift_card_id, amount, payment_method, cashier_id, notes
  ) VALUES (
    v_card.id, v_amount, v_payment_method, v_caller_id, v_notes
  );

  INSERT INTO gift_card_transactions (
    gift_card_id, transaction_type, amount, balance_after,
    performed_by_id, description
  ) VALUES (
    v_card.id, 'purchase', v_amount, v_amount,
    v_caller_id,
    format('Gift card purchased for $%s', trim(to_char(v_amount, '999990.99')))
  );

  IF p_request_id IS NOT NULL THEN
    UPDATE gift_card_sale_requests SET
      status = 'completed',
      gift_card_id = v_card.id,
      completed_by_id = v_caller_id,
      payment_method = v_payment_method,
      completed_at = now()
    WHERE id = p_request_id;

    PERFORM create_notification(
      v_request.requested_by_id,
      'Gift card sale completed',
      format(
        'Cashier completed the $%s gift card sale for %s. Code: %s',
        trim(to_char(v_amount, '999990.99')),
        COALESCE(v_owner.full_name, v_buyer.full_name),
        v_code
      ),
      'gift_card_sale_completed',
      v_card.id,
      jsonb_build_object('gift_card_id', v_card.id, 'code', v_code, 'request_id', p_request_id)
    );
  END IF;

  IF v_owner_id = v_buyer.id THEN
    PERFORM create_notification(
      v_buyer.id,
      'Gift card purchased',
      format(
        'Your $%s gift card is ready. Code: %s. Valid until %s.',
        trim(to_char(v_amount, '999990.99')),
        v_code,
        to_char(v_card.expires_at, 'Mon DD, YYYY')
      ),
      'gift_card_purchased',
      v_card.id,
      jsonb_build_object('gift_card_id', v_card.id, 'code', v_code, 'amount', v_amount, 'expires_at', v_card.expires_at)
    );
  ELSE
    PERFORM create_notification(
      v_buyer.id,
      'Gift card purchased',
      format('You purchased a $%s gift card for %s.', trim(to_char(v_amount, '999990.99')), COALESCE(v_owner.full_name, 'recipient')),
      'gift_card_purchased',
      v_card.id,
      jsonb_build_object('gift_card_id', v_card.id, 'code', v_code, 'amount', v_amount)
    );
    PERFORM create_notification(
      v_owner_id,
      'Gift card received',
      format(
        'You received a $%s gift card! Code: %s. Valid until %s.',
        trim(to_char(v_amount, '999990.99')),
        v_code,
        to_char(v_card.expires_at, 'Mon DD, YYYY')
      ),
      'gift_card_received',
      v_card.id,
      jsonb_build_object('gift_card_id', v_card.id, 'code', v_code, 'amount', v_amount, 'gift_message', v_gift_message, 'expires_at', v_card.expires_at)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'gift_card', gift_card_row_to_json(v_card),
    'buyer_name', v_buyer.full_name,
    'owner_name', COALESCE(v_owner.full_name, v_buyer.full_name),
    'payment_method', v_payment_method,
    'request_id', p_request_id
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) transfer_gift_card — block expired; never change expires_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION transfer_gift_card(
  owner_phone text,
  p_gift_card_id uuid,
  recipient_phone text,
  p_gift_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner RECORD;
  v_recipient RECORD;
  v_card gift_cards%ROWTYPE;
BEGIN
  SELECT id, full_name INTO v_owner FROM profiles WHERE phone = owner_phone;
  IF v_owner.id IS NULL THEN
    RAISE EXCEPTION 'Owner profile not found.';
  END IF;

  SELECT * INTO v_card FROM gift_cards WHERE id = p_gift_card_id FOR UPDATE;
  IF v_card.id IS NULL THEN
    RAISE EXCEPTION 'Gift card not found.';
  END IF;

  v_card := gift_card_enforce_expiration(v_card);
  IF v_card.status = 'expired' THEN
    RAISE EXCEPTION 'This gift card expired on %.', to_char(v_card.expires_at, 'Mon DD, YYYY');
  END IF;

  IF v_card.owner_id != v_owner.id THEN
    RAISE EXCEPTION 'You can only transfer gift cards you own.';
  END IF;

  IF v_card.status != 'active' THEN
    RAISE EXCEPTION 'This gift card cannot be transferred (status: %).', v_card.status;
  END IF;

  IF v_card.first_used_at IS NOT NULL OR v_card.balance != v_card.initial_amount THEN
    RAISE EXCEPTION 'Gift cards can only be transferred before any use.';
  END IF;

  SELECT id, full_name INTO v_recipient FROM profiles WHERE phone = recipient_phone;
  IF v_recipient.id IS NULL THEN
    RAISE EXCEPTION 'Recipient not found. They must register first.';
  END IF;

  IF v_recipient.id = v_owner.id THEN
    RAISE EXCEPTION 'Cannot transfer a gift card to yourself.';
  END IF;

  UPDATE gift_cards SET
    owner_id = v_recipient.id,
    gift_message = COALESCE(NULLIF(trim(p_gift_message), ''), gift_message),
    updated_at = now()
  WHERE id = v_card.id
  RETURNING * INTO v_card;

  INSERT INTO gift_card_transactions (
    gift_card_id, transaction_type, amount, balance_after,
    performed_by_id, from_owner_id, to_owner_id, description
  ) VALUES (
    v_card.id, 'transfer', 0, v_card.balance,
    v_owner.id, v_owner.id, v_recipient.id,
    format('Transferred to %s', v_recipient.full_name)
  );

  PERFORM create_notification(
    v_recipient.id,
    'Gift card received',
    format(
      '%s sent you a $%s gift card. Code: %s. Valid until %s.',
      v_owner.full_name,
      trim(to_char(v_card.balance, '999990.99')),
      v_card.code,
      to_char(v_card.expires_at, 'Mon DD, YYYY')
    ),
    'gift_card_received',
    v_card.id,
    jsonb_build_object('gift_card_id', v_card.id, 'code', v_card.code, 'from_name', v_owner.full_name, 'expires_at', v_card.expires_at)
  );

  RETURN jsonb_build_object(
    'success', true,
    'gift_card', gift_card_row_to_json(v_card),
    'recipient_name', v_recipient.full_name
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) get_my_gift_cards / get_customer_gift_cards — enforce pending expirations
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_my_gift_cards(p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_owned jsonb;
  v_purchased jsonb;
BEGIN
  PERFORM gift_card_enforce_all_pending_expirations();

  SELECT id, full_name INTO v_profile FROM profiles WHERE phone = p_phone;
  IF v_profile.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  SELECT COALESCE(jsonb_agg(
    gift_card_row_to_json(gc.*) || jsonb_build_object(
      'owner_name', op.full_name,
      'purchased_by_name', pp.full_name
    )
    ORDER BY gc.created_at DESC
  ), '[]'::jsonb)
  INTO v_owned
  FROM gift_cards gc
  LEFT JOIN profiles op ON op.id = gc.owner_id
  LEFT JOIN profiles pp ON pp.id = gc.purchased_by_id
  WHERE gc.owner_id = v_profile.id;

  SELECT COALESCE(jsonb_agg(
    gift_card_row_to_json(gc.*) || jsonb_build_object(
      'owner_name', op.full_name,
      'purchased_by_name', pp.full_name
    )
    ORDER BY gc.created_at DESC
  ), '[]'::jsonb)
  INTO v_purchased
  FROM gift_cards gc
  LEFT JOIN profiles op ON op.id = gc.owner_id
  LEFT JOIN profiles pp ON pp.id = gc.purchased_by_id
  WHERE gc.purchased_by_id = v_profile.id
    AND gc.owner_id != v_profile.id;

  RETURN jsonb_build_object(
    'success', true,
    'owned', v_owned,
    'purchased_for_others', v_purchased
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_customer_gift_cards(
  caller_phone text,
  p_customer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_cards jsonb;
BEGIN
  PERFORM gift_card_enforce_all_pending_expirations();

  SELECT role INTO v_caller_role FROM profiles WHERE phone = caller_phone;
  IF v_caller_role IS NULL OR v_caller_role NOT IN (
    'super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician'
  ) THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  SELECT COALESCE(jsonb_agg(
    gift_card_row_to_json(gc.*) || jsonb_build_object(
      'owner_name', op.full_name,
      'purchased_by_name', pp.full_name,
      'relation', CASE
        WHEN gc.owner_id = p_customer_id AND gc.purchased_by_id = p_customer_id THEN 'owned'
        WHEN gc.owner_id = p_customer_id THEN 'owned'
        WHEN gc.purchased_by_id = p_customer_id THEN 'purchased'
        ELSE 'other'
      END
    )
    ORDER BY gc.created_at DESC
  ), '[]'::jsonb)
  INTO v_cards
  FROM gift_cards gc
  LEFT JOIN profiles op ON op.id = gc.owner_id
  LEFT JOIN profiles pp ON pp.id = gc.purchased_by_id
  WHERE gc.owner_id = p_customer_id OR gc.purchased_by_id = p_customer_id;

  RETURN jsonb_build_object('success', true, 'gift_cards', v_cards);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) lookup_gift_card — reject expired cards at checkout
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION lookup_gift_card(
  caller_phone text,
  p_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_normalized text;
  v_card gift_cards%ROWTYPE;
  v_owner_name text;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE phone = caller_phone;
  IF NOT gift_card_is_sales_role(v_caller_role) THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  v_normalized := gift_card_normalize_code(p_code);
  IF v_normalized = '' THEN
    RAISE EXCEPTION 'Gift card code is required.';
  END IF;

  SELECT gc.* INTO v_card
  FROM gift_cards gc
  WHERE gift_card_normalize_code(gc.code) = v_normalized;

  IF v_card.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift card not found.');
  END IF;

  v_card := gift_card_enforce_expiration(v_card);

  SELECT full_name INTO v_owner_name FROM profiles WHERE id = v_card.owner_id;

  IF v_card.status = 'expired' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('This gift card expired on %s.', to_char(v_card.expires_at, 'Mon DD, YYYY')),
      'gift_card', gift_card_row_to_json(v_card) || jsonb_build_object('owner_name', v_owner_name)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'gift_card', gift_card_row_to_json(v_card) || jsonb_build_object('owner_name', v_owner_name)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 7) process_checkout — block redemption of expired cards
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS process_checkout(
  text, uuid, numeric, numeric, text, numeric, text, text, integer, text, numeric, jsonb
);

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
    v_points_earned := FLOOR(v_cash_due)::integer;
    IF v_points_earned > 0 THEN
      PERFORM award_loyalty_points(
        appt.customer_id,
        v_points_earned,
        'Points earned from visit checkout',
        'earn',
        appointment_id
      );
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
        jsonb_build_object('points', v_points_earned)
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
    'points_earned', COALESCE(v_points_earned, 0)
  ) INTO result;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 8) Apply expirations to any cards already past due
-- ---------------------------------------------------------------------------

SELECT gift_card_enforce_all_pending_expirations();
