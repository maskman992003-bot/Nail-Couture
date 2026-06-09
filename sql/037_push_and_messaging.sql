-- Migration 037: Mobile push + SMS/email delivery queues
-- Run after 036_fix_notifications_reference_fkey.sql
-- Then run 038_gate_external_messaging.sql to keep SMS/email off until providers are configured.
-- See docs/PUSH_AND_MESSAGING_SETUP.md

-- ============================================================
-- 1) Device push tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS device_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expo_push_token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_name text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, expo_push_token)
);

CREATE INDEX IF NOT EXISTS idx_device_push_tokens_profile
  ON device_push_tokens (profile_id);

ALTER TABLE device_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read device_push_tokens" ON device_push_tokens;
CREATE POLICY "Allow anon read device_push_tokens"
  ON device_push_tokens FOR SELECT TO anon USING (true);

-- ============================================================
-- 2) Push delivery queue (processed by send-notification-push edge fn)
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_push_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'skipped')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_push_queue_pending
  ON notification_push_queue (created_at)
  WHERE status = 'pending';

ALTER TABLE notification_push_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service read push queue" ON notification_push_queue;
CREATE POLICY "Allow service read push queue"
  ON notification_push_queue FOR SELECT TO anon USING (true);

-- ============================================================
-- 3) External message queue (SMS / email via edge function)
-- ============================================================
CREATE TABLE IF NOT EXISTS external_message_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES notifications(id) ON DELETE SET NULL,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('sms', 'email')),
  destination text NOT NULL,
  subject text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'skipped')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_external_message_queue_pending
  ON external_message_queue (created_at)
  WHERE status = 'pending';

ALTER TABLE external_message_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service read external queue" ON external_message_queue;
CREATE POLICY "Allow service read external queue"
  ON external_message_queue FOR SELECT TO anon USING (true);

-- Appointment reminder tracking (avoid duplicate 24h reminders)
CREATE TABLE IF NOT EXISTS appointment_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  reminder_type text NOT NULL DEFAULT '24h',
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, reminder_type)
);

-- ============================================================
-- 4) Register / unregister push tokens (phone auth)
-- ============================================================
CREATE OR REPLACE FUNCTION register_push_token(
  p_phone text,
  p_expo_push_token text,
  p_platform text DEFAULT 'ios',
  p_device_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_platform text;
BEGIN
  IF p_expo_push_token IS NULL OR trim(p_expo_push_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing push token');
  END IF;

  SELECT id INTO v_profile_id FROM profiles WHERE phone = p_phone;
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  v_platform := CASE lower(COALESCE(p_platform, 'ios'))
    WHEN 'android' THEN 'android'
    WHEN 'web' THEN 'web'
    ELSE 'ios'
  END;

  INSERT INTO device_push_tokens (profile_id, expo_push_token, platform, device_name, last_seen_at)
  VALUES (v_profile_id, trim(p_expo_push_token), v_platform, p_device_name, now())
  ON CONFLICT (profile_id, expo_push_token) DO UPDATE SET
    platform = EXCLUDED.platform,
    device_name = COALESCE(EXCLUDED.device_name, device_push_tokens.device_name),
    last_seen_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION unregister_push_token(
  p_phone text,
  p_expo_push_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  SELECT id INTO v_profile_id FROM profiles WHERE phone = p_phone;
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  DELETE FROM device_push_tokens
  WHERE profile_id = v_profile_id
    AND expo_push_token = trim(p_expo_push_token);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 5) Enqueue helpers + triggers on notifications INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION enqueue_notification_push(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_notification_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM device_push_tokens d
    JOIN notifications n ON n.recipient_id = d.profile_id
    WHERE n.id = p_notification_id
  ) THEN
    RETURN;
  END IF;

  INSERT INTO notification_push_queue (notification_id)
  VALUES (p_notification_id);
END;
$$;

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
    'payment_receipt', 'appointment_missed', 'loyalty_earned'
  ];
BEGIN
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

CREATE OR REPLACE FUNCTION trg_enqueue_notification_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM enqueue_notification_push(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_notification_delivery ON notifications;
CREATE TRIGGER trg_enqueue_notification_delivery
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION trg_enqueue_notification_delivery();

DROP TRIGGER IF EXISTS trg_enqueue_external_message ON notifications;
CREATE TRIGGER trg_enqueue_external_message
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_external_message_for_notification();

-- Enable Realtime on queues for webhook alternatives
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notification_push_queue;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE external_message_queue;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;

-- ============================================================
-- 6) Appointment reminder RPC (called by cron edge function)
-- ============================================================
CREATE OR REPLACE FUNCTION send_due_appointment_reminders(p_hours_ahead integer DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appt RECORD;
  v_count integer := 0;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_service_label text;
BEGIN
  v_window_start := now() + ((p_hours_ahead - 1) || ' hours')::interval;
  v_window_end := now() + ((p_hours_ahead + 1) || ' hours')::interval;

  FOR v_appt IN
    SELECT a.id, a.customer_id, a.scheduled_at, a.service_id, a.selected_service_names,
           p.full_name, p.sms_reminders
    FROM appointments a
    JOIN profiles p ON p.id = a.customer_id
    WHERE a.status = 'confirmed'
      AND a.scheduled_at >= v_window_start
      AND a.scheduled_at <= v_window_end
      AND COALESCE(p.sms_reminders, true) = true
      AND NOT EXISTS (
        SELECT 1 FROM appointment_reminder_log r
        WHERE r.appointment_id = a.id AND r.reminder_type = '24h'
      )
  LOOP
    v_service_label := COALESCE(
      NULLIF(trim(v_appt.selected_service_names), ''),
      (SELECT name FROM services WHERE id = v_appt.service_id),
      'your appointment'
    );

    PERFORM create_notification(
      v_appt.customer_id,
      'Appointment reminder',
      format(
        'Reminder: %s on %s at %s.',
        v_service_label,
        to_char(v_appt.scheduled_at, 'Mon DD'),
        to_char(v_appt.scheduled_at, 'HH12:MI AM')
      ),
      'appointment_reminder',
      v_appt.id
    );

    INSERT INTO appointment_reminder_log (appointment_id, reminder_type)
    VALUES (v_appt.id, '24h')
    ON CONFLICT (appointment_id, reminder_type) DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'reminders_sent', v_count);
END;
$$;

COMMENT ON TABLE device_push_tokens IS 'Expo push tokens registered from mobile app';
COMMENT ON TABLE notification_push_queue IS 'Pending mobile push deliveries — webhook to send-notification-push edge function';
COMMENT ON TABLE external_message_queue IS 'Pending SMS/email deliveries — webhook to process-external-messages edge function';
