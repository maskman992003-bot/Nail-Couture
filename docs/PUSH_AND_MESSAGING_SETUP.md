# Push Notifications & SMS/Email Setup

> **Go-live:** Use the step-by-step checklist in [`NOTIFICATIONS_GO_LIVE_CHECKLIST.md`](NOTIFICATIONS_GO_LIVE_CHECKLIST.md).  
> **Verify migrations:** Run [`sql/041_verify_notifications_rollout.sql`](../sql/041_verify_notifications_rollout.sql) in the SQL Editor.

## Current rollout status

| Channel | Status | Action now |
|---------|--------|------------|
| **In-app** | Active | Done (035 + 036) |
| **Mobile push** | Ready — configure next | SQL 037 + edge fn + webhooks + app rebuild |
| **SMS / email** | **Infrastructure only — disabled** | Run 038; enable later when providers are configured |

SMS and email **do not send** until you explicitly enable them in the database (see below). No Twilio/Resend setup is required to continue development.

---

## 1. SQL migrations (in order)

| File | Purpose |
|------|---------|
| [`sql/037_push_and_messaging.sql`](../sql/037_push_and_messaging.sql) | Push tokens, delivery queues, reminder RPC |
| [`sql/038_gate_external_messaging.sql`](../sql/038_gate_external_messaging.sql) | **Disables SMS/email by default** |
| [`sql/039_p1_notification_events.sql`](../sql/039_p1_notification_events.sql) | Waiver, staff, schedule, loyalty P1 alerts |
| [`sql/040_notification_preferences.sql`](../sql/040_notification_preferences.sql) | Per-user mute toggles (`profiles.notification_preferences`) |
| [`sql/042_notification_delete.sql`](../sql/042_notification_delete.sql) | Hard-delete RPCs for panel + profile history |
| [`sql/106_birthday_wishes.sql`](../sql/106_birthday_wishes.sql) | Daily birthday wishes + tier bonus points |

**Delete behavior:** Notifications removed via **Clear all** or per-row delete are **permanently deleted** from the database (not soft-deleted).

---

## 2. Mobile push (Phase 2 — do this next)

### Deploy edge function

```bash
supabase functions deploy send-notification-push
```

### Database webhook

| Field | Value |
|-------|--------|
| Table | `notification_push_queue` |
| Events | INSERT |
| Function | `send-notification-push` |

### Salon announcements fan-out (after migrations 049 + 050)

**Default (no webhook required):** After `send_salon_announcement`, the Announcements UI calls `drain_announcement_fanout` to create notifications in batches. On page load it also runs `resume_pending_announcement_fanouts` for any stuck `pending` rows.

Run migration `sql/050_fix_announcement_fanout_delivery.sql` on your database.

**Optional webhook** (background processing if the sender closes the tab immediately):

```bash
supabase functions deploy process-announcement-fanout
```

| Field | Value |
|-------|--------|
| Table | `announcement_fanout_queue` |
| Events | INSERT |
| Function | `process-announcement-fanout` |

### Mobile app

Rebuild dev client (push does not work in Expo Go):

```bash
cd apps/mobile
npm run build:dev:ios   # or build:dev:android
```

Tokens register on login via `register_push_token`. Verify:

```sql
SELECT * FROM device_push_tokens ORDER BY last_seen_at DESC LIMIT 5;
```

---

## 3. SMS / email (Phase 3 — enable later)

**Skip this section until you are ready to send real messages.**

When ready:

1. Deploy edge functions:
   ```bash
   supabase functions deploy process-external-messages
   supabase functions deploy send-appointment-reminders
   supabase functions deploy send-birthday-wishes
   ```

2. Add secrets: `TWILIO_*`, `RESEND_*` (see previous table in git history or provider docs)

3. Create webhook: `external_message_queue` INSERT → `process-external-messages`

4. **Enable in database:**
   ```sql
   UPDATE notification_settings
   SET
     external_messaging_enabled = true,
     appointment_reminders_enabled = true,
     updated_at = now()
   WHERE id = 1;
   ```

5. Set app flags in [`featureFlags.js`](../packages/shared/src/constants/featureFlags.js):
   - `global.externalMessaging = true`
   - `customer.appointmentReminders = true`

6. Schedule `send-appointment-reminders` cron: `0 * * * *`

To disable again:

```sql
UPDATE notification_settings
SET external_messaging_enabled = false, appointment_reminders_enabled = false
WHERE id = 1;
```

---

## 4. Customer prefs (used when SMS/email is enabled)

| Column | Effect |
|--------|--------|
| `profiles.sms_reminders` | SMS opt-in (default `true`) |
| `profiles.email_promotions` | Email fallback |
| `profiles.preferred_contact` | `phone`, `email`, or `sms` |

---

## 5. P1 in-app events (migration 039)

Run [`sql/039_p1_notification_events.sql`](../sql/039_p1_notification_events.sql) for:

- Waiver signed → admin + customer confirmation
- New staff (technician/cashier/admin) → management alert
- Shift create/delete → employee schedule alert
- Loyalty reward reserved at check-in → cashier alert

## 6. Notification preferences (migration 040)

Run [`sql/040_notification_preferences.sql`](../sql/040_notification_preferences.sql) for per-user **in-app mute** toggles:

- `profiles.notification_preferences.muted_types` — array of notification type strings
- `create_notification` skips muted types (push/SMS queues are not created for skipped rows)
- Settings UI: web **Settings** (staff), **Customer Profile → Preferences** (customers), mobile **Settings** screens

Feature flag: `global.notificationPreferences` in `packages/shared/src/constants/featureFlags.js`.

## 7. Delete notifications (migration 042)

Run [`sql/042_notification_delete.sql`](../sql/042_notification_delete.sql) for hard-delete from the notification panel and profile history:

- `delete_notification(p_phone, p_notif_id)` — remove one row
- `delete_all_my_notifications(p_phone)` — clear full history

This is **not recoverable**. Muted types (040) still prevent new rows from being created.

## 8. Local alerts (works without push webhook)

When logged in, new in-app notifications show **local device alerts** (Expo on mobile; browser notifications on web when the tab is hidden). No Supabase webhook required for this.

Grant notification permission on the device/browser for best results.

## 9. Verify remote push (optional — when app is fully closed)

```sql
SELECT status, COUNT(*) FROM notification_push_queue GROUP BY status;
```

Trigger a salon workflow with a logged-in mobile user → expect `pending` then `sent` after webhook + edge function are configured.

## 10. Birthday wishes (migration 106)

Run [`sql/106_birthday_wishes.sql`](../sql/106_birthday_wishes.sql) and follow [`sql/106_BIRTHDAY_WISHES_ROLLOUT.md`](../sql/106_BIRTHDAY_WISHES_ROLLOUT.md).

Daily cron sends a personalized birthday wish to customers whose `profiles.birthday` (MM-DD) matches today (America/New_York). Tier-based bonus points are awarded automatically:

| Tier | Points |
|------|--------|
| Regular Customer | 0 (message only) |
| Pearl | 200 ($10) |
| Atelier | 300 ($15) |
| Diamond | 500 ($25) |

**Enable:**

```sql
UPDATE notification_settings
SET birthday_wishes_enabled = true, updated_at = now()
WHERE id = 1;
```

**Schedule:** `send-birthday-wishes` edge function — `0 14 * * *` (9 AM US Eastern, standard time).

Birthday SMS/email uses `profiles.email_promotions` as the opt-in gate (promotional). In-app and push work without external messaging enabled.

**Manual test:**

```sql
SELECT send_birthday_wishes();
```
