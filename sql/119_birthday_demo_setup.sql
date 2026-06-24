-- Migration 119: Birthday demo setup for test customer (phone 4444444444)
-- Run in Supabase SQL Editor after 107_birthday_lock.sql
--
-- Customer: asd · 4444444444 · id 85c5ee1d-9c51-42c6-a6de-cb07403a332d (Diamond)
-- Profile lock + birthday are pre-aligned via API; this script enables wishes and fires the send.

DO $$
DECLARE
  v_demo_phone_digits text := '4444444444';
  v_customer_id uuid;
  v_customer_name text;
  v_wish_year integer;
  v_today_mmdd text;
  v_result jsonb;
BEGIN
  v_wish_year := EXTRACT(YEAR FROM now() AT TIME ZONE 'America/New_York')::integer;
  v_today_mmdd := to_char(now() AT TIME ZONE 'America/New_York', 'MM-DD');

  SELECT id, full_name
  INTO v_customer_id, v_customer_name
  FROM profiles
  WHERE role = 'customer'
    AND regexp_replace(COALESCE(phone, ''), '\D', '', 'g') IN (
      v_demo_phone_digits,
      '1' || v_demo_phone_digits
    )
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION
      'No customer profile found for phone %. Register the account first.',
      v_demo_phone_digits;
  END IF;

  -- Step 1: set birthday to today (staff override — trigger stamps lock to now())
  PERFORM set_config('nail_couture.birthday_override', 'true', true);
  UPDATE profiles
  SET birthday = v_today_mmdd
  WHERE id = v_customer_id;

  -- Step 2: backdate lock in a separate update (birthday unchanged — trigger leaves lock alone)
  UPDATE profiles
  SET birthday_locked_at = now() - interval '31 days'
  WHERE id = v_customer_id;

  DELETE FROM birthday_wish_log
  WHERE profile_id = v_customer_id
    AND wish_year = v_wish_year;

  UPDATE notification_settings
  SET birthday_wishes_enabled = true, updated_at = now()
  WHERE id = 1;

  v_result := send_birthday_wishes();

  RAISE NOTICE 'Demo customer: % (%)', v_customer_name, v_customer_id;
  RAISE NOTICE 'Birthday MM-DD: % | Result: %', v_today_mmdd, v_result;
END $$;

-- Verification
SELECT
  p.id,
  p.full_name,
  p.phone,
  p.loyalty_tier,
  p.birthday,
  p.birthday_locked_at,
  p.loyalty_points,
  birthday_locked_at <= now() - interval '30 days' AS lock_ok,
  birthday = to_char(now() AT TIME ZONE 'America/New_York', 'MM-DD') AS birthday_is_today,
  (SELECT birthday_wishes_enabled FROM notification_settings WHERE id = 1) AS wishes_enabled
FROM profiles p
WHERE regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g') IN ('4444444444', '14444444444')
  AND p.role = 'customer'
ORDER BY p.created_at DESC
LIMIT 1;

SELECT * FROM birthday_wish_log b
WHERE b.profile_id = (
  SELECT id FROM profiles
  WHERE regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = '4444444444'
    AND role = 'customer' LIMIT 1
);

SELECT id, title, body, type, is_read, created_at
FROM notifications
WHERE recipient_id = (
  SELECT id FROM profiles
  WHERE regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = '4444444444'
    AND role = 'customer' LIMIT 1
)
AND type = 'birthday_wish'
ORDER BY created_at DESC LIMIT 1;

SELECT id, points, description, transaction_type, balance_after, created_at
FROM loyalty_transactions
WHERE profile_id = (
  SELECT id FROM profiles
  WHERE regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = '4444444444'
    AND role = 'customer' LIMIT 1
)
AND transaction_type = 'birthday_bonus'
ORDER BY created_at DESC LIMIT 1;
