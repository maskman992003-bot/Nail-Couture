-- Migration 120: Gift cards for unregistered recipients — pending claim + share link
-- Run once in Supabase SQL Editor after 119_mystery_gift.sql

-- ---------------------------------------------------------------------------
-- 1) Schema
-- ---------------------------------------------------------------------------

ALTER TABLE gift_cards
  ADD COLUMN IF NOT EXISTS pending_recipient_phone text NULL,
  ADD COLUMN IF NOT EXISTS claim_token text NULL,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_gift_cards_claim_token
  ON gift_cards (claim_token)
  WHERE claim_token IS NOT NULL;

ALTER TABLE gift_card_sale_requests
  ADD COLUMN IF NOT EXISTS pending_recipient_phone text NULL;

COMMENT ON COLUMN gift_cards.pending_recipient_phone IS
  'Digits-only phone locked for claim; buyer holds escrow until recipient registers.';
COMMENT ON COLUMN gift_cards.claim_token IS
  'Opaque share token for /gift/claim/:token — never exposes redeemable card code.';
COMMENT ON COLUMN gift_cards.claimed_at IS
  'When pending_recipient_phone was cleared and ownership transferred to recipient.';

-- ---------------------------------------------------------------------------
-- 2) Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION gift_card_normalize_phone(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
$$;

CREATE OR REPLACE FUNCTION gift_card_generate_claim_token()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
$$;

CREATE OR REPLACE FUNCTION gift_card_mask_phone(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_phone IS NULL OR length(p_phone) < 4 THEN '***-***-****'
    ELSE '***-***-' || right(p_phone, 4)
  END;
$$;

CREATE OR REPLACE FUNCTION gift_card_is_pending_claim(p_card gift_cards)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_card.pending_recipient_phone IS NOT NULL
    AND trim(p_card.pending_recipient_phone) != '';
$$;

-- ---------------------------------------------------------------------------
-- 3) gift_card_row_to_json — pending claim fields
-- ---------------------------------------------------------------------------

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
    'pending_recipient_phone', p_card.pending_recipient_phone,
    'claim_token', p_card.claim_token,
    'claimed_at', p_card.claimed_at,
    'claim_status', CASE
      WHEN gift_card_is_pending_claim(p_card) THEN 'pending'
      WHEN p_card.claimed_at IS NOT NULL THEN 'claimed'
      ELSE NULL
    END,
    'is_expired', gift_card_is_expired(p_card.expires_at, p_card.status),
    'can_transfer', (
      p_card.status = 'active'
      AND p_card.first_used_at IS NULL
      AND p_card.balance = p_card.initial_amount
      AND NOT gift_card_is_expired(p_card.expires_at, p_card.status)
      AND NOT gift_card_is_pending_claim(p_card)
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- 4) request_gift_card_sale — allow unregistered recipient
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION request_gift_card_sale(
  caller_phone text,
  buyer_phone text,
  p_amount numeric,
  p_owner_phone text DEFAULT NULL,
  p_recipient_name text DEFAULT NULL,
  p_gift_message text DEFAULT NULL,
  p_notes text DEFAULT NULL
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
  v_amount numeric;
  v_request_id uuid;
  v_cashier RECORD;
  v_buyer_phone_norm text;
  v_owner_phone_norm text;
  v_pending_recipient_phone text;
BEGIN
  SELECT id, role INTO v_caller_id, v_caller_role
  FROM profiles
  WHERE gift_card_normalize_phone(phone) = gift_card_normalize_phone(caller_phone);

  IF NOT gift_card_can_request_sale(v_caller_role) THEN
    RAISE EXCEPTION 'Not authorized. Send gift card sales to the cashier for payment collection.';
  END IF;

  v_amount := round(COALESCE(p_amount, 0)::numeric, 2);
  IF v_amount < 10 OR v_amount > 500 THEN
    RAISE EXCEPTION 'Gift card amount must be between $10 and $500.';
  END IF;

  v_buyer_phone_norm := gift_card_normalize_phone(buyer_phone);
  SELECT id, full_name, phone, role INTO v_buyer
  FROM profiles
  WHERE gift_card_normalize_phone(phone) = v_buyer_phone_norm;

  IF v_buyer.id IS NULL THEN
    RAISE EXCEPTION 'Buyer not found. Customer must register before purchasing a gift card.';
  END IF;

  v_pending_recipient_phone := NULL;
  v_owner_phone_norm := gift_card_normalize_phone(p_owner_phone);

  IF v_owner_phone_norm != '' AND v_owner_phone_norm != v_buyer_phone_norm THEN
    SELECT id, full_name, phone, role INTO v_owner
    FROM profiles
    WHERE gift_card_normalize_phone(phone) = v_owner_phone_norm;

    IF v_owner.id IS NULL THEN
      v_owner_id := v_buyer.id;
      v_pending_recipient_phone := v_owner_phone_norm;
      v_owner := v_buyer;
    ELSE
      v_owner_id := v_owner.id;
    END IF;
  ELSE
    v_owner := v_buyer;
    v_owner_id := v_buyer.id;
  END IF;

  INSERT INTO gift_card_sale_requests (
    buyer_id, owner_id, amount,
    recipient_name, gift_message, notes, requested_by_id,
    pending_recipient_phone
  ) VALUES (
    v_buyer.id, v_owner_id, v_amount,
    NULLIF(trim(p_recipient_name), ''), NULLIF(trim(p_gift_message), ''), NULLIF(trim(p_notes), ''), v_caller_id,
    v_pending_recipient_phone
  )
  RETURNING id INTO v_request_id;

  FOR v_cashier IN
    SELECT id FROM profiles WHERE role = 'cashier'
  LOOP
    PERFORM create_notification(
      v_cashier.id,
      'Gift card sale pending',
      format(
        '%s sent a $%s gift card sale for %s to the cashier queue.',
        (SELECT full_name FROM profiles WHERE id = v_caller_id),
        trim(to_char(v_amount, '999990.99')),
        COALESCE(NULLIF(trim(p_recipient_name), ''), v_owner.full_name, v_buyer.full_name)
      ),
      'gift_card_sale_pending',
      v_request_id,
      jsonb_build_object(
        'request_id', v_request_id,
        'amount', v_amount,
        'buyer_name', v_buyer.full_name,
        'owner_name', COALESCE(NULLIF(trim(p_recipient_name), ''), v_owner.full_name, v_buyer.full_name),
        'pending_recipient', v_pending_recipient_phone IS NOT NULL
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'buyer_name', v_buyer.full_name,
    'owner_name', COALESCE(NULLIF(trim(p_recipient_name), ''), v_owner.full_name, v_buyer.full_name),
    'amount', v_amount,
    'status', 'pending',
    'pending_claim', v_pending_recipient_phone IS NOT NULL,
    'pending_recipient_phone', v_pending_recipient_phone
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) purchase_gift_card — pending claim for unregistered recipients
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS purchase_gift_card(text, text, numeric, text, text, text, text, text);

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
  v_buyer_phone_norm text;
  v_owner_phone_norm text;
  v_pending_recipient_phone text;
  v_claim_token text;
  v_pending_claim boolean := false;
BEGIN
  SELECT id, role INTO v_caller_id, v_caller_role
  FROM profiles
  WHERE gift_card_normalize_phone(phone) = gift_card_normalize_phone(caller_phone);

  IF NOT gift_card_can_complete_sale(v_caller_role) THEN
    RAISE EXCEPTION 'Not authorized. Only cashier or super admin can complete gift card sales.';
  END IF;

  v_pending_recipient_phone := NULL;
  v_claim_token := NULL;

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
    v_pending_recipient_phone := v_request.pending_recipient_phone;

    IF v_pending_recipient_phone IS NOT NULL THEN
      v_pending_claim := true;
      v_claim_token := gift_card_generate_claim_token();
    END IF;
  ELSE
    v_amount := round(COALESCE(p_amount, 0)::numeric, 2);
    IF v_amount < 10 OR v_amount > 500 THEN
      RAISE EXCEPTION 'Gift card amount must be between $10 and $500.';
    END IF;

    v_buyer_phone_norm := gift_card_normalize_phone(buyer_phone);
    SELECT id, full_name, phone, role INTO v_buyer
    FROM profiles
    WHERE gift_card_normalize_phone(phone) = v_buyer_phone_norm;

    IF v_buyer.id IS NULL THEN
      RAISE EXCEPTION 'Buyer not found. Customer must register before purchasing a gift card.';
    END IF;

    v_owner_phone_norm := gift_card_normalize_phone(p_owner_phone);

    IF v_owner_phone_norm != '' AND v_owner_phone_norm != v_buyer_phone_norm THEN
      SELECT id, full_name, phone, role INTO v_owner
      FROM profiles
      WHERE gift_card_normalize_phone(phone) = v_owner_phone_norm;

      IF v_owner.id IS NULL THEN
        v_owner_id := v_buyer.id;
        v_pending_recipient_phone := v_owner_phone_norm;
        v_pending_claim := true;
        v_claim_token := gift_card_generate_claim_token();
        v_owner := v_buyer;
      ELSE
        v_owner_id := v_owner.id;
      END IF;
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
    expires_at, pending_recipient_phone, claim_token
  ) VALUES (
    v_code, v_amount, v_amount, 'active',
    v_buyer.id, v_owner_id, v_recipient_name, v_gift_message, v_caller_id,
    gift_card_purchase_expires_at(v_purchased_at),
    v_pending_recipient_phone, v_claim_token
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
        'Cashier completed the $%s gift card sale for %s.%s',
        trim(to_char(v_amount, '999990.99')),
        COALESCE(v_recipient_name, v_owner.full_name, v_buyer.full_name),
        CASE WHEN v_pending_claim THEN ' Share the claim link with your friend.' ELSE format(' Code: %s', v_code) END
      ),
      'gift_card_sale_completed',
      v_card.id,
      jsonb_build_object(
        'gift_card_id', v_card.id,
        'code', CASE WHEN v_pending_claim THEN NULL ELSE v_code END,
        'claim_token', v_claim_token,
        'request_id', p_request_id,
        'pending_claim', v_pending_claim
      )
    );
  END IF;

  IF v_pending_claim THEN
    PERFORM create_notification(
      v_buyer.id,
      'Gift card ready to share',
      format(
        'Your $%s gift card for %s is ready. Share the claim link so they can register and receive it.',
        trim(to_char(v_amount, '999990.99')),
        COALESCE(v_recipient_name, gift_card_mask_phone(v_pending_recipient_phone))
      ),
      'gift_card_pending_share',
      v_card.id,
      jsonb_build_object(
        'gift_card_id', v_card.id,
        'claim_token', v_claim_token,
        'amount', v_amount,
        'pending_recipient_phone', v_pending_recipient_phone
      )
    );
  ELSIF v_owner_id = v_buyer.id THEN
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
    'owner_name', COALESCE(v_recipient_name, v_owner.full_name, v_buyer.full_name),
    'payment_method', v_payment_method,
    'request_id', p_request_id,
    'pending_claim', v_pending_claim,
    'claim_token', v_claim_token
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) transfer_gift_card — block pending claim cards
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

  IF gift_card_is_pending_claim(v_card) THEN
    RAISE EXCEPTION 'This gift card is waiting for your friend to register. Share the claim link instead.';
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
-- 7) get_my_gift_cards — separate pending escrow from owned wallet
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
  v_phone_norm text;
