-- Migration 089: Fix get_my_appointments RPC (customer portal active visits)
-- Run once in Supabase SQL Editor after 088_gift_card_gifted_from.sql
--
-- Fixes 400 errors caused by jsonb_agg(sub.*) on wide appointment rows and
-- PL/pgSQL parameter shadowing (customer_id column vs parameter).

CREATE OR REPLACE FUNCTION get_my_appointments(
  customer_id UUID,
  status_filter TEXT DEFAULT NULL,
  booking_type_filter TEXT DEFAULT NULL,
  count_only BOOLEAN DEFAULT false,
  order_asc BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID := customer_id;
  v_status_filter TEXT := status_filter;
  v_booking_type_filter TEXT := booking_type_filter;
  v_order_asc BOOLEAN := order_asc;
  result JSONB;
BEGIN
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_id is required';
  END IF;

  IF count_only THEN
    SELECT jsonb_build_object('count', (
      SELECT COUNT(*)::int FROM appointments a
      WHERE a.customer_id = v_customer_id
        AND (v_status_filter IS NULL OR a.status = ANY(string_to_array(v_status_filter, ',')))
        AND (v_booking_type_filter IS NULL OR a.booking_type = v_booking_type_filter)
    )) INTO result;
  ELSE
    SELECT COALESCE(jsonb_agg(row_data ORDER BY sort_checked_in DESC, sort_scheduled DESC), '[]'::jsonb)
    INTO result
    FROM (
      SELECT
        jsonb_build_object(
          'id', a.id,
          'customer_id', a.customer_id,
          'service_id', a.service_id,
          'status', a.status,
          'checked_in_at', a.checked_in_at,
          'scheduled_at', a.scheduled_at,
          'start_time', a.start_time,
          'technician_id', a.technician_id,
          'final_price', a.final_price,
          'notes', a.notes,
          'add_ons', a.add_ons,
          'booking_type', a.booking_type,
          'created_at', a.created_at,
          'services', CASE
            WHEN srv.id IS NULL THEN NULL
            ELSE jsonb_build_object(
              'id', srv.id,
              'name', srv.name,
              'price', srv.price,
              'duration_minutes', srv.duration_minutes
            )
          END,
          'technician', CASE
            WHEN tech.id IS NULL THEN NULL
            ELSE jsonb_build_object(
              'id', tech.id,
              'full_name', tech.full_name,
              'name', tech.full_name
            )
          END
        ) AS row_data,
        a.checked_in_at AS sort_checked_in,
        a.scheduled_at AS sort_scheduled
      FROM appointments a
      LEFT JOIN services srv ON srv.id = a.service_id
      LEFT JOIN profiles tech ON tech.id = a.technician_id
      WHERE a.customer_id = v_customer_id
        AND (v_status_filter IS NULL OR a.status = ANY(string_to_array(v_status_filter, ',')))
        AND (v_booking_type_filter IS NULL OR a.booking_type = v_booking_type_filter)
      ORDER BY
        CASE WHEN v_order_asc THEN a.checked_in_at END ASC NULLS LAST,
        CASE WHEN v_order_asc THEN a.scheduled_at END ASC NULLS LAST,
        CASE WHEN NOT v_order_asc THEN a.checked_in_at END DESC NULLS LAST,
        CASE WHEN NOT v_order_asc THEN a.scheduled_at END DESC NULLS LAST
    ) sub;
  END IF;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_appointments(UUID, TEXT, TEXT, BOOLEAN, BOOLEAN) TO anon, authenticated;
