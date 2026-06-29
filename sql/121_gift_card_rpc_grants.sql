-- Migration 121: Gift card RPC grants + schema reload (run after 120 if sales still fail)
-- Safe to re-run. Use when the app shows "gift card service unavailable".

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
