-- Migration 086: Fix get_gift_card_sale_requests — "row" is a reserved SQL keyword
-- Run once in Supabase SQL Editor if 085 was already applied.

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

GRANT EXECUTE ON FUNCTION get_gift_card_sale_requests(text, text) TO anon, authenticated;
