# Migration 119 — Birthday demo (phone 4444444444)

Run in the Supabase SQL Editor after [`107_birthday_lock.sql`](./107_birthday_lock.sql).

## Demo customer

| Field | Value |
|-------|--------|
| Phone | `4444444444` |
| Name | asd |
| Profile id | `85c5ee1d-9c51-42c6-a6de-cb07403a332d` |
| Tier | Diamond (500 birthday pts / $25) |

The app API has already aligned birthday + lock. **You still need to run the SQL script** to enable `birthday_wishes_enabled` and trigger the send (requires SQL Editor / service role).

## Apply

Paste and execute [`119_birthday_demo_setup.sql`](./119_birthday_demo_setup.sql) in Supabase SQL Editor.

## Expected results

`send_birthday_wishes` should return `wishes_sent: 1` and `points_awarded_total: 500`.

In the app (log in as **4444444444**):

- Notification → **Happy Birthday, asd!** + 500 Vault points
- Digital Wallet → +500 points
- My Account → birthday month banner
- Staff CRM → birthday month banner + **Log birthday perk**

## Re-run same day

Delete log row then `SELECT send_birthday_wishes();` — see script comments in [`119_birthday_demo_setup.sql`](./119_birthday_demo_setup.sql).
