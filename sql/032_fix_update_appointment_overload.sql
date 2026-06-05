-- Migration 032: Fix duplicate update_appointment overload
-- Migration 030 added p_metadata but left the 029 signature in place.
-- RPC calls with only some optional params then fail with:
-- "Could not choose the best candidate function between ..."

DROP FUNCTION IF EXISTS update_appointment(
  TEXT, UUID, TEXT, BIGINT, TEXT, NUMERIC, TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT
);
