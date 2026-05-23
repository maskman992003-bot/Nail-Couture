-- Run this in Supabase SQL Editor

-- FK CONSTRAINTS
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- VIEWS
SELECT table_name, view_definition
FROM information_schema.views
WHERE table_schema = 'public';

-- CHECK CONSTRAINTS
SELECT
  tc.table_name,
  tc.constraint_name,
  pgc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints pgc
  ON tc.constraint_name = pgc.constraint_name
WHERE tc.constraint_type = 'CHECK' AND tc.table_schema = 'public'
AND tc.constraint_name NOT LIKE '%_not_null';

-- DISTINCT STATUS VALUES
SELECT DISTINCT status, COUNT(*) FROM appointments GROUP BY status;
