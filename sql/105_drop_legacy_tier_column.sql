-- Migration 105: Remove legacy profiles.tier (Silver/Gold/Platinum/Diamond)
-- Run once in Supabase SQL Editor after 104_rolling_loyalty_tiers.sql
--
-- Tier source of truth: profiles.loyalty_tier, profiles.loyalty_tier_earned
-- (rolling spend + FM floors via compute_loyalty_tier / get_wallet_snapshot)

ALTER TABLE profiles DROP COLUMN IF EXISTS tier;
