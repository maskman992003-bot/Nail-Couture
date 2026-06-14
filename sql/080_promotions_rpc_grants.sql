-- Migration 080: Grant execute on promotion RPCs to anon/authenticated
-- Run once in Supabase SQL Editor after 079_promotion_local_suppression.sql

GRANT EXECUTE ON FUNCTION list_active_promotions(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION list_promotions_admin(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_promotion(
  text, text, text, text, text, text, text, text, text, text, text,
  text[], text, timestamptz, timestamptz, boolean, int, boolean, boolean,
  int, boolean, boolean, uuid
) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION set_promotion_active(text, uuid, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_promotion(text, uuid) TO anon, authenticated;
