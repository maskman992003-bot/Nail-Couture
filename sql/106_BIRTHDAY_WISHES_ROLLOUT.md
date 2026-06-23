# Migration 106 — Birthday Wishes Rollout

Run after `105_drop_legacy_tier_column.sql` in the Supabase SQL Editor.

## Apply

1. Paste and execute [`106_birthday_wishes.sql`](./106_birthday_wishes.sql).

2. Deploy the edge function:

```bash
supabase functions deploy send-birthday-wishes
```

3. Schedule a daily cron in Supabase Dashboard (Edge Functions → Cron):

| Field | Value |
|-------|--------|
| Function | `send-birthday-wishes` |
| Schedule | `0 14 * * *` (9:00 AM US Eastern, standard time) |

During daylight saving time (EDT), use `0 13 * * *` for 9:00 AM local.

4. Enable birthday wishes:

```sql
UPDATE notification_settings
SET birthday_wishes_enabled = true, updated_at = now()
WHERE id = 1;
```

5. (Optional) Enable SMS/email when Twilio/Resend are configured:

```sql
UPDATE notification_settings
SET external_messaging_enabled = true, updated_at = now()
WHERE id = 1;
```

## Tier bonus points

| Tier | Points | Reward value |
|------|--------|--------------|
| Regular Customer | 0 | Message only |
| Pearl | 200 | $10 |
| Atelier | 300 | $15 |
| Diamond | 500 | $25 |

Points are awarded silently; the birthday notification includes the bonus amount in the message body.

## Manual test

Set a test customer's birthday to today (MM-DD format):

```sql
UPDATE profiles
SET birthday = to_char(now() AT TIME ZONE 'America/New_York', 'MM-DD')
WHERE id = '<customer_uuid>';
```

Run the RPC:

```sql
SELECT send_birthday_wishes();
```

Expected:

- One `birthday_wish` notification (in-app + push if token registered)
- SMS/email if `external_messaging_enabled = true` and customer opted in to promotions
- `birthday_bonus` loyalty transaction when tier has points > 0
- Row in `birthday_wish_log` for the current year

Verify:

```sql
SELECT * FROM birthday_wish_log WHERE profile_id = '<customer_uuid>';
SELECT * FROM notifications WHERE recipient_id = '<customer_uuid>' AND type = 'birthday_wish' ORDER BY created_at DESC LIMIT 1;
SELECT * FROM loyalty_transactions WHERE profile_id = '<customer_uuid>' AND transaction_type = 'birthday_bonus' ORDER BY created_at DESC LIMIT 1;
```

## Disable

```sql
UPDATE notification_settings
SET birthday_wishes_enabled = false, updated_at = now()
WHERE id = 1;
```

## Rollback note

Drop `birthday_wish_log`, remove `birthday_wishes_enabled` column, restore prior `award_loyalty_points` and `enqueue_external_message_for_notification` from migrations 104 and 038.
