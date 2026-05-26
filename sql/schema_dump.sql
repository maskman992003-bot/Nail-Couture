-- Run this in Supabase SQL Editor, then paste ALL the results back here

-- =============================================
-- 1. TABLES & COLUMNS
-- =============================================
SELECT
  t.table_name,
  json_agg(json_build_object(
    'column', c.column_name,
    'type', c.data_type,
    'udt', c.udt_name,
    'nullable', c.is_nullable,
    'default', c.column_default
  ) ORDER BY c.ordinal_position) AS columns
FROM information_schema.tables t
JOIN information_schema.columns c ON c.table_name = t.table_name AND c.table_schema = t.table_schema
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name
ORDER BY t.table_name;

-- =============================================
-- 2. FOREIGN KEY CONSTRAINTS (WITH NAMES)
-- =============================================
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- =============================================
-- 3. CHECK CONSTRAINTS
-- =============================================
SELECT
  tc.constraint_name,
  tc.table_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name AND tc.table_schema = cc.constraint_schema
WHERE tc.constraint_type = 'CHECK' AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- =============================================
-- 4. TRIGGERS
-- =============================================
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- =============================================
-- 5. RLS POLICIES
-- =============================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles::text,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =============================================
-- 6. ENUM TYPES
-- =============================================
SELECT
  t.typname,
  array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY t.typname;

-- =============================================
-- 7. FUNCTIONS / RPCs (names + args only)
-- =============================================
SELECT
  proname AS function_name,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY proname;

-- =============================================
-- 8. SAMPLE DATA (first 3 rows each key table)
-- =============================================
SELECT 'appointments' AS tbl, json_agg(row_to_json(t)) AS data FROM (SELECT * FROM appointments LIMIT 3) t;
SELECT 'profiles' AS tbl, json_agg(row_to_json(t)) AS data FROM (SELECT * FROM profiles LIMIT 3) t;
SELECT 'services' AS tbl, json_agg(row_to_json(t)) AS data FROM (SELECT * FROM services LIMIT 3) t;
SELECT 'shifts' AS tbl, json_agg(row_to_json(t)) AS data FROM (SELECT * FROM shifts LIMIT 3) t;
SELECT 'inventory' AS tbl, json_agg(row_to_json(t)) AS data FROM (SELECT * FROM inventory LIMIT 3) t;
