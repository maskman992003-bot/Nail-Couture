-- Migration 059: Customer nail health assessment history
-- Run once in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS nail_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  health_status JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nail_assessments_profile_created
  ON nail_assessments (profile_id, created_at DESC);

COMMENT ON TABLE nail_assessments IS 'Customer nail health assessment snapshots (inputs + calculated diagnostics)';

ALTER TABLE nail_assessments ENABLE ROW LEVEL SECURITY;

-- Direct table access is denied. Run sql/061_assessment_security.sql for RPC access.