BEGIN
  PERFORM gift_card_enforce_all_pending_expirations();

  v_phone_norm := gift_card_normalize_phone(p_phone);
  SELECT id, full_name INTO v_profile
  FROM profiles
  WHERE gift_card_normalize_phone(phone) = v_phone_norm;

  IF v_profile.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  SELECT COALESCE(jsonb_agg(
    gift_card_row_to_json(gc.*) || jsonb_build_object(
      'owner_name', op.full_name,
      'purchased_by_name', pp.full_name,
      'gifted_from_name', gift_card_gifted_from_name(gc.*)
    )
    ORDER BY gc.created_at DESC
  ), '[]'::jsonb)
  INTO v_owned
  FROM gift_cards gc
  LEFT JOIN profiles op ON op.id = gc.owner_id
  LEFT JOIN profiles pp ON pp.id = gc.purchased_by_id
  WHERE gc.owner_id = v_profile.id
    AND NOT gift_card_is_pending_claim(gc);

  SELECT COALESCE(jsonb_agg(
    gift_card_row_to_json(gc.*) || jsonb_build_object(
      'owner_name', COALESCE(gc.recipient_name, op.full_name, gift_card_mask_phone(gc.pending_recipient_phone)),
      'purchased_by_name', pp.full_name,
      'gifted_from_name', gift_card_gifted_from_name(gc.*)
    )
    ORDER BY gc.created_at DESC
  ), '[]'::jsonb)
  INTO v_purchased
  FROM gift_cards gc
  LEFT JOIN profiles op ON op.id = gc.owner_id
  LEFT JOIN profiles pp ON pp.id = gc.purchased_by_id
  WHERE gc.purchased_by_id = v_profile.id
    AND (
      gc.owner_id != v_profile.id
      OR gift_card_is_pending_claim(gc)
    );

  RETURN jsonb_build_object(
    'success', true,
    'owned', v_owned,
    'purchased_for_others', v_purchased
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 8) Checkout — block pending claim cards
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_checkout_gift_cards(
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

  v_caller_role := gift_card_caller_role(caller_phone);
  IF NOT gift_card_is_sales_role(v_caller_role) THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  IF p_customer_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'gift_cards', '[]'::jsonb);
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', gc.id,
      'balance', gc.balance,
      'initial_amount', gc.initial_amount,
      'expires_at', gc.expires_at,
      'status', gc.status,
      'code_display', gift_card_checkout_mask(gc.code),
      'gifted_from_name', CASE
        WHEN gc.purchased_by_id IS NOT NULL
          AND gc.owner_id IS NOT NULL
          AND gc.purchased_by_id != gc.owner_id
        THEN pp.full_name
        ELSE NULL
      END,
      'created_at', gc.created_at
    )
    ORDER BY gc.created_at DESC
  ), '[]'::jsonb)
  INTO v_cards
  FROM gift_cards gc
  LEFT JOIN profiles pp ON pp.id = gc.purchased_by_id
  WHERE gc.owner_id = p_customer_id
    AND gc.status = 'active'
    AND gc.balance > 0
    AND NOT gift_card_is_expired(gc.expires_at, gc.status)
    AND NOT gift_card_is_pending_claim(gc);

  RETURN jsonb_build_object('success', true, 'gift_cards', v_cards);
