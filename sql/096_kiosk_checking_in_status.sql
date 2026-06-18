-- Migration 096: Defer lobby placement until kiosk check-in is complete
-- Customers stay in "checking_in" during waiver / registration / service selection,
-- and move to "waiting" only when they finish the full kiosk flow.

-- ============================================================
-- 1) Extend appointment status constraint
-- ============================================================
DO $$ BEGIN
  ALTER TABLE appointments DROP CONSTRAINT IF EXISTS check_appointment_status;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
  CHECK (status IN (
    'confirmed', 'checking_in', 'waiting', 'assigned_pending', 'serving',
    'ready_for_checkout', 'completed', 'cancelled', 'missed'
  ));

-- ============================================================
-- 2) process_kiosk_check_in — start in checking_in, not waiting
-- ============================================================
CREATE OR REPLACE FUNCTION process_kiosk_check_in(
  p_phone TEXT,
  p_checked_in_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_phone TEXT;
  v_profile RECORD;
  v_appointment RECORD;
  v_new_id UUID;
  result JSONB;
BEGIN
  clean_phone := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  IF length(clean_phone) < 10 THEN
    RAISE EXCEPTION 'Invalid phone number.';
  END IF;

  SELECT id, full_name, phone, email, nail_goal, refreshment_pref, role
  INTO v_profile
  FROM profiles
  WHERE regexp_replace(phone, '\D', '', 'g') = clean_phone
     OR phone = clean_phone
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_profile.id IS NULL THEN
    RETURN jsonb_build_object('is_new', true);
  END IF;

  SELECT id, status, service_id, scheduled_at
  INTO v_appointment
  FROM appointments
  WHERE customer_id = v_profile.id
    AND status IN ('confirmed', 'checking_in', 'waiting', 'serving')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_appointment.id IS NOT NULL THEN
    IF v_appointment.status = 'checking_in' THEN
      -- Resume an in-progress kiosk session — do not send to lobby yet
      SELECT row_to_json(a.*)::jsonb INTO result
      FROM appointments a WHERE a.id = v_appointment.id;

      RETURN jsonb_build_object(
        'is_new', false,
        'name', v_profile.full_name,
        'profile', row_to_json(v_profile)::jsonb,
        'appointment', result
      );
    END IF;

    IF v_appointment.status = 'confirmed' THEN
      UPDATE appointments SET
        status = 'checking_in',
        checked_in_at = NULL,
        checked_in_by = COALESCE(p_checked_in_by, checked_in_by)
      WHERE id = v_appointment.id;
    END IF;

    SELECT row_to_json(a.*)::jsonb INTO result
    FROM appointments a WHERE a.id = v_appointment.id;

    RETURN jsonb_build_object(
      'is_new', false,
      'name', v_profile.full_name,
      'profile', row_to_json(v_profile)::jsonb,
      'appointment', result
    );
  END IF;

  INSERT INTO appointments (
    customer_id,
    status,
    checked_in_by,
    booking_type
  ) VALUES (
    v_profile.id,
    'checking_in',
    p_checked_in_by,
    'walk_in'
  )
  RETURNING id INTO v_new_id;

  SELECT row_to_json(a.*)::jsonb INTO result
  FROM appointments a WHERE a.id = v_new_id;

  RETURN jsonb_build_object(
    'is_new', false,
    'name', v_profile.full_name,
    'profile', row_to_json(v_profile)::jsonb,
    'appointment', result
  );
END;
$$;

-- ============================================================
-- 3) complete_kiosk_check_in — move customer to lobby when done
-- ============================================================
CREATE OR REPLACE FUNCTION complete_kiosk_check_in(
  caller_phone TEXT,
  appointment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  appt RECORD;
  result JSONB;
BEGIN
  SELECT id INTO caller_id
  FROM profiles
  WHERE regexp_replace(phone, '\D', '', 'g') = regexp_replace(COALESCE(caller_phone, ''), '\D', '', 'g')
     OR phone = caller_phone
  ORDER BY created_at ASC
  LIMIT 1;

  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for this phone number.';
  END IF;

  SELECT * INTO appt
  FROM appointments
  WHERE id = appointment_id AND customer_id = caller_id;

  IF appt.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found or does not belong to you.';
  END IF;

  IF appt.status NOT IN ('checking_in', 'confirmed') THEN
    -- Already in lobby or further along — idempotent success
    SELECT jsonb_build_object(
      'success', true,
      'appointment', row_to_json(a.*)::jsonb
    ) INTO result
    FROM appointments a WHERE a.id = appointment_id;
    RETURN result;
  END IF;

  UPDATE appointments SET
    status = 'waiting',
    checked_in_at = COALESCE(checked_in_at, NOW())
  WHERE id = appointment_id;

  SELECT jsonb_build_object(
    'success', true,
    'appointment', row_to_json(a.*)::jsonb
  ) INTO result
  FROM appointments a WHERE a.id = appointment_id;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION complete_kiosk_check_in(TEXT, UUID) TO anon, authenticated;

-- ============================================================
-- 4) Notify lobby when checking_in -> waiting
-- Re-deploy notification core from 035 with checking_in included in the
-- waiting transition (lobby alerts fire only after check-in completes).
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
      IF p_previous_status IS NULL OR p_previous_status IN ('confirmed', 'checking_in') THEN
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
