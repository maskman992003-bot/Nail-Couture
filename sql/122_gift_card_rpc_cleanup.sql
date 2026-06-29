-- Migration 122: Remove legacy purchase_gift_card overload + refresh PostgREST schema
-- Run in Supabase SQL Editor when the app cannot call purchase_gift_card (PGRST202/PGRST203).
--
-- Verify before/after:
-- SELECT pg_get_function_identity_arguments(p.oid)
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.proname = 'purchase_gift_card';

-- 084 created an 8-argument version; 085+ use 9 arguments with p_request_id.
-- If both exist, PostgREST cannot pick a candidate and the app shows a migration error.
DROP FUNCTION IF EXISTS purchase_gift_card(text, text, numeric, text, text, text, text, text);

GRANT EXECUTE ON FUNCTION request_gift_card_sale(text, text, numeric, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION purchase_gift_card(text, text, numeric, text, text, text, text, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_gift_card_sale_requests(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION transfer_gift_card(text, uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_my_gift_cards(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_checkout_gift_cards(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_gift_card_for_checkout(text, uuid, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_gift_card_claim_preview(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_pending_gift_cards(uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
