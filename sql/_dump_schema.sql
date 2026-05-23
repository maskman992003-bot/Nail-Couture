-- Run this in Supabase SQL Editor to dump full database schema
-- Copy the entire output and share it

-- 1. ALL TABLES
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. ALL COLUMNS (table, column, type, nullable, default)
SELECT table_name, column_name, data_type, is_nullable, column_default, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 3. ALL FOREIGN KEYS
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 4. ALL VIEWS
SELECT table_name, view_definition
FROM information_schema.views
WHERE table_schema = 'public';

-- 5. ALL CHECK CONSTRAINTS
SELECT
  tc.table_name,
  tc.constraint_name,
  pgc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints pgc
  ON tc.constraint_name = pgc.constraint_name
WHERE tc.constraint_type = 'CHECK' AND tc.table_schema = 'public';

-- 6. ALL INDEXES
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 7. DISTINCT STATUS VALUES IN APPOINTMENTS
SELECT DISTINCT status, COUNT(*) FROM appointments GROUP BY status;

-- 8. DISTINCT BOOKING_TYPE/SOURCE VALUES IN APPOINTMENTS
SELECT DISTINCT source, COUNT(*) FROM appointments GROUP BY source;
