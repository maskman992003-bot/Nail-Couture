-- Migration 058: Customer fitness assessment history
-- Run once in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS fitness_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  health_status JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fitness_assessments_profile_created
  ON fitness_assessments (profile_id, created_at DESC);

COMMENT ON TABLE fitness_assessments IS 'Customer fitness assessment snapshots (inputs + calculated metrics)';

ALTER TABLE fitness_assessments ENABLE ROW LEVEL SECURITY;

-- Direct table access is denied. Run sql/061_assessment_security.sql for RPC access.
