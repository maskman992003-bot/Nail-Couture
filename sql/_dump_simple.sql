-- Run this in Supabase SQL Editor
-- It returns ONE result set with the full schema

SELECT
  'TABLE' AS obj_type,
  c.table_name AS obj_name,
  c.column_name AS detail1,
  c.data_type AS detail2,
  c.is_nullable AS detail3,
  c.column_default AS detail4,
  '' AS detail5
FROM information_schema.columns c
WHERE c.table_schema = 'public'
ORDER BY c.table_name, c.ordinal_position;
