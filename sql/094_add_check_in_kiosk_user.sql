-- Migration 094 (step 1 of 2): Add check_in to user_role enum
-- Run once in Supabase SQL Editor after 093_add_theme_03.sql
--
-- IMPORTANT: Run this file ALONE first and wait for success.
-- PostgreSQL requires the new enum value to be committed before it can be used.
-- Then run 095_seed_check_in_kiosk_user.sql

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'check_in';
