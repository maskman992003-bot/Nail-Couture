-- Migration 035: In-app notification system — writers, dispatch triggers, RPC hooks
-- Run once in Supabase SQL Editor after 034_appointment_service_history.sql
-- See SCHEMA_VALIDATION_NOTIFICATIONS.md for pre-flight checks.

-- ============================================================
-- 1) Schema enhancements
-- ============================================================

-- reference_id was renamed from online_booking_id but kept an FK to online_bookings_archived.
-- Notifications now store appointment ids and other entity ids — drop the legacy constraint.
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_online_booking_id_fkey;

COMMENT ON COLUMN notifications.reference_id IS
  'Optional polymorphic reference (appointment id, inventory id, time-off id, etc.). No FK enforced.';

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON notifications (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications (recipient_id) WHERE is_read = false;

-- Enable Realtime (no-op if already added)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- ============================================================
-- 2) Central notification writer RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION create_notification(
  p_recipient_id uuid,
  p_title text,
  p_body text,
  p_type text DEFAULT 'system',
  p_reference_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_recipient_id IS NULL OR p_title IS NULL OR p_body IS NULL THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.recipient_id = p_recipient_id
      AND n.type = COALESCE(p_type, 'system')
      AND n.reference_id IS NOT DISTINCT FROM p_reference_id
      AND n.created_at > NOW() - INTERVAL '5 minutes'
  ) THEN
    SELECT n.id INTO v_id
    FROM notifications n
    WHERE n.recipient_id = p_recipient_id
      AND n.type = COALESCE(p_type, 'system')
      AND n.reference_id IS NOT DISTINCT FROM p_reference_id
      AND n.created_at > NOW() - INTERVAL '5 minutes'
    ORDER BY n.created_at DESC
    LIMIT 1;
    RETURN v_id;
  END IF;

  INSERT INTO notifications (
    recipient_id, title, body, type, reference_id, metadata, is_read
  ) VALUES (
    p_recipient_id,
    p_title,
    p_body,
    COALESCE(p_type, 'system'),
    p_reference_id,
    COALESCE(p_metadata, '{}'::jsonb),
    false
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION notify_roles(
  p_roles user_role[],
  p_title text,
  p_body text,
  p_type text DEFAULT 'system',
  p_reference_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  IF p_roles IS NULL OR array_length(p_roles, 1) IS NULL THEN
    RETURN;
  END IF;

  FOR v_profile_id IN
    SELECT p.id FROM profiles p WHERE p.role = ANY(p_roles)
  LOOP
    PERFORM create_notification(
      v_profile_id, p_title, p_body, p_type, p_reference_id, p_metadata
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION notify_profiles(
  p_profile_ids uuid[],
  p_title text,
  p_body text,
  p_type text DEFAULT 'system',
  p_reference_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  IF p_profile_ids IS NULL OR array_length(p_profile_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  FOREACH v_profile_id IN ARRAY p_profile_ids
  LOOP
    IF v_profile_id IS NOT NULL THEN
      PERFORM create_notification(
        v_profile_id, p_title, p_body, p_type, p_reference_id, p_metadata
      );
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- 3) Appointment context helper
-- ============================================================
CREATE OR REPLACE FUNCTION get_appointment_notification_context(p_appointment_id uuid)
RETURNS TABLE(
  customer_id uuid,
  customer_name text,
  technician_id uuid,
  technician_name text,
  service_label text,
  appt_status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.customer_id,
    COALESCE(c.full_name, 'Client'),
    a.technician_id,
    COALESCE(t.full_name, 'Technician'),
    COALESCE(
      NULLIF(trim(a.selected_service_names), ''),
      sv.name,
      'service'
    ),
    a.status
  FROM appointments a
  LEFT JOIN profiles c ON c.id = a.customer_id
  LEFT JOIN profiles t ON t.id = a.technician_id
  LEFT JOIN services sv ON sv.id = a.service_id
  WHERE a.id = p_appointment_id;
END;
$$;

-- ============================================================
-- 4) Status dispatch core + triggers
-- ============================================================
CREATE OR REPLACE FUNCTION dispatch_appointment_status_notification_core(
  p_appointment_id uuid,
  p_previous_status text,
  p_new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ctx RECORD;
  v_mgmt_roles user_role[] := ARRAY['super_admin', 'owner', 'partner']::user_role[];
  v_admin_roles user_role[] := ARRAY['admin']::user_role[];
  v_cashier_roles user_role[] := ARRAY['cashier']::user_role[];
  v_lobby_roles user_role[] := ARRAY['super_admin', 'owner', 'partner', 'admin']::user_role[];
BEGIN
  IF p_appointment_id IS NULL OR p_new_status IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO ctx FROM get_appointment_notification_context(p_appointment_id);
  IF ctx.customer_id IS NULL AND ctx.customer_name IS NULL THEN
    RETURN;
  END IF;

  CASE p_new_status
    WHEN 'confirmed' THEN
      IF p_previous_status IS NULL THEN
        IF ctx.customer_id IS NOT NULL THEN
          PERFORM create_notification(
            ctx.customer_id,
            'Appointment confirmed',
            format('Your %s appointment is confirmed.', ctx.service_label),
            'booking_confirmed',
            p_appointment_id
          );
        END IF;
        PERFORM notify_roles(
          v_lobby_roles,
          'New booking',
          format('%s booked %s.', ctx.customer_name, ctx.service_label),
          'new_booking',
          p_appointment_id
        );
      END IF;

    WHEN 'waiting' THEN
      IF p_previous_status IS NULL OR p_previous_status IN ('confirmed') THEN
        IF ctx.customer_id IS NOT NULL THEN
          PERFORM create_notification(
            ctx.customer_id,
            'You''re checked in',
            format('Welcome! You''re checked in for %s.', ctx.service_label),
            'checked_in',
            p_appointment_id
          );
        END IF;
        PERFORM notify_roles(
          v_lobby_roles,
          'Client waiting',
          format('%s checked in — waiting.', ctx.customer_name),
          'lobby_waiting',
          p_appointment_id
        );
      END IF;

    WHEN 'assigned_pending' THEN
      IF ctx.technician_id IS NOT NULL THEN
        PERFORM create_notification(
          ctx.technician_id,
          'New assignment',
          format('New client: %s — %s', ctx.customer_name, ctx.service_label),
          'new_assignment',
          p_appointment_id
        );
      END IF;
      IF ctx.customer_id IS NOT NULL THEN
        PERFORM create_notification(
          ctx.customer_id,
          'Technician assigned',
          format('Your technician: %s', ctx.technician_name),
          'technician_assigned',
          p_appointment_id
        );
      END IF;

    WHEN 'serving' THEN
      IF ctx.customer_id IS NOT NULL THEN
        PERFORM create_notification(
          ctx.customer_id,
          'Service started',
          format('Your %s service has started.', ctx.service_label),
          'service_started',
          p_appointment_id
        );
      END IF;

    WHEN 'ready_for_checkout' THEN
      PERFORM notify_roles(
        v_cashier_roles,
        'Ready for checkout',
        format('%s is ready for checkout.', ctx.customer_name),
        'checkout_ready',
        p_appointment_id
      );
      IF ctx.customer_id IS NOT NULL THEN
        PERFORM create_notification(
          ctx.customer_id,
          'Ready for checkout',
          'Your visit is complete. Please proceed to checkout.',
          'checkout_ready',
          p_appointment_id
        );
      END IF;
      IF ctx.technician_id IS NOT NULL THEN
        PERFORM create_notification(
          ctx.technician_id,
          'Sent to checkout',
          format('%s was sent to checkout.', ctx.customer_name),
          'your_client_checkout',
          p_appointment_id
        );
      END IF;

    WHEN 'completed' THEN
      IF ctx.customer_id IS NOT NULL THEN
        PERFORM create_notification(
          ctx.customer_id,
          'Visit complete',
          format('Thank you for visiting! Your %s appointment is complete.', ctx.service_label),
          'visit_completed',
          p_appointment_id
        );
      END IF;

    WHEN 'cancelled' THEN
      IF ctx.customer_id IS NOT NULL THEN
        PERFORM create_notification(
          ctx.customer_id,
          'Appointment cancelled',
          format('Your %s appointment has been cancelled.', ctx.service_label),
          'appointment_cancelled',
          p_appointment_id
        );
      END IF;
      IF ctx.technician_id IS NOT NULL THEN
        PERFORM create_notification(
          ctx.technician_id,
          'Assignment cancelled',
          format('%s''s appointment was cancelled.', ctx.customer_name),
          'assignment_cancelled',
          p_appointment_id
        );
      END IF;
      PERFORM notify_roles(
        v_admin_roles,
        'Appointment cancelled',
        format('Appointment cancelled for %s.', ctx.customer_name),
        'customer_cancelled',
        p_appointment_id
      );

    WHEN 'missed' THEN
      IF ctx.customer_id IS NOT NULL THEN
        PERFORM create_notification(
          ctx.customer_id,
          'We missed you',
          format('We missed you for your %s appointment. Book again anytime.', ctx.service_label),
          'appointment_missed',
          p_appointment_id
        );
      END IF;

    ELSE
      NULL;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION dispatch_appointment_status_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM dispatch_appointment_status_notification_core(
    NEW.appointment_id,
    NEW.previous_status,
    NEW.new_status
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_appointment_status_notification ON appointment_status_history;
CREATE TRIGGER trg_dispatch_appointment_status_notification
  AFTER INSERT ON appointment_status_history
  FOR EACH ROW
  EXECUTE FUNCTION dispatch_appointment_status_notification();

CREATE OR REPLACE FUNCTION notify_on_appointment_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM dispatch_appointment_status_notification_core(NEW.id, NULL, NEW.status);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_appointment_insert ON appointments;
CREATE TRIGGER trg_notify_on_appointment_insert
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_appointment_insert();

CREATE OR REPLACE FUNCTION notify_technician_reassignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ctx RECORD;
BEGIN
  IF NEW.technician_id IS NOT DISTINCT FROM OLD.technician_id THEN
    RETURN NEW;
  END IF;

  SELECT * INTO ctx FROM get_appointment_notification_context(NEW.id);

  IF OLD.technician_id IS NOT NULL
     AND NEW.technician_id IS DISTINCT FROM OLD.technician_id THEN
    PERFORM create_notification(
      OLD.technician_id,
      'Assignment removed',
      format('%s was reassigned to another technician.', ctx.customer_name),
      'assignment_cancelled',
      NEW.id
    );
  END IF;

  IF NEW.status = 'assigned_pending'
     AND OLD.status = 'assigned_pending'
     AND NEW.technician_id IS NOT NULL
     AND NEW.technician_id IS DISTINCT FROM OLD.technician_id THEN
    PERFORM create_notification(
      NEW.technician_id,
      'New assignment',
      format('New client: %s — %s', ctx.customer_name, ctx.service_label),
      'new_assignment',
      NEW.id
    );
    IF ctx.customer_id IS NOT NULL THEN
      PERFORM create_notification(
        ctx.customer_id,
        'Technician assigned',
        format('Your technician: %s', ctx.technician_name),
        'technician_assigned',
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_technician_reassignment ON appointments;
CREATE TRIGGER trg_notify_technician_reassignment
  AFTER UPDATE OF technician_id ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_technician_reassignment();

-- ============================================================
-- 5) Service change notifications
-- ============================================================
CREATE OR REPLACE FUNCTION dispatch_service_change_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ctx RECORD;
  v_price_changed boolean;
BEGIN
  SELECT * INTO ctx FROM get_appointment_notification_context(NEW.appointment_id);
  v_price_changed := NEW.new_final_price IS DISTINCT FROM NEW.previous_final_price;

  IF ctx.customer_id IS NOT NULL THEN
    PERFORM create_notification(
      ctx.customer_id,
      'Appointment updated',
      format('Your services were updated to: %s.', COALESCE(NEW.new_service_names, ctx.service_label)),
      'appointment_updated',
      NEW.appointment_id
    );
  END IF;

  IF NEW.change_source = 'customer_kiosk' THEN
    PERFORM notify_roles(
      ARRAY['admin']::user_role[],
      'Customer updated booking',
      format('%s updated their appointment services.', ctx.customer_name),
      'customer_booking_edit',
      NEW.appointment_id
    );
  END IF;

  IF v_price_changed THEN
    PERFORM notify_roles(
      ARRAY['cashier']::user_role[],
      'Price updated',
      format('Price updated for %s — review at checkout.', ctx.customer_name),
      'checkout_price_change',
      NEW.appointment_id
    );
    IF ctx.customer_id IS NOT NULL THEN
      PERFORM create_notification(
        ctx.customer_id,
        'Service updated',
        'Your service or price was updated during your visit.',
        'service_changed',
        NEW.appointment_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_service_change_notification ON appointment_service_history;
CREATE TRIGGER trg_dispatch_service_change_notification
  AFTER INSERT ON appointment_service_history
  FOR EACH ROW
  EXECUTE FUNCTION dispatch_service_change_notification();

-- ============================================================
-- 6) Inventory low-stock notifications
-- ============================================================
CREATE OR REPLACE FUNCTION dispatch_inventory_low_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.quantity IS NOT NULL
     AND NEW.reorder_threshold IS NOT NULL
     AND NEW.quantity <= NEW.reorder_threshold
     AND (OLD.quantity IS NULL OR OLD.quantity > OLD.reorder_threshold OR OLD.reorder_threshold IS DISTINCT FROM NEW.reorder_threshold) THEN
    PERFORM notify_roles(
      ARRAY['super_admin', 'owner', 'partner', 'admin']::user_role[],
      'Low stock',
      format('Low stock: %s (%s remaining).', NEW.item_name, NEW.quantity),
      'inventory_low',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_inventory_low_notification ON inventory;
CREATE TRIGGER trg_dispatch_inventory_low_notification
  AFTER UPDATE OF quantity, reorder_threshold ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION dispatch_inventory_low_notification();

-- ============================================================
-- 7) Extended read RPC
-- ============================================================
DROP FUNCTION IF EXISTS get_my_notifications(text) CASCADE;

CREATE OR REPLACE FUNCTION get_my_notifications(
  p_phone text,
  p_limit integer DEFAULT 50,
  p_unread_only boolean DEFAULT false
)
RETURNS TABLE(
  id uuid,
  recipient_id uuid,
  reference_id uuid,
  title text,
  body text,
  is_read boolean,
  type text,
  metadata jsonb,
  created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id, n.recipient_id, n.reference_id, n.title, n.body,
    n.is_read, n.type, n.metadata, n.created_at
  FROM notifications n
  JOIN profiles p ON p.id = n.recipient_id
  WHERE p.phone = p_phone
    AND (NOT p_unread_only OR n.is_read = false)
  ORDER BY n.created_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 50), 1);
END;
$$;

-- ============================================================
-- 8) RLS — block direct client INSERT; reads via RPC + Realtime
-- ============================================================
DROP POLICY IF EXISTS "Allow anon insert notifications" ON notifications;
DROP POLICY IF EXISTS "Admins insert notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can insert any notification" ON notifications;

-- ============================================================
-- 9) Patched RPCs with notification hooks
-- ============================================================

-- decline_assignment — alert lobby when technician declines
CREATE OR REPLACE FUNCTION decline_assignment(
  caller_phone TEXT,
  appointment_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
  appt RECORD;
  ctx RECORD;
  result JSONB;
BEGIN
  SELECT id, role INTO caller_id, caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician') THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  SELECT * INTO appt FROM appointments WHERE id = appointment_id;
  IF appt.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found.';
  END IF;

  IF appt.status != 'assigned_pending' THEN
    RAISE EXCEPTION 'Only pending assignments can be declined.';
  END IF;

  IF caller_role = 'technician' AND appt.technician_id != caller_id THEN
    RAISE EXCEPTION 'You can only decline your own assignments.';
  END IF;

  SELECT * INTO ctx FROM get_appointment_notification_context(appointment_id);

  UPDATE appointments SET
    status = 'waiting',
    technician_id = NULL,
    notes = CASE
      WHEN p_reason IS NOT NULL AND p_reason != '' THEN
        COALESCE(notes || E'\n', '') || 'Declined: ' || p_reason
      ELSE notes
    END
  WHERE id = appointment_id;

  PERFORM notify_roles(
    ARRAY['admin']::user_role[],
    'Assignment declined',
    format('%s declined assignment for %s — reassign needed.', ctx.technician_name, ctx.customer_name),
    'assignment_declined',
    appointment_id
  );

  SELECT jsonb_build_object('success', true) INTO result;
  RETURN result;
END;
$$;

-- create_time_off_request — notify management
CREATE OR REPLACE FUNCTION create_time_off_request(
  p_staff_id uuid,
  p_start_date date,
  p_end_date date,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_name text;
  v_request_id uuid;
BEGIN
  INSERT INTO time_off_requests (employee_id, start_date, end_date, reason, status)
  VALUES (p_staff_id, p_start_date, p_end_date, p_reason, 'pending')
  RETURNING id INTO v_request_id;

  SELECT full_name INTO v_staff_name FROM profiles WHERE id = p_staff_id;

  PERFORM notify_roles(
    ARRAY['super_admin', 'owner', 'partner']::user_role[],
    'Time-off request',
    format('%s requested time off (%s to %s).', COALESCE(v_staff_name, 'Staff'), p_start_date, p_end_date),
    'time_off_request',
    v_request_id
  );
END;
$$;

-- review_time_off_request — notify requesting staff
CREATE OR REPLACE FUNCTION review_time_off_request(
  p_request_id uuid,
  p_status text,
  p_reviewed_by uuid,
  p_review_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid;
  v_start date;
  v_end date;
  v_decision text;
  v_note text;
  v_message text;
BEGIN
  SELECT employee_id, start_date, end_date INTO v_staff_id, v_start, v_end
  FROM time_off_requests WHERE id = p_request_id;

  v_note := NULLIF(trim(p_review_note), '');

  UPDATE time_off_requests
  SET status = p_status, reviewed_by = p_reviewed_by, reviewed_at = now(), review_note = v_note
  WHERE id = p_request_id;

  IF v_staff_id IS NOT NULL THEN
    v_decision := CASE WHEN lower(p_status) IN ('approved', 'denied', 'rejected') THEN lower(p_status) ELSE p_status END;
    v_message := format('Your time-off request (%s to %s) was %s.', v_start, v_end, v_decision);
    IF v_note IS NOT NULL THEN
      v_message := v_message || ' Note: ' || v_note;
    END IF;
    PERFORM create_notification(
      v_staff_id,
      format('Time off %s', v_decision),
      v_message,
      'time_off_decision',
      p_request_id
    );
  END IF;
END;
$$;

-- update_my_appointment — schedule change notifications (service changes via service_history trigger)
CREATE OR REPLACE FUNCTION update_my_appointment(
  caller_phone TEXT,
  appointment_id UUID,
  p_service_id BIGINT DEFAULT NULL,
  p_add_ons TEXT DEFAULT NULL,
  p_final_price NUMERIC DEFAULT NULL,
  p_refreshment_pref TEXT DEFAULT NULL,
  p_scheduled_at TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_selected_service_names TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  caller_name TEXT;
  old_row appointments%ROWTYPE;
  old_service_names TEXT;
  new_service_names TEXT;
  new_addons TEXT;
  new_final_price NUMERIC;
  result JSONB;
  v_scheduled_changed boolean;
BEGIN
  SELECT id, full_name INTO caller_id, caller_name FROM profiles WHERE phone = caller_phone;
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for this phone number.';
  END IF;

  SELECT * INTO old_row
  FROM appointments
  WHERE id = appointment_id AND customer_id = caller_id;

  IF old_row.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found or does not belong to you.';
  END IF;

  v_scheduled_changed := p_scheduled_at IS NOT NULL AND p_scheduled_at IS DISTINCT FROM old_row.scheduled_at;

  old_service_names := resolve_appointment_service_names(old_row.service_id, old_row.selected_service_names);
  new_service_names := resolve_appointment_service_names(
    COALESCE(p_service_id, old_row.service_id),
    COALESCE(p_selected_service_names, old_row.selected_service_names)
  );
  new_addons := COALESCE(p_add_ons, old_row.add_ons);
  new_final_price := COALESCE(p_final_price, old_row.final_price);

  IF p_service_id IS NOT NULL
     OR p_add_ons IS NOT NULL
     OR p_final_price IS NOT NULL
     OR p_selected_service_names IS NOT NULL THEN
    PERFORM log_appointment_service_change(
      appointment_id,
      caller_id,
      COALESCE(caller_name, 'Customer'),
      'customer_kiosk',
      old_service_names,
      new_service_names,
      old_row.add_ons,
      new_addons,
      old_row.final_price,
      new_final_price
    );
  END IF;

  UPDATE appointments SET
    service_id = COALESCE(p_service_id, service_id),
    add_ons = COALESCE(p_add_ons, add_ons),
    selected_service_names = COALESCE(p_selected_service_names, selected_service_names),
    final_price = COALESCE(p_final_price, final_price),
    refreshment_pref = COALESCE(p_refreshment_pref, refreshment_pref),
    scheduled_at = COALESCE(p_scheduled_at, scheduled_at),
    notes = COALESCE(p_notes, notes)
  WHERE id = appointment_id AND customer_id = caller_id;

  IF v_scheduled_changed THEN
    PERFORM create_notification(
      caller_id,
      'Appointment updated',
      format('Your appointment was rescheduled to %s.', to_char(COALESCE(p_scheduled_at, old_row.scheduled_at), 'Mon DD, YYYY at HH12:MI AM')),
      'appointment_updated',
      appointment_id
    );
    PERFORM notify_roles(
      ARRAY['admin']::user_role[],
      'Customer updated booking',
      format('%s rescheduled their appointment.', COALESCE(caller_name, 'Customer')),
      'customer_booking_edit',
      appointment_id
    );
  END IF;

  SELECT jsonb_build_object('success', true) INTO result;
  RETURN result;
END;
$$;

-- award_loyalty_points — notify for bonus types (checkout earn handled in process_checkout)
CREATE OR REPLACE FUNCTION award_loyalty_points(
  p_profile_id uuid,
  p_points integer,
  p_description text DEFAULT 'Points earned',
  p_type text DEFAULT 'earn',
  p_appointment_id uuid DEFAULT NULL
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
BEGIN
  IF p_points = 0 THEN
    SELECT loyalty_points INTO v_new FROM profiles WHERE id = p_profile_id;
    RETURN COALESCE(v_new, 0);
  END IF;

  v_type := CASE
    WHEN p_type IN ('earn', 'referral_bonus', 'signup_bonus', 'birthday_bonus', 'adjustment') THEN p_type
    ELSE 'earn'
  END;

  v_metadata := CASE
    WHEN p_appointment_id IS NOT NULL THEN jsonb_build_object('appointment_id', p_appointment_id)
    ELSE '{}'::jsonb
  END;

  UPDATE profiles
  SET loyalty_points = COALESCE(loyalty_points, 0) + p_points
  WHERE id = p_profile_id
  RETURNING loyalty_points INTO v_new;

  IF v_new IS NULL THEN
    RAISE EXCEPTION 'Profile not found: %', p_profile_id;
  END IF;

  INSERT INTO loyalty_transactions (profile_id, transaction_type, points, balance_after, description, metadata)
  VALUES (p_profile_id, v_type, p_points, v_new, p_description, v_metadata);

  IF v_type IN ('referral_bonus', 'signup_bonus', 'birthday_bonus') THEN
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

-- redeem_loyalty_reward — notify customer
CREATE OR REPLACE FUNCTION redeem_loyalty_reward(
  p_profile_id uuid,
  p_points_cost integer,
  p_reward_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current integer;
  v_new integer;
  v_code text;
BEGIN
  IF p_points_cost <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid points cost');
  END IF;

  SELECT loyalty_points INTO v_current
  FROM profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF v_current IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  IF v_current < p_points_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points', 'balance', v_current);
  END IF;

  v_new := v_current - p_points_cost;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  UPDATE profiles SET loyalty_points = v_new WHERE id = p_profile_id;

  INSERT INTO loyalty_transactions (
    profile_id, transaction_type, points, balance_after, description, redemption_code
  )
  VALUES (p_profile_id, 'redeem', -p_points_cost, v_new, p_reward_name, v_code);

  PERFORM create_notification(
    p_profile_id,
    'Reward applied',
    format('You redeemed %s (%s points).', COALESCE(p_reward_name, 'reward'), p_points_cost),
    'loyalty_redeemed',
    NULL,
    jsonb_build_object('points', p_points_cost, 'reward', p_reward_name, 'redemption_code', v_code)
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new,
    'redemption_code', v_code,
    'reward', p_reward_name,
    'points_cost', p_points_cost
  );
END;
$$;

-- process_checkout — payment receipt + loyalty earned
CREATE OR REPLACE FUNCTION process_checkout(
  caller_phone TEXT,
  appointment_id UUID,
  p_amount NUMERIC DEFAULT NULL,
  p_discount_amount NUMERIC DEFAULT 0,
  p_discount_type TEXT DEFAULT NULL,
  p_final_amount NUMERIC DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'card',
  p_notes TEXT DEFAULT NULL,
  p_loyalty_points_redeem INTEGER DEFAULT 0,
  p_loyalty_reward_name TEXT DEFAULT NULL,
  p_extras_amount NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
  appt RECORD;
  v_amount NUMERIC;
  v_extras NUMERIC;
  v_discount NUMERIC;
  v_final NUMERIC;
  v_discount_type TEXT;
  v_payment_method TEXT;
  v_points_earned INTEGER;
  v_inventory_id UUID;
  v_refreshment TEXT;
  v_loyalty_redeem INTEGER;
  v_loyalty_name TEXT;
  payment_id UUID;
  result JSONB;
BEGIN
  SELECT id, role INTO caller_id, caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN ('cashier', 'super_admin', 'owner', 'partner') THEN
    RAISE EXCEPTION 'Not authorized. Only cashier or management can process checkout.';
  END IF;

  SELECT a.*, p.refreshment_pref AS customer_refreshment
  INTO appt
  FROM appointments a
  LEFT JOIN profiles p ON p.id = a.customer_id
  WHERE a.id = appointment_id;

  IF appt.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found.';
  END IF;

  IF appt.status NOT IN ('ready_for_checkout', 'serving') THEN
    RAISE EXCEPTION 'Appointment is not ready for checkout (status: %).', appt.status;
  END IF;

  v_extras := COALESCE(p_extras_amount, 0);
  v_amount := COALESCE(p_amount, appt.final_price, 0);
  v_discount := LEAST(COALESCE(p_discount_amount, 0), v_amount);

  IF appt.loyalty_points_cost IS NOT NULL AND appt.loyalty_points_cost > 0 THEN
    v_loyalty_redeem := appt.loyalty_points_cost;
    v_loyalty_name := appt.loyalty_reward_name;
    IF v_discount = 0 AND COALESCE(appt.loyalty_discount_amount, 0) > 0 THEN
      v_discount := LEAST(appt.loyalty_discount_amount, v_amount);
    END IF;
  ELSE
    v_loyalty_redeem := COALESCE(p_loyalty_points_redeem, 0);
    v_loyalty_name := p_loyalty_reward_name;
  END IF;

  v_final := COALESCE(p_final_amount, GREATEST(v_amount - v_discount, 0) + v_extras);

  v_discount_type := CASE
    WHEN p_discount_type IN ('percentage', 'fixed', 'loyalty', 'coupon') THEN p_discount_type
    WHEN p_discount_type = 'percent' THEN 'percentage'
    WHEN p_discount_type = 'amount' THEN 'fixed'
    WHEN v_discount > 0 AND v_loyalty_redeem > 0 THEN 'loyalty'
    WHEN v_discount > 0 THEN 'fixed'
    ELSE NULL
  END;

  v_payment_method := CASE
    WHEN lower(p_payment_method) IN ('cash', 'card', 'other') THEN lower(p_payment_method)
    WHEN lower(p_payment_method) = 'transfer' THEN 'other'
    ELSE 'card'
  END;

  IF v_loyalty_redeem > 0 AND appt.customer_id IS NOT NULL THEN
    PERFORM redeem_loyalty_reward(
      appt.customer_id,
      v_loyalty_redeem,
      COALESCE(v_loyalty_name, 'Checkout redemption')
    );
  END IF;

  INSERT INTO payment_transactions (
    appointment_id, customer_id, technician_id, cashier_id, service_id,
    amount, extras_amount, discount_amount, discount_type, final_amount,
    payment_method, status, notes
  ) VALUES (
    appointment_id, appt.customer_id, appt.technician_id, caller_id, appt.service_id,
    v_amount, v_extras, v_discount, v_discount_type, v_final,
    v_payment_method, 'completed', p_notes
  )
  RETURNING id INTO payment_id;

  UPDATE appointments SET
    status = 'completed',
    completed_at = NOW(),
    final_price = v_final,
    loyalty_reward_id = NULL,
    loyalty_reward_name = NULL,
    loyalty_points_cost = NULL,
    loyalty_discount_amount = NULL,
    loyalty_redemption_code = NULL
  WHERE id = appointment_id;

  v_refreshment := appt.customer_refreshment;
  IF v_refreshment IS NOT NULL AND v_refreshment != '' THEN
    SELECT id INTO v_inventory_id
    FROM inventory
    WHERE item_name = v_refreshment AND category = 'refreshment'
    LIMIT 1;

    IF v_inventory_id IS NOT NULL THEN
      INSERT INTO inventory_logs (
        inventory_id, appointment_id, customer_id, quantity_changed, reason
      ) VALUES (
        v_inventory_id, appointment_id, appt.customer_id, -1, 'Consumed during service'
      );

      UPDATE inventory
      SET quantity = GREATEST(quantity - 1, 0)
      WHERE id = v_inventory_id;
    END IF;
  END IF;

  IF appt.customer_id IS NOT NULL AND v_final > 0 THEN
    v_points_earned := FLOOR(v_final)::INTEGER;
    IF v_points_earned > 0 THEN
      PERFORM award_loyalty_points(
        appt.customer_id,
        v_points_earned,
        'Points earned from visit checkout',
        'earn',
        appointment_id
      );
    END IF;
  END IF;

  IF appt.customer_id IS NOT NULL THEN
    PERFORM create_notification(
      appt.customer_id,
      'Payment receipt',
      format('Receipt: $%s paid via %s.', trim(to_char(v_final, '999990.99')), v_payment_method),
      'payment_receipt',
      appointment_id,
      jsonb_build_object('payment_id', payment_id, 'final_amount', v_final)
    );
    IF COALESCE(v_points_earned, 0) > 0 THEN
      PERFORM create_notification(
        appt.customer_id,
        'Points earned',
        format('+%s loyalty points earned from your visit.', v_points_earned),
        'loyalty_earned',
        appointment_id,
        jsonb_build_object('points', v_points_earned)
      );
    END IF;
  END IF;

  IF appt.technician_id IS NOT NULL THEN
    PERFORM create_notification(
      appt.technician_id,
      'Checkout complete',
      format('Checkout completed for your client ($%s).', trim(to_char(v_final, '999990.99'))),
      'your_client_checkout',
      appointment_id
    );
  END IF;

  SELECT jsonb_build_object(
    'success', true,
    'payment_id', payment_id,
    'final_amount', v_final,
    'points_earned', COALESCE(v_points_earned, 0)
  ) INTO result;

  RETURN result;
END;
$$;
