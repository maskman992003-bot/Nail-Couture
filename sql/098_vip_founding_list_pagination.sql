-- Migration 098: VIP Founding List — today's signups with pagination
-- Run once in Supabase SQL Editor after 097_vip_founding_list.sql

DROP FUNCTION IF EXISTS get_vip_founding_list(text);

CREATE OR REPLACE FUNCTION get_vip_founding_list(
  caller_phone text,
  p_page int DEFAULT 1,
  p_limit int DEFAULT 10,
  p_today_only boolean DEFAULT true,
  p_fetch_all boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  signups jsonb;
  total_count int;
  safe_page int;
  safe_limit int;
  safe_offset int;
  total_pages int;
  day_start timestamptz;
  day_end timestamptz;
BEGIN
  IF caller_phone IS NULL OR trim(caller_phone) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT role INTO caller_role
  FROM profiles
  WHERE phone = caller_phone;

  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  safe_page := GREATEST(1, COALESCE(p_page, 1));
  safe_limit := GREATEST(1, LEAST(COALESCE(p_limit, 10), CASE WHEN COALESCE(p_fetch_all, false) THEN 10000 ELSE 10 END));
  safe_offset := (safe_page - 1) * safe_limit;

  IF COALESCE(p_today_only, true) THEN
    day_start := (date_trunc('day', now() AT TIME ZONE 'America/Chicago') AT TIME ZONE 'America/Chicago');
    day_end := day_start + interval '1 day';
  END IF;

  SELECT count(*)::int
  INTO total_count
  FROM vip_founding_list v
  WHERE NOT COALESCE(p_today_only, true)
     OR (v.created_at >= day_start AND v.created_at < day_end);

  IF COALESCE(p_fetch_all, false) THEN
    safe_offset := 0;
    safe_limit := LEAST(total_count, 10000);
    safe_page := 1;
  END IF;

  total_pages := CASE
    WHEN total_count = 0 THEN 0
    ELSE CEIL(total_count::numeric / LEAST(COALESCE(p_limit, 10), 10))::int
  END;

  IF COALESCE(p_fetch_all, false) THEN
    total_pages := CASE WHEN total_count = 0 THEN 0 ELSE 1 END;
  END IF;

  IF safe_page > GREATEST(total_pages, 1) AND total_count > 0 THEN
    safe_page := GREATEST(total_pages, 1);
    safe_offset := (safe_page - 1) * LEAST(COALESCE(p_limit, 10), 10);
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(v)::jsonb ORDER BY v.created_at DESC), '[]'::jsonb)
  INTO signups
  FROM (
    SELECT id, email, source, created_at
    FROM vip_founding_list v
    WHERE NOT COALESCE(p_today_only, true)
       OR (v.created_at >= day_start AND v.created_at < day_end)
    ORDER BY created_at DESC
    LIMIT safe_limit
    OFFSET safe_offset
  ) v;

  RETURN jsonb_build_object(
    'success', true,
    'signups', signups,
    'total', total_count,
    'page', safe_page,
    'limit', LEAST(COALESCE(p_limit, 10), 10),
    'total_pages', total_pages,
    'today_only', COALESCE(p_today_only, true)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_vip_founding_list(text, int, int, boolean, boolean) TO anon, authenticated;
