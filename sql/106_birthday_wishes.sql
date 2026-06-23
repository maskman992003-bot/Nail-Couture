-- Migration 106: Automated birthday wishes + tier-based bonus points
-- Run after 105_drop_legacy_tier_column.sql

-- ============================================================
-- 1) Dedup log — one wish per customer per calendar year
-- ============================================================
CREATE TABLE IF NOT EXISTS birthday_wish_log (
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wish_year integer NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  points_awarded integer NOT NULL DEFAULT 0,
  PRIMARY KEY (profile_id, wish_year)
);

COMMENT ON TABLE birthday_wish_log IS
  'Tracks birthday wishes sent per customer per year to prevent duplicates.';

-- ============================================================
-- 2) Settings toggle
-- ============================================================
ALTER TABLE notification_settings
  ADD COLUMN IF NOT EXISTS birthday_wishes_enabled boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION is_birthday_wishes_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT birthday_wishes_enabled FROM notification_settings WHERE id = 1),
    false
  );
$$;

-- ============================================================
-- 3) Tier-based birthday bonus points (100 pts = $5)
-- ============================================================
CREATE OR REPLACE FUNCTION get_birthday_bonus_points(p_tier text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE COALESCE(p_tier, 'regular_customer')
    WHEN 'pearl' THEN 200
    WHEN 'atelier' THEN 300
    WHEN 'diamond_couture' THEN 500
    ELSE 0
  END;
$$;

-- ============================================================
-- 4) award_loyalty_points — add p_suppress_notification flag
-- ============================================================
DROP FUNCTION IF EXISTS award_loyalty_points(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS award_loyalty_points(uuid, integer, text) CASCADE;
DROP FUNCTION IF EXISTS award_loyalty_points(uuid, integer, text, text) CASCADE;
DROP FUNCTION IF EXISTS award_loyalty_points(uuid, integer, text, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS award_loyalty_points(uuid, integer, text, text, uuid, text) CASCADE;

CREATE OR REPLACE FUNCTION award_loyalty_points(
  p_profile_id uuid,
  p_points integer,
  p_description text DEFAULT 'Points earned',
  p_type text DEFAULT 'earn',
  p_appointment_id uuid DEFAULT NULL,
  p_tier_at_earn text DEFAULT NULL,
  p_suppress_notification boolean DEFAULT false
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new integer;
  v_type text;
  v_metadata jsonb;
  v_notif_type text;
  v_tier text;
BEGIN
  IF p_points = 0 THEN
    PERFORM expire_loyalty_points(p_profile_id);
    RETURN sync_loyalty_points_from_lots(p_profile_id);
  END IF;

  PERFORM expire_loyalty_points(p_profile_id);

  v_type := CASE
    WHEN p_type IN ('earn', 'referral_bonus', 'signup_bonus', 'birthday_bonus', 'adjustment') THEN p_type
    ELSE 'earn'
  END;

  v_metadata := CASE
    WHEN p_appointment_id IS NOT NULL THEN jsonb_build_object('appointment_id', p_appointment_id)
    ELSE '{}'::jsonb
  END;

  IF p_points > 0 THEN
    SELECT COALESCE(p_tier_at_earn, loyalty_tier, 'regular_customer')
    INTO v_tier
    FROM profiles
    WHERE id = p_profile_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Profile not found: %', p_profile_id;
    END IF;

    INSERT INTO loyalty_point_lots (
      profile_id, points_original, points_remaining, expires_at,
      tier_at_earn, source_type, appointment_id
    ) VALUES (
      p_profile_id,
      p_points,
      p_points,
      now() + get_point_expiry_interval(v_tier),
      v_tier,
      v_type,
      p_appointment_id
    );
  ELSE
    PERFORM deduct_loyalty_points_fifo(p_profile_id, ABS(p_points), p_description);
    RETURN sync_loyalty_points_from_lots(p_profile_id);
  END IF;

  v_new := sync_loyalty_points_from_lots(p_profile_id);

  INSERT INTO loyalty_transactions (
    profile_id, transaction_type, points, balance_after, description, metadata
  ) VALUES (
    p_profile_id, v_type, p_points, v_new, p_description, v_metadata
  );

  IF NOT p_suppress_notification AND v_type IN ('referral_bonus', 'signup_bonus', 'birthday_bonus') THEN
    v_notif_type := CASE v_type
      WHEN 'referral_bonus' THEN 'referral_bonus'
      WHEN 'birthday_bonus' THEN 'loyalty_earned'
      ELSE 'loyalty_earned'
    END;
    PERFORM create_notification(
      p_profile_id,
      CASE v_type WHEN 'referral_bonus' THEN 'Referral bonus' ELSE 'Points earned' END,
      format('+%s points — %s', p_points, p_description),
      v_notif_type,
      p_appointment_id,
      jsonb_build_object('points', p_points)
    );
  END IF;

  RETURN v_new;
END;
$$;

-- ============================================================
-- 5) External messaging — add birthday_wish + promotional routing
-- ============================================================
CREATE OR REPLACE FUNCTION enqueue_external_message_for_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_channel text;
  v_destination text;
  v_external_types text[] := ARRAY[
    'booking_confirmed', 'appointment_updated', 'appointment_cancelled',
    'appointment_reminder', 'checked_in', 'technician_assigned',
    'payment_receipt', 'appointment_missed', 'loyalty_earned', 'birthday_wish'
  ];
BEGIN
  IF NOT is_external_messaging_enabled() THEN
    RETURN NEW;
  END IF;

  IF NEW.type IS NULL OR NOT (NEW.type = ANY(v_external_types)) THEN
    RETURN NEW;
  END IF;

  SELECT phone, email, sms_reminders, email_promotions, preferred_contact, role
  INTO v_profile
  FROM profiles
  WHERE id = NEW.recipient_id;

  IF v_profile.role IS DISTINCT FROM 'customer' THEN
    RETURN NEW;
  END IF;

  v_channel := NULL;
  v_destination := NULL;

  IF NEW.type = 'birthday_wish' THEN
    IF NOT COALESCE(v_profile.email_promotions, true) THEN
      RETURN NEW;
    END IF;

    IF v_profile.preferred_contact = 'sms' AND v_profile.phone IS NOT NULL THEN
      v_channel := 'sms';
      v_destination := v_profile.phone;
    ELSIF v_profile.preferred_contact = 'email' AND v_profile.email IS NOT NULL THEN
      v_channel := 'email';
      v_destination := v_profile.email;
    ELSIF v_profile.phone IS NOT NULL THEN
      v_channel := 'sms';
      v_destination := v_profile.phone;
    ELSIF v_profile.email IS NOT NULL THEN
      v_channel := 'email';
      v_destination := v_profile.email;
    END IF;
  ELSE
    IF v_profile.preferred_contact = 'sms' AND COALESCE(v_profile.sms_reminders, true) AND v_profile.phone IS NOT NULL THEN
      v_channel := 'sms';
      v_destination := v_profile.phone;
    ELSIF v_profile.preferred_contact = 'email' AND v_profile.email IS NOT NULL THEN
      v_channel := 'email';
      v_destination := v_profile.email;
    ELSIF COALESCE(v_profile.sms_reminders, true) AND v_profile.phone IS NOT NULL THEN
      v_channel := 'sms';
      v_destination := v_profile.phone;
    ELSIF COALESCE(v_profile.email_promotions, true) AND v_profile.email IS NOT NULL THEN
      v_channel := 'email';
      v_destination := v_profile.email;
    END IF;
  END IF;

  IF v_channel IS NULL OR v_destination IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO external_message_queue (
    notification_id, recipient_id, channel, destination, subject, body
  ) VALUES (
    NEW.id, NEW.recipient_id, v_channel, v_destination, NEW.title, NEW.body
  );

  RETURN NEW;
END;
$$;

-- ============================================================
-- 6) Daily birthday wish sender RPC
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
      AND NOT EXISTS (
        SELECT 1 FROM birthday_wish_log b
        WHERE b.profile_id = profiles.id AND b.wish_year = v_wish_year
      )
  LOOP
    v_points := get_birthday_bonus_points(v_customer.loyalty_tier);

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

    INSERT INTO birthday_wish_log (profile_id, wish_year, points_awarded)
    VALUES (v_customer.id, v_wish_year, v_points)
    ON CONFLICT (profile_id, wish_year) DO NOTHING;

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
