-- Migration 129: Enable Supabase Realtime on appointments
-- Run after sql/128_lobby_auto_assign_toggle.sql
--
-- Admin Lobby (Floor Manager) and Cashier Lobby subscribe to appointments
-- changes for live queue updates on check-in, assignment, and checkout.

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
