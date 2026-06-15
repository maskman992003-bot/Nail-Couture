-- Migration 091: Cashier gift card purchase history for My Transactions
-- Run once in Supabase SQL Editor after 090_gift_card_expiry_one_year.sql

CREATE OR REPLACE FUNCTION get_cashier_gift_card_purchases(
  caller_phone text,
  p_since timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_caller_role text;
  v_since timestamptz;
  v_purchases jsonb;
BEGIN
  SELECT id, role INTO v_caller_id, v_caller_role
  FROM profiles WHERE phone = caller_phone;

  IF v_caller_id IS NULL OR NOT gift_card_can_complete_sale(v_caller_role) THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  v_since := COALESCE(p_since, date_trunc('day', now() AT TIME ZONE 'UTC'));

  SELECT COALESCE(jsonb_agg(sub.row ORDER BY sub.sort_at DESC), '[]'::jsonb)
  INTO v_purchases
  FROM (
    SELECT jsonb_build_object(
      'id', gp.id,
      'amount', gp.amount,
      'payment_method', gp.payment_method,
      'created_at', gp.created_at,
      'notes', gp.notes,
      'gift_card', jsonb_build_object(
        'id', gc.id,
        'code', gc.code,
        'balance', gc.balance,
        'status', gc.status,
        'recipient_name', gc.recipient_name,
        'expires_at', gc.expires_at,
        'owner', jsonb_build_object('full_name', op.full_name, 'phone', op.phone),
        'buyer', jsonb_build_object('full_name', bp.full_name, 'phone', bp.phone)
      )
    ) AS row,
    gp.created_at AS sort_at
    FROM gift_card_purchases gp
    JOIN gift_cards gc ON gc.id = gp.gift_card_id
    JOIN profiles bp ON bp.id = gc.purchased_by_id
    JOIN profiles op ON op.id = gc.owner_id
    WHERE gp.cashier_id = v_caller_id
      AND gp.created_at >= v_since
  ) sub;

  RETURN jsonb_build_object('success', true, 'purchases', v_purchases);
END;
$$;

GRANT EXECUTE ON FUNCTION get_cashier_gift_card_purchases(text, timestamptz) TO anon, authenticated;
