# Migration 107 — Birthday Lock Rollout

Run after [`106_birthday_wishes.sql`](./106_birthday_wishes.sql) in the Supabase SQL Editor.

## What this adds

- `profiles.birthday_locked_at` — stamped when a birthday is first saved
- DB trigger blocking customer birthday changes (staff override via RPC)
- `staff_update_customer_birthday` RPC for CRM edits
- Hardened `send_birthday_wishes()`:
  - Claim log row before awarding points (prevents double-send races)
  - 30-day advance rule (`birthday_locked_at` must be at least 30 days ago)
  - `birthday_mmdd` audit column on `birthday_wish_log`

## Apply

1. Paste and execute [`107_birthday_lock.sql`](./107_birthday_lock.sql).

2. Deploy updated web/mobile apps (customer settings + staff CRM use the new RPC and lock UI).

No edge function or cron changes are required.

## Manual tests

### 1. Lock on first set

```sql
UPDATE profiles
SET birthday = '06-15', birthday_locked_at = NULL
WHERE id = '<customer_uuid>';

UPDATE profiles SET birthday = '06-15' WHERE id = '<customer_uuid>';

SELECT birthday, birthday_locked_at FROM profiles WHERE id = '<customer_uuid>';
```

Expected: `birthday_locked_at` is populated.

### 2. Customer cannot change birthday

```sql
UPDATE profiles SET birthday = '12-25' WHERE id = '<customer_uuid>';
```

Expected: error — `Birthday cannot be changed. Contact the salon to update your birthday.`

### 3. Staff can change birthday

```sql
SELECT staff_update_customer_birthday(
  '<staff_phone>',
  '<customer_uuid>'::uuid,
  '12-25'
);
```

Expected: `{"success": true, "birthday": "12-25"}`

### 4. Birthday wish — claim-before-award

Set a test customer with birthday locked 30+ days ago:

```sql
UPDATE profiles
SET
  birthday = to_char(now() AT TIME ZONE 'America/New_York', 'MM-DD'),
  birthday_locked_at = now() - interval '31 days'
WHERE id = '<customer_uuid>';

DELETE FROM birthday_wish_log WHERE profile_id = '<customer_uuid>' AND wish_year = EXTRACT(YEAR FROM now())::integer;

SELECT send_birthday_wishes();
SELECT send_birthday_wishes();
```

Expected:

- First call: `wishes_sent` = 1
- Second call same day: `wishes_sent` = 0
- One row in `birthday_wish_log` with `birthday_mmdd` set

### 5. 30-day advance rule

```sql
UPDATE profiles
SET
  birthday = to_char(now() AT TIME ZONE 'America/New_York', 'MM-DD'),
  birthday_locked_at = now() - interval '1 day'
WHERE id = '<customer_uuid>';

DELETE FROM birthday_wish_log WHERE profile_id = '<customer_uuid>';

SELECT send_birthday_wishes();
```

Expected: `wishes_sent` = 0 (birthday too recently set).

## Verify in app

| Surface | Expected behavior |
|---------|-------------------|
| Customer settings (web/mobile) | Birthday read-only with “Contact the salon…” when locked |
| Staff customer detail | Birthday edits save via `staff_update_customer_birthday` |
| Registration / kiosk check-in | First birthday set still works and locks on save |

## Rollback note

Drop trigger `trg_enforce_birthday_lock`, function `enforce_birthday_lock`, function `staff_update_customer_birthday`, column `profiles.birthday_locked_at`, column `birthday_wish_log.birthday_mmdd`, and restore `send_birthday_wishes()` from migration 106.