END;
$$;

CREATE OR REPLACE FUNCTION verify_gift_card_for_checkout(
  caller_phone text,
  p_customer_id uuid,
  p_gift_card_id uuid,
  p_confirmation text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_card gift_cards%ROWTYPE;
  v_expected text;
  v_provided text;
BEGIN
  v_caller_role := gift_card_caller_role(caller_phone);
  IF NOT gift_card_is_sales_role(v_caller_role) THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  IF p_customer_id IS NULL OR p_gift_card_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid request.');
  END IF;

  v_provided := upper(trim(p_confirmation));
  IF length(v_provided) != 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Confirmation does not match.');
  END IF;

  SELECT * INTO v_card FROM gift_cards WHERE id = p_gift_card_id;
  IF v_card.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift card not found.');
  END IF;

  IF gift_card_is_pending_claim(v_card) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This gift card has not been claimed yet.');
  END IF;

  v_card := gift_card_enforce_expiration(v_card);

  IF v_card.owner_id IS DISTINCT FROM p_customer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift card not found.');
  END IF;

  IF v_card.status = 'expired' OR gift_card_is_expired(v_card.expires_at, v_card.status) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This gift card has expired.');
  END IF;

  IF v_card.status != 'active' OR v_card.balance <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift card has no remaining balance.');
  END IF;

  v_expected := gift_card_checkout_confirm_chars(v_card.code);
  IF v_provided != v_expected THEN
    RETURN jsonb_build_object('success', false, 'error', 'Confirmation does not match.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'gift_card', jsonb_build_object(
      'id', v_card.id,
      'balance', v_card.balance,
      'initial_amount', v_card.initial_amount,
      'expires_at', v_card.expires_at,
      'status', v_card.status,
      'owner_id', v_card.owner_id,
      'code_display', gift_card_checkout_mask(v_card.code)
    )
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 9) process_checkout — block pending claim redemption (patch gift card block)
-- Re-declares full function from 114 with pending-claim guard.
-- ---------------------------------------------------------------------------

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

    IF gift_card_is_pending_claim(v_card) THEN
      RAISE EXCEPTION 'This gift card has not been claimed by the recipient yet.';
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

