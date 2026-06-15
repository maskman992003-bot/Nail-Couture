-- Migration 085: Gift card sale requests — staff send to cashier; only cashier/super_admin complete
-- Run once in Supabase SQL Editor after 084_gift_cards.sql

-- ---------------------------------------------------------------------------
-- 1) Pending sale requests (no gift card until cashier collects payment)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gift_card_sale_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'cancelled')),
  buyer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  amount numeric(10,2) NOT NULL CHECK (amount >= 10 AND amount <= 500),
  recipient_name text NULL,
  gift_message text NULL,
  notes text NULL,
  requested_by_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  gift_card_id uuid NULL REFERENCES gift_cards(id) ON DELETE SET NULL,
  completed_by_id uuid NULL REFERENCES profiles(id) ON DELETE SET NULL,
  payment_method text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  cancelled_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_gift_card_sale_requests_status_created
  ON gift_card_sale_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gift_card_sale_requests_requested_by
  ON gift_card_sale_requests (requested_by_id, created_at DESC);

ALTER TABLE gift_card_sale_requests ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE gift_card_sale_requests IS
  'Pending gift card sales initiated by staff; cashiers complete after collecting payment.';

-- ---------------------------------------------------------------------------
-- 2) Role helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION gift_card_can_complete_sale(p_role text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_role IN ('cashier', 'super_admin');
$$;

CREATE OR REPLACE FUNCTION gift_card_can_request_sale(p_role text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_role IN ('owner', 'partner', 'admin');
$$;

-- ---------------------------------------------------------------------------
-- 3) request_gift_card_sale (non-cashier staff → cashier queue)
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
BEGIN
  SELECT id, role INTO v_caller_id, v_caller_role
  FROM profiles WHERE phone = caller_phone;

  IF NOT gift_card_can_request_sale(v_caller_role) THEN
    RAISE EXCEPTION 'Not authorized. Send gift card sales to the cashier for payment collection.';
  END IF;

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

  INSERT INTO gift_card_sale_requests (
    buyer_id, owner_id, amount,
    recipient_name, gift_message, notes, requested_by_id
  ) VALUES (
    v_buyer.id, v_owner_id, v_amount,
    NULLIF(trim(p_recipient_name), ''), NULLIF(trim(p_gift_message), ''), NULLIF(trim(p_notes), ''), v_caller_id
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
        COALESCE(v_owner.full_name, v_buyer.full_name)
      ),
      'gift_card_sale_pending',
      v_request_id,
      jsonb_build_object(
        'request_id', v_request_id,
        'amount', v_amount,
        'buyer_name', v_buyer.full_name,
        'owner_name', COALESCE(v_owner.full_name, v_buyer.full_name)
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'buyer_name', v_buyer.full_name,
    'owner_name', COALESCE(v_owner.full_name, v_buyer.full_name),
    'amount', v_amount,
    'status', 'pending'
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) get_gift_card_sale_requests
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
  FROM profiles WHERE phone = caller_phone;

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
        'owner_name', op.full_name,
        'owner_phone', op.phone,
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
        'owner_name', op.full_name,
        'owner_phone', op.phone,
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
-- 5) cancel_gift_card_sale_request
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION cancel_gift_card_sale_request(
  caller_phone text,
  p_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_caller_role text;
  v_request gift_card_sale_requests%ROWTYPE;
BEGIN
  SELECT id, role INTO v_caller_id, v_caller_role
  FROM profiles WHERE phone = caller_phone;

  SELECT * INTO v_request
  FROM gift_card_sale_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Request not found.';
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Only pending requests can be cancelled.';
  END IF;

  IF NOT (
    v_request.requested_by_id = v_caller_id
    OR gift_card_is_management_role(v_caller_role)
    OR v_caller_role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized to cancel this request.';
  END IF;

  UPDATE gift_card_sale_requests SET
    status = 'cancelled',
    cancelled_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true, 'request_id', p_request_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) purchase_gift_card — only cashier/super_admin; optional request completion
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
    purchased_by_id, owner_id, recipient_name, gift_message, sold_by_id
  ) VALUES (
    v_code, v_amount, v_amount, 'active',
    v_buyer.id, v_owner_id, v_recipient_name, v_gift_message, v_caller_id
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
      format('Your $%s gift card is ready. Code: %s', trim(to_char(v_amount, '999990.99')), v_code),
      'gift_card_purchased',
      v_card.id,
      jsonb_build_object('gift_card_id', v_card.id, 'code', v_code, 'amount', v_amount)
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
      format('You received a $%s gift card! Code: %s', trim(to_char(v_amount, '999990.99')), v_code),
      'gift_card_received',
      v_card.id,
      jsonb_build_object('gift_card_id', v_card.id, 'code', v_code, 'amount', v_amount, 'gift_message', v_gift_message)
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
-- 7) Grants
-- ---------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION request_gift_card_sale(text, text, numeric, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_gift_card_sale_requests(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cancel_gift_card_sale_request(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION purchase_gift_card(text, text, numeric, text, text, text, text, text, uuid) TO anon, authenticated;
