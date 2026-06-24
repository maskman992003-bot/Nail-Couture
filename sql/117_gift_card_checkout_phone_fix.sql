-- Migration 117: Gift card checkout phone lookup fix (re-run if 116 was already applied)
-- Run once in Supabase SQL Editor after 116_gift_card_checkout_verify.sql

CREATE OR REPLACE FUNCTION gift_card_caller_role(p_caller_phone text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT role
  FROM profiles
  WHERE regexp_replace(COALESCE(phone, ''), '\D', '', 'g')
    = regexp_replace(COALESCE(p_caller_phone, ''), '\D', '', 'g')
  LIMIT 1;
$$;

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
    AND NOT gift_card_is_expired(gc.expires_at, gc.status);

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
  v_gift_card jsonb;
BEGIN
  v_caller_role := gift_card_caller_role(caller_phone);
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
    v_gift_card := gift_card_row_to_json(v_card) || jsonb_build_object('owner_name', v_owner_name);
    IF v_caller_role != 'super_admin' THEN
      v_gift_card := v_gift_card - 'code' || jsonb_build_object(
        'code_display', gift_card_checkout_mask(v_card.code)
      );
    END IF;
    RETURN jsonb_build_object(
      'success', false,
      'error', format('This gift card expired on %s.', to_char(v_card.expires_at, 'Mon DD, YYYY')),
      'gift_card', v_gift_card
    );
  END IF;

  v_gift_card := gift_card_row_to_json(v_card) || jsonb_build_object('owner_name', v_owner_name);
  IF v_caller_role != 'super_admin' THEN
    v_gift_card := v_gift_card - 'code' || jsonb_build_object(
      'code_display', gift_card_checkout_mask(v_card.code)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'gift_card', v_gift_card
  );
END;
$$;

GRANT EXECUTE ON FUNCTION gift_card_caller_role(text) TO anon, authenticated;
