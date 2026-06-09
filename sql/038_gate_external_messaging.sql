-- Migration 038: Gate SMS/email — infrastructure stays, delivery disabled by default
-- Run after 037_push_and_messaging.sql
-- Enable later: UPDATE notification_settings SET external_messaging_enabled = true;

CREATE TABLE IF NOT EXISTS notification_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  external_messaging_enabled boolean NOT NULL DEFAULT false,
  appointment_reminders_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO notification_settings (id, external_messaging_enabled, appointment_reminders_enabled)
VALUES (1, false, false)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION is_external_messaging_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT external_messaging_enabled FROM notification_settings WHERE id = 1),
    false
  );
$$;

CREATE OR REPLACE FUNCTION is_appointment_reminders_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT appointment_reminders_enabled FROM notification_settings WHERE id = 1),
    false
  );
$$;

-- Skip SMS/email queue when disabled (tables + edge fn remain for later)
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
  IF NOT is_appointment_reminders_enabled() OR NOT is_external_messaging_enabled() THEN
    RETURN jsonb_build_object(
      'success', true,
      'reminders_sent', 0,
      'skipped', true,
      'reason', 'external_messaging_or_reminders_disabled'
    );
  END IF;

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

COMMENT ON TABLE notification_settings IS
  'Toggle SMS/email delivery. Defaults off until Twilio/Resend are configured.';
