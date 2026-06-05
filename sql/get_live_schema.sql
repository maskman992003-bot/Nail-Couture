-- ============================================================
-- NAIL COUTURE — LIVE SCHEMA EXPORT
-- ============================================================
-- Run this file in the Supabase SQL Editor.
-- Copy ALL result sets and paste them back to the agent
-- (or save as sql/schema_dump_results.sql in the repo).
--
-- Tip: Run one section at a time if the editor truncates output.
-- ============================================================

-- ============================================================
-- 1) TABLES + COLUMNS
-- ============================================================
SELECT
  table_name,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- ============================================================
-- 2) PRIMARY KEYS
-- ============================================================
SELECT
  tc.table_name,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'PRIMARY KEY'
ORDER BY tc.table_name;

-- ============================================================
-- 3) FOREIGN KEYS
-- ============================================================
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================================
-- 4) UNIQUE CONSTRAINTS
-- ============================================================
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================================
-- 5) CHECK CONSTRAINTS
-- ============================================================
SELECT
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================================
-- 6) ENUM TYPES
-- ============================================================
SELECT
  t.typname,
  array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname;

-- ============================================================
-- 7) RLS — enabled tables
-- ============================================================
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;

-- ============================================================
-- 8) RLS POLICIES
-- ============================================================
SELECT
  tablename,
  policyname,
  permissive,
  roles::text,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================
-- 9) RPCs / FUNCTIONS (public schema)
-- ============================================================
SELECT
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS returns
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;

-- ============================================================
-- 10) TRIGGERS
-- ============================================================
SELECT
  event_object_table,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================================
-- 11) PROFILE-RELATED TABLES — focused column list
--     (tables most relevant to customer profile work)
-- ============================================================
SELECT
  table_name,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles',
    'appointments',
    'payment_transactions',
    'customer_waivers',
    'notifications',
    'services',
    'inventory_logs',
    'appointment_status_history'
  )
ORDER BY table_name, ordinal_position;

-- ============================================================
-- 12) SAMPLE ROW SHAPE (optional — confirms live column names)
--     Remove or comment out if you prefer not to share sample data.
-- ============================================================
SELECT 'profiles' AS table_name, row_to_json(t) AS sample_row
FROM (SELECT * FROM profiles LIMIT 1) t;

SELECT 'appointments' AS table_name, row_to_json(t) AS sample_row
FROM (SELECT * FROM appointments LIMIT 1) t;

SELECT 'payment_transactions' AS table_name, row_to_json(t) AS sample_row
FROM (SELECT * FROM payment_transactions LIMIT 1) t;

SELECT 'customer_waivers' AS table_name, row_to_json(t) AS sample_row
FROM (SELECT * FROM customer_waivers LIMIT 1) t;

SELECT 'notifications' AS table_name, row_to_json(t) AS sample_row
FROM (SELECT * FROM notifications LIMIT 1) t;