-- ---------------------------------------------------------------------------
-- 10) get_gift_card_claim_preview — public anon-safe preview
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_gift_card_claim_preview(p_claim_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card gift_cards%ROWTYPE;
  v_buyer_name text;
  v_buyer_first text;
  v_existing_profile_id uuid;
BEGIN
  IF p_claim_token IS NULL OR trim(p_claim_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found', 'message', 'Gift link not found.');
  END IF;

  SELECT gc.* INTO v_card
  FROM gift_cards gc
  WHERE gc.claim_token = trim(p_claim_token);

  IF v_card.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found', 'message', 'Gift link not found.');
  END IF;

  v_card := gift_card_enforce_expiration(v_card);

  SELECT full_name INTO v_buyer_name FROM profiles WHERE id = v_card.purchased_by_id;
  v_buyer_first := split_part(COALESCE(v_buyer_name, ''), ' ', 1);

  IF v_card.status = 'expired' OR gift_card_is_expired(v_card.expires_at, v_card.status) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'expired',
      'message', format('This gift card expired on %s.', to_char(v_card.expires_at, 'Mon DD, YYYY'))
    );
  END IF;

  IF NOT gift_card_is_pending_claim(v_card) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_claimed',
      'message', 'This gift has already been claimed.',
      'has_account', true,
      'login_path', '/login'
    );
  END IF;

  SELECT id INTO v_existing_profile_id
  FROM profiles
  WHERE gift_card_normalize_phone(phone) = v_card.pending_recipient_phone
  LIMIT 1;

  IF v_existing_profile_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'account_exists',
      'message', 'An account with this phone number already exists. Log in to receive your gift.',
      'login_path', '/login',
      'masked_phone', gift_card_mask_phone(v_card.pending_recipient_phone)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'amount', v_card.initial_amount,
    'balance', v_card.balance,
    'recipient_name', v_card.recipient_name,
    'gift_message', v_card.gift_message,
    'buyer_first_name', NULLIF(v_buyer_first, ''),
    'masked_phone', gift_card_mask_phone(v_card.pending_recipient_phone),
    'phone_for_registration', v_card.pending_recipient_phone,
    'register_path', format('/register?gift=%s', v_card.claim_token),
    'expires_at', v_card.expires_at
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 11) claim_pending_gift_cards — auto-claim on registration
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION claim_pending_gift_cards(p_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_phone_norm text;
  v_card gift_cards%ROWTYPE;
  v_claimed jsonb := '[]'::jsonb;
  v_buyer_name text;
BEGIN
  SELECT id, full_name, phone INTO v_profile
  FROM profiles
  WHERE id = p_profile_id;

  IF v_profile.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  v_phone_norm := gift_card_normalize_phone(v_profile.phone);
  IF v_phone_norm = '' THEN
    RETURN jsonb_build_object('success', true, 'claimed', v_claimed, 'count', 0);
  END IF;

  FOR v_card IN
    SELECT * FROM gift_cards
    WHERE pending_recipient_phone = v_phone_norm
      AND status = 'active'
      AND NOT gift_card_is_expired(expires_at, status)
    FOR UPDATE
  LOOP
    SELECT full_name INTO v_buyer_name FROM profiles WHERE id = v_card.purchased_by_id;

    UPDATE gift_cards SET
      owner_id = v_profile.id,
      pending_recipient_phone = NULL,
      claimed_at = now(),
      updated_at = now()
    WHERE id = v_card.id
    RETURNING * INTO v_card;

    INSERT INTO gift_card_transactions (
      gift_card_id, transaction_type, amount, balance_after,
      performed_by_id, from_owner_id, to_owner_id, description
    ) VALUES (
      v_card.id, 'transfer', 0, v_card.balance,
      v_profile.id, v_card.purchased_by_id, v_profile.id,
      format('Claimed by %s after registration', v_profile.full_name)
    );

    PERFORM create_notification(
      v_profile.id,
      'Gift card received',
      format(
        'You received a $%s gift card from %s! Code: %s. Valid until %s.',
        trim(to_char(v_card.balance, '999990.99')),
        COALESCE(v_buyer_name, 'a friend'),
        v_card.code,
        to_char(v_card.expires_at, 'Mon DD, YYYY')
      ),
      'gift_card_received',
      v_card.id,
      jsonb_build_object(
        'gift_card_id', v_card.id,
        'code', v_card.code,
        'amount', v_card.balance,
        'gift_message', v_card.gift_message,
        'expires_at', v_card.expires_at
      )
    );

    PERFORM create_notification(
      v_card.purchased_by_id,
      'Gift card claimed',
      format(
        '%s claimed the $%s gift card you purchased.',
        v_profile.full_name,
        trim(to_char(v_card.balance, '999990.99'))
      ),
      'gift_card_claimed',
      v_card.id,
      jsonb_build_object('gift_card_id', v_card.id, 'recipient_name', v_profile.full_name)
    );

    v_claimed := v_claimed || jsonb_build_array(gift_card_row_to_json(v_card));
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'claimed', v_claimed,
    'count', jsonb_array_length(v_claimed)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 12) get_gift_card_sale_requests — expose pending recipient
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_gift_card_sale_requests(
  caller_phone text,
  p_status text DEFAULT 'pending'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_caller_role text;
  v_status text;
  v_requests jsonb;
BEGIN
  SELECT id, role INTO v_caller_id, v_caller_role
  FROM profiles
  WHERE gift_card_normalize_phone(phone) = gift_card_normalize_phone(caller_phone);

  v_status := COALESCE(NULLIF(trim(p_status), ''), 'pending');

  IF gift_card_can_complete_sale(v_caller_role) THEN
    SELECT COALESCE(jsonb_agg(sub.req ORDER BY sub.sort_at DESC), '[]'::jsonb)
    INTO v_requests
    FROM (
      SELECT jsonb_build_object(
        'id', r.id,
        'status', r.status,
        'amount', r.amount,
        'recipient_name', r.recipient_name,
        'gift_message', r.gift_message,
        'notes', r.notes,
        'created_at', r.created_at,
        'buyer_id', r.buyer_id,
        'buyer_name', bp.full_name,
        'buyer_phone', bp.phone,
        'owner_id', r.owner_id,
        'owner_name', COALESCE(r.recipient_name, op.full_name),
        'owner_phone', COALESCE(r.pending_recipient_phone, op.phone),
        'pending_recipient_phone', r.pending_recipient_phone,
        'pending_claim', r.pending_recipient_phone IS NOT NULL,
        'requested_by_id', r.requested_by_id,
        'requested_by_name', rp.full_name
      ) AS req,
      r.created_at AS sort_at
      FROM gift_card_sale_requests r
      JOIN profiles bp ON bp.id = r.buyer_id
      JOIN profiles op ON op.id = r.owner_id
      JOIN profiles rp ON rp.id = r.requested_by_id
      WHERE r.status = v_status
    ) sub;
  ELSIF gift_card_can_request_sale(v_caller_role) THEN
    SELECT COALESCE(jsonb_agg(sub.req ORDER BY sub.sort_at DESC), '[]'::jsonb)
    INTO v_requests
    FROM (
      SELECT jsonb_build_object(
        'id', r.id,
        'status', r.status,
        'amount', r.amount,
        'recipient_name', r.recipient_name,
        'gift_message', r.gift_message,
        'notes', r.notes,
        'created_at', r.created_at,
        'buyer_id', r.buyer_id,
        'buyer_name', bp.full_name,
        'buyer_phone', bp.phone,
        'owner_id', r.owner_id,
        'owner_name', COALESCE(r.recipient_name, op.full_name),
        'owner_phone', COALESCE(r.pending_recipient_phone, op.phone),
        'pending_recipient_phone', r.pending_recipient_phone,
        'pending_claim', r.pending_recipient_phone IS NOT NULL,
        'requested_by_id', r.requested_by_id,
        'requested_by_name', rp.full_name
      ) AS req,
      r.created_at AS sort_at
      FROM gift_card_sale_requests r
      JOIN profiles bp ON bp.id = r.buyer_id
      JOIN profiles op ON op.id = r.owner_id
      JOIN profiles rp ON rp.id = r.requested_by_id
      WHERE r.status = v_status
        AND r.requested_by_id = v_caller_id
    ) sub;
  ELSE
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  RETURN jsonb_build_object('success', true, 'requests', v_requests);
END;
$$;

-- ---------------------------------------------------------------------------
-- 13) Grants
-- ---------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION gift_card_normalize_phone(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION gift_card_mask_phone(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION gift_card_is_pending_claim(gift_cards) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_gift_card_claim_preview(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_pending_gift_cards(uuid) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION request_gift_card_sale(text, text, numeric, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION purchase_gift_card(text, text, numeric, text, text, text, text, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_gift_card_sale_requests(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION transfer_gift_card(text, uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_my_gift_cards(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_checkout_gift_cards(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_gift_card_for_checkout(text, uuid, uuid, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
