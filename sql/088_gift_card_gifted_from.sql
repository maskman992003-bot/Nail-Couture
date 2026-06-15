-- Migration 088: Expose who gifted a gift card (purchaser or transfer sender)
-- Run once in Supabase SQL Editor after 087_gift_card_expiration.sql

CREATE OR REPLACE FUNCTION gift_card_gifted_from_name(p_card gift_cards)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT p_from.full_name
      FROM gift_card_transactions gct
      JOIN profiles p_from ON p_from.id = gct.from_owner_id
      WHERE gct.gift_card_id = p_card.id
        AND gct.transaction_type = 'transfer'
        AND gct.to_owner_id = p_card.owner_id
      ORDER BY gct.created_at DESC
      LIMIT 1
    ),
    (
      SELECT pp.full_name
      FROM profiles pp
      WHERE pp.id = p_card.purchased_by_id
        AND p_card.purchased_by_id IS DISTINCT FROM p_card.owner_id
    )
  );
$$;

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
      'purchased_by_name', pp.full_name,
      'gifted_from_name', gift_card_gifted_from_name(gc.*)
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
    AND gc.owner_id != v_profile.id;

  RETURN jsonb_build_object(
    'success', true,
    'owned', v_owned,
    'purchased_for_others', v_purchased
  );
END;
$$;
