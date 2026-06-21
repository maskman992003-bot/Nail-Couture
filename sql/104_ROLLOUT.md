# Migration 104 — Rolling Loyalty Rollout

Run after `103_founding_legacy_cap_100.sql` in the Supabase SQL Editor.

## Apply

1. Paste and execute [`104_rolling_loyalty_tiers.sql`](./104_rolling_loyalty_tiers.sql).
2. Recompute all profiles:

```sql
SELECT backfill_wallet_state();
```

3. Expire any lots past due and sync balances:

```sql
SELECT expire_loyalty_points();
```

4. Drop the obsolete legacy tier column (Silver/Gold/…):

```sql
-- Or run sql/105_drop_legacy_tier_column.sql
ALTER TABLE profiles DROP COLUMN IF EXISTS tier;
```

## Optional nightly job

Schedule in Supabase (Dashboard → Database → Extensions → pg_cron) or an external cron:

```sql
SELECT backfill_wallet_state();
SELECT expire_loyalty_points();
```

Wallet reads also lazy-refresh rolling spend and tiers via `get_wallet_snapshot`.

## Manual verification checklist

| Scenario | Expected |
|----------|----------|
| $400 rolling spend, non-FM | `regular_customer`, 1.0× earn, no membership card, 3mo point expiry on new earns |
| $600 rolling spend | `pearl`, 1.1× earn, membership card shown |
| $1,800 rolling spend | `atelier`, 1.2× earn |
| $3,200 rolling spend | `diamond_couture` (display "Diamond"), 1.5× earn |
| Vanguard FM, $200 spend, within 1yr of `founding_awarded_at` | Effective `diamond_couture`, earned tier from spend |
| Legacy FM, $200 spend, within 1yr | Effective `atelier`, earned `regular_customer` |
| FM after 1 year | Tier follows rolling spend only (no floor) |
| Checkout ages out of 365-day window | Tier drops on next `get_wallet_snapshot` |
| Vault milestone claim | FIFO deduct from oldest non-expired lot |
| `process_checkout` response | Still includes `wallet_snapshot`, `founding_result`, `points_earned` |

## Spot checks (SQL)

```sql
-- Tier from rolling spend
SELECT id, rolling_spend_12m, loyalty_tier, loyalty_tier_earned, founding_type, founding_spot
FROM profiles
WHERE id = '<customer_uuid>';

-- Wallet snapshot JSON
SELECT get_wallet_snapshot('<customer_uuid>');

-- Active point lots
SELECT * FROM loyalty_point_lots
WHERE profile_id = '<customer_uuid>' AND points_remaining > 0
ORDER BY expires_at;
```

## Rollback note

This migration renames `calendar_spend_ytd` → `rolling_spend_12m` and replaces core RPCs. Rollback requires restoring prior function bodies from migrations 100–103 and reversing the column rename.
