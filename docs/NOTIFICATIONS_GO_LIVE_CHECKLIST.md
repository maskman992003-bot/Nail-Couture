# Notifications Go-Live Checklist

Step-by-step rollout for the Nail Couture notification system. Use this after code is merged; run items **in order**.

**Related docs:** [`PUSH_AND_MESSAGING_SETUP.md`](PUSH_AND_MESSAGING_SETUP.md) · [`sql/SCHEMA_VALIDATION_NOTIFICATIONS.md`](../sql/SCHEMA_VALIDATION_NOTIFICATIONS.md)

---

## Quick status

| Milestone | Where | Done? |
|-----------|--------|-------|
| Pre-flight schema check | SQL Editor | ☐ |
| Migration 035 + 036 (in-app core) | SQL Editor | ☐ |
| Migration 037 (push infra) | SQL Editor | ☐ |
| Migration 038 (SMS/email gated off) | SQL Editor | ☐ |
| Migration 039 (P1 extra events) | SQL Editor | ☐ |
| Migration 040 (mute preferences) | SQL Editor | ☐ |
| Migration 042 (delete RPCs) | SQL Editor | ☐ |
| Realtime on `notifications` | Dashboard | ☐ |
| P0 manual app tests | App (web + mobile) | ☐ |
| Bell ring + sound on new notification | Device / browser | ☐ |
| Delete from panel + profile history | App | ☐ |
| Deploy `send-notification-push` | CLI | ☐ |
| Push webhook | Dashboard | ☐ |
| Mobile dev client rebuild | CLI / EAS | ☐ |
| Push end-to-end test | Device | ☐ |
| Commit + deploy app code | Git / build | ☐ |

