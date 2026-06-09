# Schema validation for notifications (migration 035)

Baseline: [`schema_dump_results_Full.sql`](schema_dump_results_Full.sql) (snapshot ~2026-06-05).

Before applying [`035_notifications_system.sql`](035_notifications_system.sql) in production, run [`get_live_schema.sql`](get_live_schema.sql) in the Supabase SQL Editor and compare:

| Object | Expected | Used by notifications |
|--------|----------|----------------------|
| `profiles.role` | `user_role` enum | Fan-out by role |
| `notifications` | 9 columns + new `metadata` | In-app store |
| `appointments.status` | includes `ready_for_checkout` | Status dispatch |
| `appointment_status_history` | 7 columns | Primary trigger hook |
| `appointment_service_history` | from migration 034 | Service change alerts |
| `loyalty_transactions` | from migration 024 | Loyalty alerts |
| `time_off_requests` | staff_id, status | Time-off alerts |
| `inventory.reorder_threshold` | numeric | Low-stock alerts |

**Auth note:** App uses phone + anon key; all notification writes must use SECURITY DEFINER RPCs/triggers (not client INSERT).

**Post-apply:** Enable Realtime on `notifications` if `ALTER PUBLICATION` fails (Dashboard → Database → Replication).
