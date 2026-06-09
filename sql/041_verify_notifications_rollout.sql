-- Verification: which notification migrations appear applied?
-- Run in Supabase SQL Editor. Each row should show applied = true before go-live sign-off.

WITH checks AS (
  SELECT '035_metadata_column' AS check_id,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'notifications'
        AND column_name = 'metadata'
    ) AS applied

  UNION ALL SELECT '035_create_notification',
    EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = 'create_notification')

  UNION ALL SELECT '035_get_my_notifications',
    EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = 'get_my_notifications')

  UNION ALL SELECT '036_reference_id_no_legacy_fk',
    NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'notifications_online_booking_id_fkey'
    )

  UNION ALL SELECT '037_device_push_tokens',
    to_regclass('public.device_push_tokens') IS NOT NULL

  UNION ALL SELECT '037_notification_push_queue',
    to_regclass('public.notification_push_queue') IS NOT NULL

  UNION ALL SELECT '037_register_push_token',
    EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = 'register_push_token')

  UNION ALL SELECT '037_enqueue_notification_push',
    EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = 'enqueue_notification_push')

  UNION ALL SELECT '038_notification_settings',
    to_regclass('public.notification_settings') IS NOT NULL

  UNION ALL SELECT '038_external_messaging_disabled',
    COALESCE(
      (SELECT NOT external_messaging_enabled FROM notification_settings WHERE id = 1),
      false
    )

  UNION ALL SELECT '039_waiver_trigger',
    EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      WHERE c.relname = 'customer_waivers' AND t.tgname = 'trg_notify_waiver_signed'
    )

  UNION ALL SELECT '039_staff_created_trigger',
    EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      WHERE c.relname = 'profiles' AND t.tgname = 'trg_notify_staff_profile_created'
    )

  UNION ALL SELECT '040_notification_preferences_column',
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'notification_preferences'
    )

  UNION ALL SELECT '040_is_notification_type_enabled',
    EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = 'is_notification_type_enabled')

  UNION ALL SELECT '040_update_notification_preferences',
    EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = 'update_notification_preferences')

  UNION ALL SELECT '042_delete_notification',
    EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = 'delete_notification')

  UNION ALL SELECT '042_delete_all_my_notifications',
    EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = 'delete_all_my_notifications')
)
SELECT
  check_id,
  applied,
  CASE WHEN applied THEN 'ok' ELSE 'MISSING — run migration' END AS status
FROM checks
ORDER BY check_id;

-- Optional: recent notification activity
SELECT '--- recent notifications (last 10) ---' AS section;
SELECT n.created_at, n.type, n.title, p.role AS recipient_role
FROM notifications n
JOIN profiles p ON p.id = n.recipient_id
ORDER BY n.created_at DESC
LIMIT 10;

-- Optional: push queue summary (after 037 + webhook)
SELECT '--- push queue summary ---' AS section;
SELECT status, COUNT(*) AS cnt
FROM notification_push_queue
GROUP BY status
ORDER BY status;