**Phase 3 (SMS/email)** is intentionally deferred — see [Phase 3 — later](#phase-3--smsemail-later).

---

## Before you start

- [ ] Supabase project access (SQL Editor + Dashboard + CLI linked to project)
- [ ] App builds from current branch with notification UI (`Sidebar`, mobile bell, Settings preferences)
- [ ] Run [`sql/041_verify_notifications_rollout.sql`](../sql/041_verify_notifications_rollout.sql) to see what is already applied

---

## Phase 0 — Pre-flight (SQL Editor)

**Where:** Supabase → **SQL Editor**

1. Run [`sql/get_live_schema.sql`](../sql/get_live_schema.sql) (if present) or inspect live schema.
2. Compare against [`sql/SCHEMA_VALIDATION_NOTIFICATIONS.md`](../sql/SCHEMA_VALIDATION_NOTIFICATIONS.md):

   | Object | Required for notifications |
   |--------|---------------------------|
   | `profiles.role` | `user_role` enum |
   | `notifications` | + `metadata` column |
   | `appointments.status` | includes `ready_for_checkout` |
   | `appointment_status_history` | trigger hook |
   | `appointment_service_history` | migration 034 |
   | `loyalty_transactions` | migration 024 |
   | `time_off_requests` | staff time-off alerts |
   | `inventory.reorder_threshold` | low-stock alerts |

3. If anything is missing, apply prerequisite migrations **before** 035.

---

## Phase 1 — In-app core (SQL Editor)

**Where:** Supabase → **SQL Editor** — run each file once, in order.

| Step | File | What it adds |
|------|------|--------------|
| 1 | [`sql/035_notifications_system.sql`](../sql/035_notifications_system.sql) | Writers, triggers, appointment/loyalty/inventory alerts |
| 2 | [`sql/036_fix_notifications_reference_fkey.sql`](../sql/036_fix_notifications_reference_fkey.sql) | Polymorphic `reference_id` (no legacy FK) |

**Dashboard (if SQL realtime step no-ops):**

- [ ] Database → **Replication** → enable **`notifications`** for Realtime

**Verify (SQL Editor):**

```sql
-- Should return rows without error
SELECT proname FROM pg_proc
WHERE proname IN ('create_notification', 'get_my_notifications', 'notify_roles')
ORDER BY proname;

SELECT column_name FROM information_schema.columns
WHERE table_name = 'notifications' AND column_name = 'metadata';
```

**App smoke test:**

- [ ] Log in as staff → bell appears in web `Sidebar` or mobile header
- [ ] Unread badge increments when a workflow fires (see Phase 1 QA below)

---

## Phase 1 QA — Manual scenarios (App)

**Where:** Run workflows in the app; confirm rows with [`sql/035_notifications_test.sql`](../sql/035_notifications_test.sql) queries.

| Scenario | Expected notification types |
|----------|----------------------------|
| Walk-in check-in | Customer: `checked_in` · Admin: `lobby_waiting` |
| Assign technician | Customer: `technician_assigned` · Tech: `new_assignment` |
| Send to checkout | Cashier: `checkout_ready` · Customer + tech checkout alerts |
| Process payment | Customer: `payment_receipt`, `loyalty_earned` |
| Customer cancel | Customer: `appointment_cancelled` · Admin: `customer_cancelled` |
| Time-off submit | Owner/partner: `time_off_request` |
| Time-off approve/deny | Staff: `time_off_decision` |
| Customer edit booking | Customer: `appointment_updated` · Admin: `customer_booking_edit` |

**UI checks:**

- [ ] Bell badge updates **without** opening the notification panel
- [ ] Tapping a notification navigates to the right screen (mobile)
- [ ] Mark read / mark all read works
- [ ] No duplicate rows within 5 minutes (run duplicate query in test file)

**Local alerts (optional, no webhook):**

- [ ] Grant browser / device notification permission
- [ ] With app logged in, new notification shows a local alert when tab/app is backgrounded

---

## Phase 2 — Push infra SQL (SQL Editor)

**Where:** Supabase → **SQL Editor**

| Step | File |
|------|------|
| 3 | [`sql/037_push_and_messaging.sql`](../sql/037_push_and_messaging.sql) |
| 4 | [`sql/038_gate_external_messaging.sql`](../sql/038_gate_external_messaging.sql) |
| 5 | [`sql/039_p1_notification_events.sql`](../sql/039_p1_notification_events.sql) |
| 6 | [`sql/040_notification_preferences.sql`](../sql/040_notification_preferences.sql) |
| 7 | [`sql/042_notification_delete.sql`](../sql/042_notification_delete.sql) |

**Verify (SQL Editor):**

```sql
SELECT to_regclass('public.device_push_tokens') IS NOT NULL AS has_push_tokens;
SELECT to_regclass('public.notification_push_queue') IS NOT NULL AS has_push_queue;
SELECT external_messaging_enabled, appointment_reminders_enabled
FROM notification_settings WHERE id = 1;
-- Expect both false after 038

SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'notification_preferences';
```

Or run the full script: [`sql/041_verify_notifications_rollout.sql`](../sql/041_verify_notifications_rollout.sql).

**039 spot checks (after running migration):**

- [ ] Sign waiver → admin + customer `waiver_signed`
- [ ] Add staff profile → management `staff_added`
- [ ] Create/delete shift → employee `schedule_changed`
- [ ] Loyalty reward at check-in → cashier `loyalty_at_checkout`

**040 spot checks:**

- [ ] Settings → mute a type (e.g. `lobby_waiting`) → trigger that workflow → no in-app row for that user
- [ ] Unmute → workflow fires again

**042 spot checks (delete UX):**

- [ ] Open notification panel → delete one row → gone from panel and profile Activity/history
- [ ] **Clear all** → empty everywhere (hard delete, not recoverable)
- [ ] RPCs: `delete_notification`, `delete_all_my_notifications`

---

## Phase 1b — Bell, sound, and delete UX (app)

After migration 042 and app deploy:

| Check | Web | Mobile |
|-------|-----|--------|
| Persistent bell visible on every page | Sidebar bell (desktop + mobile nav) | Header bell in `UserHeaderActions` |
| Bell rings/shakes on new unread | CSS `animate-bell-ring` | Animated rotation on bell |
| Foreground sound on new notification | Web Audio chime | Expo local alert with `sound: 'default'` |
| Delete from slide-over panel | × per row + Clear all | × per row + Clear all |
| Delete from profile history | Customer Profile → Activity tab | Customer Profile → Overview |

- [ ] Browser/device prompts for notification permission once per session (web)
- [ ] Trigger workflow → bell animates + sound plays while app is in foreground

---

## Phase 2 — Mobile push (CLI + Dashboard)

### 1. Deploy edge function

**Where:** Terminal (repo root, Supabase CLI logged in)

```bash
supabase functions deploy send-notification-push
```

- [ ] Function visible under Supabase → **Edge Functions**

### 2. Database webhook

**Where:** Supabase → **Database** → **Webhooks** → Create

| Field | Value |
|-------|--------|
| Name | `notification-push-on-insert` (any name) |
| Table | `notification_push_queue` |
| Events | **Insert** |
| Type | Supabase Edge Function |
| Function | `send-notification-push` |
| HTTP method | POST |
| Headers | Include service role / anon as required by your project webhook setup |

- [ ] Webhook created and enabled

### 3. Mobile dev client

**Where:** Terminal — push **does not work in Expo Go**

```bash
cd apps/mobile
npm run build:dev:ios    # or build:dev:android
```

Install the new dev build on a physical device.

- [ ] User grants notification permission on first launch / login
- [ ] After login, token registered:

```sql
SELECT profile_id, platform, left(expo_push_token, 20) AS token_prefix, last_seen_at
FROM device_push_tokens
ORDER BY last_seen_at DESC
LIMIT 5;
```

### 4. End-to-end push test

1. Log in on **physical device** with dev build.
2. Trigger a salon workflow that notifies that user (e.g. assign tech, check-in).
3. Confirm queue processes:

```sql
SELECT status, COUNT(*) FROM notification_push_queue GROUP BY status;
SELECT * FROM notification_push_queue ORDER BY created_at DESC LIMIT 5;
```

- [ ] Row goes `pending` → `sent` (or `skipped` if no token — expected on simulators)
- [ ] Push arrives when app is **backgrounded or killed**

Feature flag (already on in code): `global.pushNotifications` in [`packages/shared/src/constants/featureFlags.js`](../packages/shared/src/constants/featureFlags.js).

---

## Phase 3 — SMS/email (later)

**Skip until Twilio + Resend are configured.** Infrastructure is ready but **disabled** after migration 038.

When ready:

1. **CLI:** `supabase functions deploy process-external-messages` and `send-appointment-reminders`
2. **Dashboard:** Secrets — `TWILIO_*`, `RESEND_*`
3. **Dashboard:** Webhook — `external_message_queue` INSERT → `process-external-messages`
4. **SQL Editor:**

```sql
UPDATE notification_settings
SET external_messaging_enabled = true,
    appointment_reminders_enabled = true,
    updated_at = now()
WHERE id = 1;
```

5. **Code:** set `global.externalMessaging` and `customer.appointmentReminders` to `true` in `featureFlags.js`
6. **Dashboard:** Cron for `send-appointment-reminders` — `0 * * * *`

Details: [`PUSH_AND_MESSAGING_SETUP.md`](PUSH_AND_MESSAGING_SETUP.md) §3.

---

## App code deploy

After SQL is applied on Supabase:

- [ ] Merge notification branch / commit untracked notification files
- [ ] Deploy web app build
- [ ] Ship mobile dev/production build with push entitlements

**Known gap (resolved):** Customer web now has live notification history on Profile → Activity with delete; persistent bell on all web pages matches mobile header bell.

---

## Rollback / disable

**Stop SMS/email only:**

```sql
UPDATE notification_settings
SET external_messaging_enabled = false, appointment_reminders_enabled = false
WHERE id = 1;
```

**Disable push processing:** disable or delete the `notification_push_queue` webhook in Dashboard (in-app notifications still work).

**Revert a mute for one user:**

```sql
UPDATE profiles
SET notification_preferences = '{"muted_types":[]}'::jsonb
WHERE phone = '+1XXXXXXXXXX';
```

---

## Sign-off

When all checked:

- [ ] Phase 1 QA complete
- [ ] Migrations 035–040 applied (verified via 041 script)
- [ ] Phase 2 push working on a real device (or consciously deferred)
- [ ] Phase 3 deferred with 038 keeping external messaging off
- [ ] Team knows where preferences live: web Settings / Customer Profile, mobile Settings
