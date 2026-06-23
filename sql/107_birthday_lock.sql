-- Migration 107: Lock customer birthdays after first set + harden birthday wish sender
-- Run after 106_birthday_wishes.sql

-- ============================================================
-- 1) birthday_locked_at on profiles
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS birthday_locked_at timestamptz;

COMMENT ON COLUMN profiles.birthday_locked_at IS
  'Set when birthday is first saved; blocks customer edits unless staff overrides.';

UPDATE profiles
SET birthday_locked_at = COALESCE(created_at, now())
WHERE birthday IS NOT NULL
  AND trim(birthday) <> ''
  AND birthday_locked_at IS NULL;

-- ============================================================
-- 2) Audit column on wish log
-- ============================================================
ALTER TABLE birthday_wish_log
  ADD COLUMN IF NOT EXISTS birthday_mmdd text;

-- ============================================================
-- 3) Trigger: lock on first set, block customer changes
-- ============================================================
CREATE OR REPLACE FUNCTION enforce_birthday_lock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_set boolean;
  v_new_set boolean;
  v_override boolean;
BEGIN
  v_old_set := OLD.birthday IS NOT NULL AND trim(OLD.birthday) <> '';
  v_new_set := NEW.birthday IS NOT NULL AND trim(NEW.birthday) <> '';

  IF TG_OP = 'INSERT' THEN
    IF v_new_set AND NEW.birthday_locked_at IS NULL THEN
      NEW.birthday_locked_at := now();
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Stamp lock on first set
    IF NOT v_old_set AND v_new_set AND NEW.birthday_locked_at IS NULL THEN
      NEW.birthday_locked_at := now();
    END IF;

    -- Block changes to an already-set birthday unless staff override is active
    IF v_old_set AND (
      NOT v_new_set
      OR NEW.birthday IS DISTINCT FROM OLD.birthday
    ) THEN
      v_override := current_setting('nail_couture.birthday_override', true) = 'true';
      IF NOT v_override THEN
        RAISE EXCEPTION 'Birthday cannot be changed. Contact the salon to update your birthday.';
      END IF;
      IF v_new_set THEN
        NEW.birthday_locked_at := now();
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_birthday_lock ON profiles;
CREATE TRIGGER trg_enforce_birthday_lock
  BEFORE INSERT OR UPDATE OF birthday, birthday_locked_at ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_birthday_lock();

-- ============================================================
-- 4) Staff RPC to update locked birthdays
-- ============================================================
CREATE OR REPLACE FUNCTION staff_update_customer_birthday(
  caller_phone text,
  profile_id uuid,
  new_birthday text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  v_trimmed text;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN (
    'super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician'
  ) THEN
    RAISE EXCEPTION 'Not authorized. Only staff can update customer birthdays.';
  END IF;

  v_trimmed := NULLIF(trim(new_birthday), '');

  IF v_trimmed IS NOT NULL AND v_trimmed !~ '^\d{2}-\d{2}$' THEN
    RAISE EXCEPTION 'Birthday must be in MM-DD format.';
  END IF;

  PERFORM set_config('nail_couture.birthday_override', 'true', true);

  UPDATE profiles
  SET
    birthday = v_trimmed,
    birthday_locked_at = CASE WHEN v_trimmed IS NOT NULL THEN now() ELSE NULL END
  WHERE id = profile_id
    AND role = 'customer';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer profile not found.';
  END IF;

  RETURN jsonb_build_object('success', true, 'birthday', v_trimmed);
END;
$$;

-- ============================================================
-- 5) Hardened send_birthday_wishes — claim-before-award + 30-day rule
-- ============================================================
CREATE OR REPLACE FUNCTION send_birthday_wishes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer RECORD;
  v_count integer := 0;
  v_points_total integer := 0;
  v_points integer;
  v_first_name text;
  v_title text;
  v_body text;
  v_wish_year integer;
  v_today_mmdd text;
  v_claimed_id uuid;
BEGIN
  IF NOT is_birthday_wishes_enabled() THEN
    RETURN jsonb_build_object(
      'success', true,
      'wishes_sent', 0,
      'points_awarded_total', 0,
      'skipped', true,
      'reason', 'birthday_wishes_disabled'
    );
  END IF;

  v_wish_year := EXTRACT(YEAR FROM now() AT TIME ZONE 'America/New_York')::integer;
  v_today_mmdd := to_char(now() AT TIME ZONE 'America/New_York', 'MM-DD');

  FOR v_customer IN
    SELECT id, full_name, loyalty_tier, birthday
    FROM profiles
    WHERE role = 'customer'
      AND birthday IS NOT NULL
      AND trim(birthday) <> ''
      AND birthday = v_today_mmdd
      AND birthday_locked_at IS NOT NULL
      AND birthday_locked_at <= now() - interval '30 days'
  LOOP
    v_points := get_birthday_bonus_points(v_customer.loyalty_tier);

    INSERT INTO birthday_wish_log (profile_id, wish_year, points_awarded, birthday_mmdd)
    VALUES (v_customer.id, v_wish_year, v_points, v_customer.birthday)
    ON CONFLICT (profile_id, wish_year) DO NOTHING
    RETURNING profile_id INTO v_claimed_id;

    IF v_claimed_id IS NULL THEN
      CONTINUE;
    END IF;

    IF v_points > 0 THEN
      PERFORM award_loyalty_points(
        v_customer.id,
        v_points,
        'Happy birthday from Nail Couture!',
        'birthday_bonus',
        NULL,
        v_customer.loyalty_tier,
        true
      );
      v_points_total := v_points_total + v_points;
    END IF;

    v_first_name := split_part(trim(v_customer.full_name), ' ', 1);
    IF v_first_name = '' THEN
      v_first_name := 'friend';
    END IF;

    v_title := format('Happy Birthday, %s!', v_first_name);
    v_body := 'Wishing you a wonderful birthday from all of us at Nail Couture! We hope to celebrate with you at the salon soon.';

    IF v_points > 0 THEN
      v_body := v_body || format(
        ' We''ve added %s bonus points to your Vault as our birthday gift to you.',
        v_points
      );
    END IF;

    PERFORM create_notification(
      v_customer.id,
      v_title,
      v_body,
      'birthday_wish',
      NULL,
      jsonb_build_object('points_awarded', v_points, 'wish_year', v_wish_year)
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'wishes_sent', v_count,
    'points_awarded_total', v_points_total,
    'wish_date', v_today_mmdd,
    'wish_year', v_wish_year
  );
END;
$$;
