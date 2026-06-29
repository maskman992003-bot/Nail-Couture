-- Migration 123: Fix claim token generation without pgcrypto
-- Run once in Supabase SQL Editor if purchase_gift_card fails with:
--   function gen_random_bytes(integer) does not exist

CREATE OR REPLACE FUNCTION gift_card_generate_claim_token()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
$$;

GRANT EXECUTE ON FUNCTION gift_card_generate_claim_token() TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
