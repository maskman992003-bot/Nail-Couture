[
  {
    "table_name": "appointment_status_history",
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "appointment_status_history",
    "column_name": "appointment_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "appointment_status_history",
    "column_name": "previous_status",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointment_status_history",
    "column_name": "new_status",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "appointment_status_history",
    "column_name": "changed_by",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointment_status_history",
    "column_name": "changed_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "appointment_status_history",
    "column_name": "note",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointments",
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "appointments",
    "column_name": "customer_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointments",
    "column_name": "service_id",
    "data_type": "bigint",
    "udt_name": "int8",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointments",
    "column_name": "status",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": "'Checked-In'::text"
  },
  {
    "table_name": "appointments",
    "column_name": "checked_in_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "appointments",
    "column_name": "start_time",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointments",
    "column_name": "technician_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointments",
    "column_name": "final_price",
    "data_type": "numeric",
    "udt_name": "numeric",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointments",
    "column_name": "notes",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointments",
    "column_name": "add_ons",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointments",
    "column_name": "booking_type",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": "'walk_in'::text"
  },
  {
    "table_name": "appointments",
    "column_name": "scheduled_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointments",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "appointments",
    "column_name": "checked_in_by",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointments",
    "column_name": "start_time_new",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointments",
    "column_name": "refreshment_pref",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "customer_waivers",
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "customer_waivers",
    "column_name": "customer_phone",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "customer_waivers",
    "column_name": "customer_name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "customer_waivers",
    "column_name": "agreed_to_terms",
    "data_type": "boolean",
    "udt_name": "bool",
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "customer_waivers",
    "column_name": "signature_image",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "customer_waivers",
    "column_name": "signed_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "timezone('utc'::text, now())"
  },
  {
    "table_name": "customer_waivers",
    "column_name": "profile_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "inventory",
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "inventory",
    "column_name": "item_name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "inventory",
    "column_name": "category",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "inventory",
    "column_name": "quantity",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "NO",
    "column_default": "0"
  },
  {
    "table_name": "inventory",
    "column_name": "unit",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "inventory",
    "column_name": "reorder_threshold",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "NO",
    "column_default": "5"
  },
  {
    "table_name": "inventory",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "inventory",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "inventory_logs",
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "inventory_logs",
    "column_name": "inventory_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "inventory_logs",
    "column_name": "appointment_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "inventory_logs",
    "column_name": "customer_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "inventory_logs",
    "column_name": "quantity_changed",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "inventory_logs",
    "column_name": "reason",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "inventory_logs",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "notifications",
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "notifications",
    "column_name": "profile_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "notifications",
    "column_name": "reference_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "notifications",
    "column_name": "body",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "notifications",
    "column_name": "is_read",
    "data_type": "boolean",
    "udt_name": "bool",
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "notifications",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "notifications",
    "column_name": "recipient_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "notifications",
    "column_name": "title",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "notifications",
    "column_name": "type",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": "'system'::text"
  },
  {
    "table_name": "online_bookings_archived",
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "online_bookings_archived",
    "column_name": "profile_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "online_bookings_archived",
    "column_name": "service_id",
    "data_type": "bigint",
    "udt_name": "int8",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "online_bookings_archived",
    "column_name": "technician_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "online_bookings_archived",
    "column_name": "scheduled_time",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "online_bookings_archived",
    "column_name": "status",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "'pending'::text"
  },
  {
    "table_name": "online_bookings_archived",
    "column_name": "price",
    "data_type": "numeric",
    "udt_name": "numeric",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "online_bookings_archived",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "online_bookings_archived",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "payment_transactions",
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "payment_transactions",
    "column_name": "appointment_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "payment_transactions",
    "column_name": "customer_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "payment_transactions",
    "column_name": "technician_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "payment_transactions",
    "column_name": "cashier_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "payment_transactions",
    "column_name": "service_id",
    "data_type": "bigint",
    "udt_name": "int8",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "payment_transactions",
    "column_name": "amount",
    "data_type": "numeric",
    "udt_name": "numeric",
    "is_nullable": "NO",
    "column_default": "0"
  },
  {
    "table_name": "payment_transactions",
    "column_name": "discount_amount",
    "data_type": "numeric",
    "udt_name": "numeric",
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "table_name": "payment_transactions",
    "column_name": "discount_type",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "payment_transactions",
    "column_name": "final_amount",
    "data_type": "numeric",
    "udt_name": "numeric",
    "is_nullable": "NO",
    "column_default": "0"
  },
  {
    "table_name": "payment_transactions",
    "column_name": "payment_method",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "payment_transactions",
    "column_name": "status",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "'completed'::text"
  },
  {
    "table_name": "payment_transactions",
    "column_name": "notes",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "payment_transactions",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "profiles",
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "profiles",
    "column_name": "full_name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "profiles",
    "column_name": "loyalty_points",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "table_name": "profiles",
    "column_name": "tier",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": "'Silver'::text"
  },
  {
    "table_name": "profiles",
    "column_name": "refreshment_pref",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "profiles",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "profiles",
    "column_name": "email",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "profiles",
    "column_name": "nail_goal",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "profiles",
    "column_name": "role",
    "data_type": "USER-DEFINED",
    "udt_name": "user_role",
    "is_nullable": "YES",
    "column_default": "'customer'::user_role"
  },
  {
    "table_name": "profiles",
    "column_name": "phone",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "profiles",
    "column_name": "referral_code",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "profiles",
    "column_name": "referral_by",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "profiles",
    "column_name": "pin",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "profiles",
    "column_name": "birthday",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "service_categories",
    "column_name": "id",
    "data_type": "bigint",
    "udt_name": "int8",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "service_categories",
    "column_name": "name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "service_categories",
    "column_name": "sort_order",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "NO",
    "column_default": "0"
  },
  {
    "table_name": "service_categories",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "services",
    "column_name": "id",
    "data_type": "bigint",
    "udt_name": "int8",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "services",
    "column_name": "name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "services",
    "column_name": "price",
    "data_type": "numeric",
    "udt_name": "numeric",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "services",
    "column_name": "duration_minutes",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "YES",
    "column_default": "60"
  },
  {
    "table_name": "services",
    "column_name": "category",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "services",
    "column_name": "is_addon",
    "data_type": "boolean",
    "udt_name": "bool",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "services",
    "column_name": "description",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "shifts",
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "shifts",
    "column_name": "employee_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "shifts",
    "column_name": "shift_date",
    "data_type": "date",
    "udt_name": "date",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "shifts",
    "column_name": "shift_type",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "shifts",
    "column_name": "start_time",
    "data_type": "time without time zone",
    "udt_name": "time",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "shifts",
    "column_name": "end_time",
    "data_type": "time without time zone",
    "udt_name": "time",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "shifts",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "shifts",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "shifts",
    "column_name": "appointment_count",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "NO",
    "column_default": "0"
  },
  {
    "table_name": "shifts",
    "column_name": "confirmed_online_count",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "NO",
    "column_default": "0"
  },
  {
    "table_name": "staff_schedules",
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "staff_schedules",
    "column_name": "employee_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "staff_schedules",
    "column_name": "day_of_week",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "staff_schedules",
    "column_name": "shift_type",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "staff_schedules",
    "column_name": "start_time",
    "data_type": "time without time zone",
    "udt_name": "time",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "staff_schedules",
    "column_name": "end_time",
    "data_type": "time without time zone",
    "udt_name": "time",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "staff_schedules",
    "column_name": "is_active",
    "data_type": "boolean",
    "udt_name": "bool",
    "is_nullable": "NO",
    "column_default": "true"
  },
  {
    "table_name": "staff_schedules",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "staff_schedules",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "time_off_requests",
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "time_off_requests",
    "column_name": "employee_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "time_off_requests",
    "column_name": "start_date",
    "data_type": "date",
    "udt_name": "date",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "time_off_requests",
    "column_name": "end_date",
    "data_type": "date",
    "udt_name": "date",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "time_off_requests",
    "column_name": "reason",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "time_off_requests",
    "column_name": "status",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "'pending'::text"
  },
  {
    "table_name": "time_off_requests",
    "column_name": "reviewed_by",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "time_off_requests",
    "column_name": "reviewed_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "time_off_requests",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "time_off_requests",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()"
  }
]




[
  {
    "table_name": "appointment_status_history",
    "column_name": "id"
  },
  {
    "table_name": "appointments",
    "column_name": "id"
  },
  {
    "table_name": "customer_waivers",
    "column_name": "id"
  },
  {
    "table_name": "inventory",
    "column_name": "id"
  },
  {
    "table_name": "inventory_logs",
    "column_name": "id"
  },
  {
    "table_name": "notifications",
    "column_name": "id"
  },
  {
    "table_name": "online_bookings_archived",
    "column_name": "id"
  },
  {
    "table_name": "payment_transactions",
    "column_name": "id"
  },
  {
    "table_name": "profiles",
    "column_name": "id"
  },
  {
    "table_name": "service_categories",
    "column_name": "id"
  },
  {
    "table_name": "services",
    "column_name": "id"
  },
  {
    "table_name": "shifts",
    "column_name": "id"
  },
  {
    "table_name": "staff_schedules",
    "column_name": "id"
  },
  {
    "table_name": "time_off_requests",
    "column_name": "id"
  }
]


[
  {
    "constraint_name": "appointment_status_history_appointment_id_fkey",
    "table_name": "appointment_status_history",
    "column_name": "appointment_id",
    "foreign_table": "appointments",
    "foreign_column": "id"
  },
  {
    "constraint_name": "appointment_status_history_changed_by_fkey",
    "table_name": "appointment_status_history",
    "column_name": "changed_by",
    "foreign_table": "profiles",
    "foreign_column": "id"
  },
  {
    "constraint_name": "appointments_checked_in_by_fkey",
    "table_name": "appointments",
    "column_name": "checked_in_by",
    "foreign_table": "profiles",
    "foreign_column": "id"
  },
  {
    "constraint_name": "appointments_client_id_fkey",
    "table_name": "appointments",
    "column_name": "customer_id",
    "foreign_table": "profiles",
    "foreign_column": "id"
  },
  {
    "constraint_name": "appointments_profile_id_fkey",
    "table_name": "appointments",
    "column_name": "customer_id",
    "foreign_table": "profiles",
    "foreign_column": "id"
  },
  {
    "constraint_name": "appointments_service_id_fkey",
    "table_name": "appointments",
    "column_name": "service_id",
    "foreign_table": "services",
    "foreign_column": "id"
  },
  {
    "constraint_name": "appointments_technician_id_fkey",
    "table_name": "appointments",
    "column_name": "technician_id",
    "foreign_table": "profiles",
    "foreign_column": "id"
  },
  {
    "constraint_name": "customer_waivers_profile_id_fkey",
    "table_name": "customer_waivers",
    "column_name": "profile_id",
    "foreign_table": "profiles",
    "foreign_column": "id"
  },
  {
    "constraint_name": "inventory_logs_appointment_id_fkey",
    "table_name": "inventory_logs",
    "column_name": "appointment_id",
    "foreign_table": "appointments",
    "foreign_column": "id"
  },
  {
    "constraint_name": "inventory_logs_customer_id_fkey",
    "table_name": "inventory_logs",
    "column_name": "customer_id",
    "foreign_table": "profiles",
    "foreign_column": "id"
  },
  {
    "constraint_name": "inventory_logs_inventory_id_fkey",
    "table_name": "inventory_logs",
    "column_name": "inventory_id",
    "foreign_table": "inventory",
    "foreign_column": "id"
  },
  {
    "constraint_name": "notifications_online_booking_id_fkey",
    "table_name": "notifications",
    "column_name": "reference_id",
    "foreign_table": "online_bookings_archived",
    "foreign_column": "id"
  },
  {
    "constraint_name": "notifications_profile_id_fkey",
    "table_name": "notifications",
    "column_name": "profile_id",
    "foreign_table": "profiles",
    "foreign_column": "id"
  },
  {
    "constraint_name": "notifications_target_user_id_fkey",
    "table_name": "notifications",
    "column_name": "recipient_id",
    "foreign_table": "profiles",
    "foreign_column": "id"
  },
  {
    "constraint_name": "online_bookings_profile_id_fkey",
    "table_name": "online_bookings_archived",
    "column_name": "profile_id",
    "foreign_table": "profiles",
    "foreign_column": "id"
  },
  {
    "constraint_name": "online_bookings_service_id_fkey",
    "table_name": "online_bookings_archived",
    "column_name": "service_id",
    "foreign_table": "services",
    "foreign_column": "id"
  },
  {
    "constraint_name": "online_bookings_technician_id_fkey",
    "table_name": "online_bookings_archived",
    "column_name": "technician_id",
    "foreign_table": "profiles",
    "foreign_column": "id"
  },
  {
    "constraint_name": "payment_transactions_appointment_id_fkey",
    "table_name": "payment_transactions",
    "column_name": "appointment_id",
    "foreign_table": "appointments",
    "foreign_column": "id"
  },
  {
    "constraint_name": "payment_transactions_cashier_id_fkey",
    "table_name": "payment_transactions",
    "column_name": "cashier_id",
    "foreign_table": "profiles",
    "foreign_column": "id"
  },
  {
    "constraint_name": "payment_transactions_customer_id_fkey",
    "table_name": "payment_transactions",
    "column_name": "customer_id",
    "foreign_table": "profiles",
    "foreign_column": "id"
  },
  {
    "constraint_name": "payment_transactions_service_id_fkey",
    "table_name": "payment_transactions",
    "column_name": "service_id",
    "foreign_table": "services",
    "foreign_column": "id"
  },
  {
    "constraint_name": "payment_transactions_technician_id_fkey",
    "table_name": "payment_transactions",
    "column_name": "technician_id",
    "foreign_table": "profiles",
    "foreign_column": "id"
  },
  {
    "constraint_name": "profiles_referral_by_fkey",
    "table_name": "profiles",
    "column_name": "referral_by",
    "foreign_table": "profiles",
    "foreign_column": "id"
  },
  {
    "constraint_name": "shifts_staff_id_fkey",
    "table_name": "shifts",
    "column_name": "employee_id",
    "foreign_table": "profiles",
    "foreign_column": "id"
  },
  {
    "constraint_name": "staff_schedules_staff_id_fkey",
    "table_name": "staff_schedules",
    "column_name": "employee_id",
    "foreign_table": "profiles",
    "foreign_column": "id"
  },
  {
    "constraint_name": "time_off_requests_reviewed_by_fkey",
    "table_name": "time_off_requests",
    "column_name": "reviewed_by",
    "foreign_table": "profiles",
    "foreign_column": "id"
  },
  {
    "constraint_name": "time_off_requests_staff_id_fkey",
    "table_name": "time_off_requests",
    "column_name": "employee_id",
    "foreign_table": "profiles",
    "foreign_column": "id"
  }
]



[
  {
    "constraint_name": "service_categories_name_key",
    "table_name": "service_categories",
    "column_name": "name"
  },
  {
    "constraint_name": "shifts_staff_id_shift_date_shift_type_key",
    "table_name": "shifts",
    "column_name": "shift_type"
  },
  {
    "constraint_name": "shifts_staff_id_shift_date_shift_type_key",
    "table_name": "shifts",
    "column_name": "employee_id"
  },
  {
    "constraint_name": "shifts_staff_id_shift_date_shift_type_key",
    "table_name": "shifts",
    "column_name": "shift_date"
  },
  {
    "constraint_name": "unique_staff_shift_date_type",
    "table_name": "shifts",
    "column_name": "employee_id"
  },
  {
    "constraint_name": "unique_staff_shift_date_type",
    "table_name": "shifts",
    "column_name": "shift_date"
  },
  {
    "constraint_name": "unique_staff_shift_date_type",
    "table_name": "shifts",
    "column_name": "shift_type"
  },
  {
    "constraint_name": "staff_schedules_staff_id_day_of_week_shift_type_key",
    "table_name": "staff_schedules",
    "column_name": "day_of_week"
  },
  {
    "constraint_name": "staff_schedules_staff_id_day_of_week_shift_type_key",
    "table_name": "staff_schedules",
    "column_name": "employee_id"
  },
  {
    "constraint_name": "staff_schedules_staff_id_day_of_week_shift_type_key",
    "table_name": "staff_schedules",
    "column_name": "shift_type"
  }
]


[
  {
    "table_name": "appointment_status_history",
    "constraint_name": "2200_19264_1_not_null",
    "check_clause": "id IS NOT NULL"
  },
  {
    "table_name": "appointment_status_history",
    "constraint_name": "2200_19264_2_not_null",
    "check_clause": "appointment_id IS NOT NULL"
  },
  {
    "table_name": "appointment_status_history",
    "constraint_name": "2200_19264_6_not_null",
    "check_clause": "changed_at IS NOT NULL"
  },
  {
    "table_name": "appointment_status_history",
    "constraint_name": "2200_19264_4_not_null",
    "check_clause": "new_status IS NOT NULL"
  },
  {
    "table_name": "appointments",
    "constraint_name": "appointments_status_check",
    "check_clause": "(status = ANY (ARRAY['confirmed'::text, 'waiting'::text, 'serving'::text, 'completed'::text, 'cancelled'::text, 'missed'::text, 'assigned_pending'::text]))"
  },
  {
    "table_name": "appointments",
    "constraint_name": "check_appointment_status",
    "check_clause": "(status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'waiting'::text, 'assigned_pending'::text, 'serving'::text, 'completed'::text, 'cancelled'::text, 'missed'::text]))"
  },
  {
    "table_name": "appointments",
    "constraint_name": "2200_17573_1_not_null",
    "check_clause": "id IS NOT NULL"
  },
  {
    "table_name": "customer_waivers",
    "constraint_name": "2200_20306_2_not_null",
    "check_clause": "customer_phone IS NOT NULL"
  },
  {
    "table_name": "customer_waivers",
    "constraint_name": "2200_20306_6_not_null",
    "check_clause": "signed_at IS NOT NULL"
  },
  {
    "table_name": "customer_waivers",
    "constraint_name": "2200_20306_5_not_null",
    "check_clause": "signature_image IS NOT NULL"
  },
  {
    "table_name": "customer_waivers",
    "constraint_name": "2200_20306_3_not_null",
    "check_clause": "customer_name IS NOT NULL"
  },
  {
    "table_name": "customer_waivers",
    "constraint_name": "2200_20306_1_not_null",
    "check_clause": "id IS NOT NULL"
  },
  {
    "table_name": "inventory",
    "constraint_name": "2200_18143_3_not_null",
    "check_clause": "category IS NOT NULL"
  },
  {
    "table_name": "inventory",
    "constraint_name": "2200_18143_1_not_null",
    "check_clause": "id IS NOT NULL"
  },
  {
    "table_name": "inventory",
    "constraint_name": "2200_18143_2_not_null",
    "check_clause": "item_name IS NOT NULL"
  },
  {
    "table_name": "inventory",
    "constraint_name": "stock_category_check",
    "check_clause": "(category = ANY (ARRAY['refreshment'::text, 'material'::text]))"
  },
  {
    "table_name": "inventory",
    "constraint_name": "2200_18143_4_not_null",
    "check_clause": "quantity IS NOT NULL"
  },
  {
    "table_name": "inventory",
    "constraint_name": "2200_18143_5_not_null",
    "check_clause": "unit IS NOT NULL"
  },
  {
    "table_name": "inventory",
    "constraint_name": "2200_18143_6_not_null",
    "check_clause": "reorder_threshold IS NOT NULL"
  },
  {
    "table_name": "inventory_logs",
    "constraint_name": "2200_19283_5_not_null",
    "check_clause": "quantity_changed IS NOT NULL"
  },
  {
    "table_name": "inventory_logs",
    "constraint_name": "2200_19283_1_not_null",
    "check_clause": "id IS NOT NULL"
  },
  {
    "table_name": "inventory_logs",
    "constraint_name": "2200_19283_7_not_null",
    "check_clause": "created_at IS NOT NULL"
  },
  {
    "table_name": "notifications",
    "constraint_name": "2200_18235_8_not_null",
    "check_clause": "title IS NOT NULL"
  },
  {
    "table_name": "notifications",
    "constraint_name": "2200_18235_1_not_null",
    "check_clause": "id IS NOT NULL"
  },
  {
    "table_name": "notifications",
    "constraint_name": "2200_18235_4_not_null",
    "check_clause": "body IS NOT NULL"
  },
  {
    "table_name": "notifications",
    "constraint_name": "2200_18235_7_not_null",
    "check_clause": "recipient_id IS NOT NULL"
  },
  {
    "table_name": "online_bookings_archived",
    "constraint_name": "online_bookings_status_check",
    "check_clause": "(status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]))"
  },
  {
    "table_name": "online_bookings_archived",
    "constraint_name": "2200_18197_1_not_null",
    "check_clause": "id IS NOT NULL"
  },
  {
    "table_name": "online_bookings_archived",
    "constraint_name": "2200_18197_2_not_null",
    "check_clause": "profile_id IS NOT NULL"
  },
  {
    "table_name": "online_bookings_archived",
    "constraint_name": "2200_18197_3_not_null",
    "check_clause": "service_id IS NOT NULL"
  },
  {
    "table_name": "online_bookings_archived",
    "constraint_name": "2200_18197_5_not_null",
    "check_clause": "scheduled_time IS NOT NULL"
  },
  {
    "table_name": "online_bookings_archived",
    "constraint_name": "2200_18197_6_not_null",
    "check_clause": "status IS NOT NULL"
  },
  {
    "table_name": "online_bookings_archived",
    "constraint_name": "2200_18197_7_not_null",
    "check_clause": "price IS NOT NULL"
  },
  {
    "table_name": "payment_transactions",
    "constraint_name": "payment_transactions_payment_method_check",
    "check_clause": "(payment_method = ANY (ARRAY['cash'::text, 'card'::text, 'other'::text]))"
  },
  {
    "table_name": "payment_transactions",
    "constraint_name": "2200_19223_1_not_null",
    "check_clause": "id IS NOT NULL"
  },
  {
    "table_name": "payment_transactions",
    "constraint_name": "2200_19223_7_not_null",
    "check_clause": "amount IS NOT NULL"
  },
  {
    "table_name": "payment_transactions",
    "constraint_name": "2200_19223_10_not_null",
    "check_clause": "final_amount IS NOT NULL"
  },
  {
    "table_name": "payment_transactions",
    "constraint_name": "2200_19223_12_not_null",
    "check_clause": "status IS NOT NULL"
  },
  {
    "table_name": "payment_transactions",
    "constraint_name": "2200_19223_14_not_null",
    "check_clause": "created_at IS NOT NULL"
  },
  {
    "table_name": "payment_transactions",
    "constraint_name": "payment_transactions_discount_type_check",
    "check_clause": "(discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text, 'loyalty'::text, 'coupon'::text]))"
  },
  {
    "table_name": "payment_transactions",
    "constraint_name": "payment_transactions_status_check",
    "check_clause": "(status = ANY (ARRAY['pending'::text, 'completed'::text, 'refunded'::text]))"
  },
  {
    "table_name": "profiles",
    "constraint_name": "2200_17548_1_not_null",
    "check_clause": "id IS NOT NULL"
  },
  {
    "table_name": "service_categories",
    "constraint_name": "2200_19864_2_not_null",
    "check_clause": "name IS NOT NULL"
  },
  {
    "table_name": "service_categories",
    "constraint_name": "2200_19864_3_not_null",
    "check_clause": "sort_order IS NOT NULL"
  },
  {
    "table_name": "service_categories",
    "constraint_name": "2200_19864_1_not_null",
    "check_clause": "id IS NOT NULL"
  },
  {
    "table_name": "services",
    "constraint_name": "2200_17566_3_not_null",
    "check_clause": "price IS NOT NULL"
  },
  {
    "table_name": "services",
    "constraint_name": "2200_17566_1_not_null",
    "check_clause": "id IS NOT NULL"
  },
  {
    "table_name": "services",
    "constraint_name": "2200_17566_2_not_null",
    "check_clause": "name IS NOT NULL"
  },
  {
    "table_name": "shifts",
    "constraint_name": "2200_18468_8_not_null",
    "check_clause": "created_at IS NOT NULL"
  },
  {
    "table_name": "shifts",
    "constraint_name": "2200_18468_11_not_null",
    "check_clause": "appointment_count IS NOT NULL"
  },
  {
    "table_name": "shifts",
    "constraint_name": "2200_18468_12_not_null",
    "check_clause": "confirmed_online_count IS NOT NULL"
  },
  {
    "table_name": "shifts",
    "constraint_name": "shifts_shift_type_check",
    "check_clause": "(shift_type = ANY (ARRAY['morning'::text, 'afternoon'::text, 'evening'::text, 'custom'::text]))"
  },
  {
    "table_name": "shifts",
    "constraint_name": "2200_18468_1_not_null",
    "check_clause": "id IS NOT NULL"
  },
  {
    "table_name": "shifts",
    "constraint_name": "2200_18468_2_not_null",
    "check_clause": "employee_id IS NOT NULL"
  },
  {
    "table_name": "shifts",
    "constraint_name": "2200_18468_3_not_null",
    "check_clause": "shift_date IS NOT NULL"
  },
  {
    "table_name": "shifts",
    "constraint_name": "2200_18468_4_not_null",
    "check_clause": "shift_type IS NOT NULL"
  },
  {
    "table_name": "shifts",
    "constraint_name": "2200_18468_5_not_null",
    "check_clause": "start_time IS NOT NULL"
  },
  {
    "table_name": "shifts",
    "constraint_name": "2200_18468_6_not_null",
    "check_clause": "end_time IS NOT NULL"
  },
  {
    "table_name": "shifts",
    "constraint_name": "2200_18468_9_not_null",
    "check_clause": "updated_at IS NOT NULL"
  },
  {
    "table_name": "staff_schedules",
    "constraint_name": "2200_18448_9_not_null",
    "check_clause": "updated_at IS NOT NULL"
  },
  {
    "table_name": "staff_schedules",
    "constraint_name": "staff_schedules_shift_type_check",
    "check_clause": "(shift_type = ANY (ARRAY['morning'::text, 'afternoon'::text, 'evening'::text, 'custom'::text]))"
  },
  {
    "table_name": "staff_schedules",
    "constraint_name": "staff_schedules_day_of_week_check",
    "check_clause": "((day_of_week >= 0) AND (day_of_week <= 6))"
  },
  {
    "table_name": "staff_schedules",
    "constraint_name": "2200_18448_1_not_null",
    "check_clause": "id IS NOT NULL"
  },
  {
    "table_name": "staff_schedules",
    "constraint_name": "2200_18448_2_not_null",
    "check_clause": "employee_id IS NOT NULL"
  },
  {
    "table_name": "staff_schedules",
    "constraint_name": "2200_18448_3_not_null",
    "check_clause": "day_of_week IS NOT NULL"
  },
  {
    "table_name": "staff_schedules",
    "constraint_name": "2200_18448_4_not_null",
    "check_clause": "shift_type IS NOT NULL"
  },
  {
    "table_name": "staff_schedules",
    "constraint_name": "2200_18448_5_not_null",
    "check_clause": "start_time IS NOT NULL"
  },
  {
    "table_name": "staff_schedules",
    "constraint_name": "2200_18448_6_not_null",
    "check_clause": "end_time IS NOT NULL"
  },
  {
    "table_name": "staff_schedules",
    "constraint_name": "2200_18448_7_not_null",
    "check_clause": "is_active IS NOT NULL"
  },
  {
    "table_name": "staff_schedules",
    "constraint_name": "2200_18448_8_not_null",
    "check_clause": "created_at IS NOT NULL"
  },
  {
    "table_name": "time_off_requests",
    "constraint_name": "2200_18487_10_not_null",
    "check_clause": "updated_at IS NOT NULL"
  },
  {
    "table_name": "time_off_requests",
    "constraint_name": "2200_18487_1_not_null",
    "check_clause": "id IS NOT NULL"
  },
  {
    "table_name": "time_off_requests",
    "constraint_name": "2200_18487_9_not_null",
    "check_clause": "created_at IS NOT NULL"
  },
  {
    "table_name": "time_off_requests",
    "constraint_name": "2200_18487_6_not_null",
    "check_clause": "status IS NOT NULL"
  },
  {
    "table_name": "time_off_requests",
    "constraint_name": "2200_18487_4_not_null",
    "check_clause": "end_date IS NOT NULL"
  },
  {
    "table_name": "time_off_requests",
    "constraint_name": "2200_18487_3_not_null",
    "check_clause": "start_date IS NOT NULL"
  },
  {
    "table_name": "time_off_requests",
    "constraint_name": "2200_18487_2_not_null",
    "check_clause": "employee_id IS NOT NULL"
  },
  {
    "table_name": "time_off_requests",
    "constraint_name": "time_off_requests_status_check",
    "check_clause": "(status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))"
  }
]


[
  {
    "typname": "user_role",
    "enum_values": "{super_admin,owner,partner,admin,cashier,technician,customer}"
  }
]



[
  {
    "table_name": "appointment_status_history",
    "rls_enabled": true,
    "rls_forced": false
  },
  {
    "table_name": "appointments",
    "rls_enabled": true,
    "rls_forced": false
  },
  {
    "table_name": "customer_waivers",
    "rls_enabled": true,
    "rls_forced": false
  },
  {
    "table_name": "inventory",
    "rls_enabled": true,
    "rls_forced": false
  },
  {
    "table_name": "inventory_logs",
    "rls_enabled": true,
    "rls_forced": false
  },
  {
    "table_name": "notifications",
    "rls_enabled": true,
    "rls_forced": false
  },
  {
    "table_name": "online_bookings_archived",
    "rls_enabled": true,
    "rls_forced": false
  },
  {
    "table_name": "payment_transactions",
    "rls_enabled": true,
    "rls_forced": false
  },
  {
    "table_name": "profiles",
    "rls_enabled": true,
    "rls_forced": true
  },
  {
    "table_name": "service_categories",
    "rls_enabled": true,
    "rls_forced": false
  },
  {
    "table_name": "services",
    "rls_enabled": true,
    "rls_forced": false
  },
  {
    "table_name": "shifts",
    "rls_enabled": true,
    "rls_forced": false
  },
  {
    "table_name": "staff_schedules",
    "rls_enabled": true,
    "rls_forced": false
  },
  {
    "table_name": "time_off_requests",
    "rls_enabled": true,
    "rls_forced": false
  }
]


[
  {
    "tablename": "appointment_status_history",
    "policyname": "Allow anon read appointment_status_history",
    "permissive": "PERMISSIVE",
    "roles": "{anon}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "appointment_status_history",
    "policyname": "Allow authenticated insert appointment_status_history",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "tablename": "appointments",
    "policyname": "Allow anon insert appointments",
    "permissive": "PERMISSIVE",
    "roles": "{anon}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "tablename": "appointments",
    "policyname": "Allow anon read appointments",
    "permissive": "PERMISSIVE",
    "roles": "{anon}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "customer_waivers",
    "policyname": "Allow all operations on customer_waivers",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": "true"
  },
  {
    "tablename": "customer_waivers",
    "policyname": "Allow authenticated users to view all waivers",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.role() = 'authenticated'::text)",
    "with_check": null
  },
  {
    "tablename": "customer_waivers",
    "policyname": "Allow management roles to view waivers",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() IN ( SELECT profiles.id\n   FROM profiles\n  WHERE (profiles.role = ANY (ARRAY['super_admin'::user_role, 'owner'::user_role, 'partner'::user_role, 'admin'::user_role]))))",
    "with_check": null
  },
  {
    "tablename": "customer_waivers",
    "policyname": "Allow public inserts for check-in",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "tablename": "customer_waivers",
    "policyname": "Customers can view own waivers",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = profile_id)",
    "with_check": null
  },
  {
    "tablename": "customer_waivers",
    "policyname": "admin_authenticated_select_policy",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "inventory",
    "policyname": "Allow all stock modifications",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": "true"
  },
  {
    "tablename": "inventory",
    "policyname": "Allow anon read inventory",
    "permissive": "PERMISSIVE",
    "roles": "{anon}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "inventory",
    "policyname": "Allow authenticated manage inventory",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": "true"
  },
  {
    "tablename": "inventory",
    "policyname": "Allow read stock",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "inventory_logs",
    "policyname": "Allow anon read inventory_logs",
    "permissive": "PERMISSIVE",
    "roles": "{anon}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "inventory_logs",
    "policyname": "Allow authenticated manage inventory_logs",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": "true"
  },
  {
    "tablename": "notifications",
    "policyname": "Admins can insert any",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "tablename": "notifications",
    "policyname": "Admins insert notifications",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM profiles\n  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'owner'::user_role, 'partner'::user_role, 'admin'::user_role])))))"
  },
  {
    "tablename": "notifications",
    "policyname": "Admins manage notifications",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM profiles\n  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'owner'::user_role, 'partner'::user_role, 'admin'::user_role])))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM profiles\n  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'owner'::user_role, 'partner'::user_role, 'admin'::user_role])))))"
  },
  {
    "tablename": "notifications",
    "policyname": "Allow anon insert notifications",
    "permissive": "PERMISSIVE",
    "roles": "{anon}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "tablename": "notifications",
    "policyname": "Allow anon read notifications",
    "permissive": "PERMISSIVE",
    "roles": "{anon}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "notifications",
    "policyname": "Users read own notifications",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "notifications",
    "policyname": "Users update own notifications",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "online_bookings_archived",
    "policyname": "Allow delete online bookings",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "online_bookings_archived",
    "policyname": "Allow insert online bookings",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "tablename": "online_bookings_archived",
    "policyname": "Allow read all online bookings",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "online_bookings_archived",
    "policyname": "Allow read own online bookings",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "online_bookings_archived",
    "policyname": "Allow update online bookings",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "true",
    "with_check": "true"
  },
  {
    "tablename": "payment_transactions",
    "policyname": "Allow anon insert payment_transactions",
    "permissive": "PERMISSIVE",
    "roles": "{anon}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "tablename": "payment_transactions",
    "policyname": "Allow anon read payment_transactions",
    "permissive": "PERMISSIVE",
    "roles": "{anon}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "payment_transactions",
    "policyname": "Allow authenticated manage payment_transactions",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": "true"
  },
  {
    "tablename": "profiles",
    "policyname": "Allow anon insert profiles",
    "permissive": "PERMISSIVE",
    "roles": "{anon}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "tablename": "profiles",
    "policyname": "Allow anon read profiles",
    "permissive": "PERMISSIVE",
    "roles": "{anon}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "profiles",
    "policyname": "Allow anon to read profiles",
    "permissive": "PERMISSIVE",
    "roles": "{anon}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "profiles",
    "policyname": "Allow authenticated update profiles",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "true",
    "with_check": "true"
  },
  {
    "tablename": "profiles",
    "policyname": "Allow public read of profiles",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "profiles",
    "policyname": "Allow public update of own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "profiles",
    "policyname": "Customers can update own profile",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = id)",
    "with_check": null
  },
  {
    "tablename": "profiles",
    "policyname": "Customers can view own profile",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = id)",
    "with_check": null
  },
  {
    "tablename": "profiles",
    "policyname": "Enable insert for authenticated users only",
    "permissive": "PERMISSIVE",
    "roles": "{anon}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "tablename": "profiles",
    "policyname": "Users can view own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = id)",
    "with_check": null
  },
  {
    "tablename": "profiles",
    "policyname": "profiles_self_read",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = id)",
    "with_check": null
  },
  {
    "tablename": "profiles",
    "policyname": "profiles_staff_read_all",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "((((auth.jwt() -> 'user_metadata'::text) ->> 'is_staff'::text))::boolean = true)",
    "with_check": null
  },
  {
    "tablename": "service_categories",
    "policyname": "Anyone can read service_categories",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "services",
    "policyname": "Allow anon read services",
    "permissive": "PERMISSIVE",
    "roles": "{anon}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "services",
    "policyname": "Anyone can read services",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "services",
    "policyname": "Enable read access for all users",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "services",
    "policyname": "Staff can delete services",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "((auth.role() = 'authenticated'::text) AND (EXISTS ( SELECT 1\n   FROM profiles\n  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'owner'::user_role, 'partner'::user_role, 'admin'::user_role]))))))",
    "with_check": null
  },
  {
    "tablename": "services",
    "policyname": "Staff can insert services",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((auth.role() = 'authenticated'::text) AND (EXISTS ( SELECT 1\n   FROM profiles\n  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'owner'::user_role, 'partner'::user_role, 'admin'::user_role]))))))"
  },
  {
    "tablename": "services",
    "policyname": "Staff can update services",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "((auth.role() = 'authenticated'::text) AND (EXISTS ( SELECT 1\n   FROM profiles\n  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin'::user_role, 'owner'::user_role, 'partner'::user_role, 'admin'::user_role]))))))",
    "with_check": null
  },
  {
    "tablename": "shifts",
    "policyname": "Allow anon read shifts",
    "permissive": "PERMISSIVE",
    "roles": "{anon}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "shifts",
    "policyname": "Allow authenticated manage shifts",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "shifts",
    "policyname": "Anonymous can read shifts",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "staff_schedules",
    "policyname": "Allow anon read staff_schedules",
    "permissive": "PERMISSIVE",
    "roles": "{anon}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "staff_schedules",
    "policyname": "Allow authenticated manage staff_schedules",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "time_off_requests",
    "policyname": "Allow anon read time_off_requests",
    "permissive": "PERMISSIVE",
    "roles": "{anon}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "time_off_requests",
    "policyname": "Allow authenticated manage time_off_requests",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": null
  }
]


[
  {
    "function_name": "award_loyalty_points",
    "arguments": "p_profile_id uuid, p_points integer",
    "returns": "void"
  },
  {
    "function_name": "cancel_appointment",
    "arguments": "caller_phone text, appointment_id uuid",
    "returns": "jsonb"
  },
  {
    "function_name": "cancel_my_appointment",
    "arguments": "caller_phone text, appointment_id uuid",
    "returns": "jsonb"
  },
  {
    "function_name": "complete_appointment",
    "arguments": "caller_phone text, appointment_id uuid, p_final_price numeric DEFAULT NULL::numeric",
    "returns": "jsonb"
  },
  {
    "function_name": "create_shift",
    "arguments": "p_employee_id uuid, p_shift_date date, p_shift_type text, p_start_time time without time zone, p_end_time time without time zone",
    "returns": "void"
  },
  {
    "function_name": "create_time_off_request",
    "arguments": "p_staff_id uuid, p_start_date date, p_end_date date, p_reason text DEFAULT NULL::text",
    "returns": "void"
  },
  {
    "function_name": "delete_appointment",
    "arguments": "caller_phone text, appointment_id uuid",
    "returns": "jsonb"
  },
  {
    "function_name": "delete_shift",
    "arguments": "p_shift_id uuid",
    "returns": "void"
  },
  {
    "function_name": "get_appointments",
    "arguments": "caller_phone text, status_filter text DEFAULT NULL::text, date_from timestamp with time zone DEFAULT NULL::timestamp with time zone, date_to timestamp with time zone DEFAULT NULL::timestamp with time zone, customer_id_filter uuid DEFAULT NULL::uuid, technician_id_filter uuid DEFAULT NULL::uuid, count_only boolean DEFAULT false, order_asc boolean DEFAULT false",
    "returns": "jsonb"
  },
  {
    "function_name": "get_appointments_count",
    "arguments": "caller_phone text, status_filter text DEFAULT NULL::text, date_from timestamp with time zone DEFAULT NULL::timestamp with time zone, date_to timestamp with time zone DEFAULT NULL::timestamp with time zone",
    "returns": "integer"
  },
  {
    "function_name": "get_available_technicians",
    "arguments": "p_date date, p_time text",
    "returns": "TABLE(staff_id uuid, staff_name text, shift_type text, start_time time without time zone, end_time time without time zone)"
  },
  {
    "function_name": "get_available_technicians",
    "arguments": "p_date date, p_time time without time zone",
    "returns": "TABLE(id uuid, full_name text)"
  },
  {
    "function_name": "get_customer_appointments",
    "arguments": "p_profile_id uuid",
    "returns": "TABLE(appointment_id uuid, service_name text, technician_name text, appointment_time timestamp with time zone, status text, source text, final_price numeric)"
  },
  {
    "function_name": "get_my_appointments",
    "arguments": "customer_id uuid, status_filter text DEFAULT NULL::text, booking_type_filter text DEFAULT NULL::text, count_only boolean DEFAULT false, order_asc boolean DEFAULT false",
    "returns": "jsonb"
  },
  {
    "function_name": "get_my_notifications",
    "arguments": "p_phone text",
    "returns": "TABLE(id uuid, recipient_id uuid, reference_id uuid, title text, body text, is_read boolean, type text, created_at timestamp with time zone)"
  },
  {
    "function_name": "get_staff_schedule",
    "arguments": "p_start_date date, p_end_date date, p_staff_id uuid DEFAULT NULL::uuid",
    "returns": "TABLE(shift_id uuid, staff_id uuid, staff_name text, shift_date date, shift_type text, start_time time without time zone, end_time time without time zone, appointment_count integer, confirmed_online_count integer)"
  },
  {
    "function_name": "get_staff_schedule",
    "arguments": "p_start_date date, p_end_date date, p_employee_id uuid DEFAULT NULL::uuid, p_staff_id uuid DEFAULT NULL::uuid",
    "returns": "TABLE(id uuid, employee_id uuid, shift_date date, shift_type text, start_time time without time zone, end_time time without time zone, full_name text)"
  },
  {
    "function_name": "get_technician_appointments",
    "arguments": "p_staff_id uuid, p_start_date date, p_end_date date",
    "returns": "TABLE(appointment_id uuid, customer_name text, service_name text, appointment_time timestamp with time zone, status text, source text, final_price numeric)"
  },
  {
    "function_name": "get_technician_appointments",
    "arguments": "p_employee_id uuid DEFAULT NULL::uuid, p_staff_id uuid DEFAULT NULL::uuid, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date",
    "returns": "TABLE(id uuid, customer_name text, customer_phone text, service_name text, appointment_time timestamp with time zone, status text)"
  },
  {
    "function_name": "get_time_off_requests",
    "arguments": "p_status text DEFAULT NULL::text, p_staff_id uuid DEFAULT NULL::uuid",
    "returns": "TABLE(request_id uuid, staff_id uuid, staff_name text, start_date date, end_date date, reason text, status text, reviewed_by uuid, reviewer_name text, reviewed_at timestamp with time zone, created_at timestamp with time zone)"
  },
  {
    "function_name": "get_time_off_requests",
    "arguments": "p_status text DEFAULT NULL::text",
    "returns": "TABLE(id uuid, staff_id uuid, start_date date, end_date date, reason text, status text, reviewed_by uuid, staff_name text)"
  },
  {
    "function_name": "get_weekly_schedule",
    "arguments": "p_staff_id uuid DEFAULT NULL::uuid",
    "returns": "TABLE(schedule_id uuid, staff_id uuid, staff_name text, day_of_week integer, shift_type text, start_time time without time zone, end_time time without time zone, is_active boolean)"
  },
  {
    "function_name": "handle_shift_change_notify",
    "arguments": "p_staff_id uuid, p_shift_date date, p_old_start_time time without time zone, p_old_end_time time without time zone",
    "returns": "void"
  },
  {
    "function_name": "log_appointment_status_change",
    "arguments": "",
    "returns": "trigger"
  },
  {
    "function_name": "manage_service",
    "arguments": "admin_phone text, action text, service_data jsonb DEFAULT '{}'::jsonb, service_id bigint DEFAULT NULL::bigint",
    "returns": "jsonb"
  },
  {
    "function_name": "manage_service_category",
    "arguments": "admin_phone text, action text, category_name text DEFAULT NULL::text, category_id bigint DEFAULT NULL::bigint, new_sort_order integer DEFAULT NULL::integer",
    "returns": "jsonb"
  },
  {
    "function_name": "mark_missed_appointments",
    "arguments": "",
    "returns": "void"
  },
  {
    "function_name": "mark_my_notifications_read",
    "arguments": "p_phone text",
    "returns": "void"
  },
  {
    "function_name": "mark_notification_read",
    "arguments": "p_phone text, p_notif_id uuid",
    "returns": "void"
  },
  {
    "function_name": "review_time_off_request",
    "arguments": "p_request_id uuid, p_status text, p_reviewed_by uuid",
    "returns": "void"
  },
  {
    "function_name": "rls_auto_enable",
    "arguments": "",
    "returns": "event_trigger"
  },
  {
    "function_name": "set_updated_at",
    "arguments": "",
    "returns": "trigger"
  },
  {
    "function_name": "start_appointment",
    "arguments": "caller_phone text, appointment_id uuid",
    "returns": "jsonb"
  },
  {
    "function_name": "update_appointment",
    "arguments": "caller_phone text, appointment_id uuid, p_status text DEFAULT NULL::text, p_service_id bigint DEFAULT NULL::bigint, p_add_ons text DEFAULT NULL::text, p_final_price numeric DEFAULT NULL::numeric, p_refreshment_pref text DEFAULT NULL::text, p_technician_id uuid DEFAULT NULL::uuid, p_start_time timestamp with time zone DEFAULT NULL::timestamp with time zone, p_scheduled_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_notes text DEFAULT NULL::text",
    "returns": "jsonb"
  },
  {
    "function_name": "update_my_appointment",
    "arguments": "caller_phone text, appointment_id uuid, p_service_id bigint DEFAULT NULL::bigint, p_add_ons text DEFAULT NULL::text, p_final_price numeric DEFAULT NULL::numeric, p_refreshment_pref text DEFAULT NULL::text, p_scheduled_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_notes text DEFAULT NULL::text",
    "returns": "jsonb"
  },
  {
    "function_name": "update_profile_field",
    "arguments": "caller_phone text, profile_id uuid, field_name text, field_value text",
    "returns": "jsonb"
  },
  {
    "function_name": "update_shift_appointment_count",
    "arguments": "",
    "returns": "trigger"
  },
  {
    "function_name": "update_shift_counts",
    "arguments": "",
    "returns": "trigger"
  },
  {
    "function_name": "upsert_weekly_schedule",
    "arguments": "p_staff_id uuid, p_schedules jsonb",
    "returns": "boolean"
  }
]


[
  {
    "event_object_table": "appointments",
    "trigger_name": "trg_log_appointment_status",
    "event_manipulation": "UPDATE",
    "action_timing": "AFTER",
    "action_statement": "EXECUTE FUNCTION log_appointment_status_change()"
  },
  {
    "event_object_table": "appointments",
    "trigger_name": "trg_update_shift_appointment_count",
    "event_manipulation": "INSERT",
    "action_timing": "AFTER",
    "action_statement": "EXECUTE FUNCTION update_shift_appointment_count()"
  },
  {
    "event_object_table": "appointments",
    "trigger_name": "trg_update_shift_appointment_count",
    "event_manipulation": "DELETE",
    "action_timing": "AFTER",
    "action_statement": "EXECUTE FUNCTION update_shift_appointment_count()"
  },
  {
    "event_object_table": "appointments",
    "trigger_name": "trg_update_shift_appointment_count",
    "event_manipulation": "UPDATE",
    "action_timing": "AFTER",
    "action_statement": "EXECUTE FUNCTION update_shift_appointment_count()"
  },
  {
    "event_object_table": "shifts",
    "trigger_name": "trg_shifts_updated",
    "event_manipulation": "UPDATE",
    "action_timing": "BEFORE",
    "action_statement": "EXECUTE FUNCTION set_updated_at()"
  },
  {
    "event_object_table": "staff_schedules",
    "trigger_name": "trg_staff_schedules_updated",
    "event_manipulation": "UPDATE",
    "action_timing": "BEFORE",
    "action_statement": "EXECUTE FUNCTION set_updated_at()"
  },
  {
    "event_object_table": "time_off_requests",
    "trigger_name": "trg_time_off_requests_updated",
    "event_manipulation": "UPDATE",
    "action_timing": "BEFORE",
    "action_statement": "EXECUTE FUNCTION set_updated_at()"
  }
]


[
  {
    "table_name": "appointment_status_history",
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "appointment_status_history",
    "column_name": "appointment_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "appointment_status_history",
    "column_name": "previous_status",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointment_status_history",
    "column_name": "new_status",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "appointment_status_history",
    "column_name": "changed_by",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointment_status_history",
    "column_name": "changed_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "appointment_status_history",
    "column_name": "note",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointments",
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "appointments",
    "column_name": "customer_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointments",
    "column_name": "service_id",
    "data_type": "bigint",
    "udt_name": "int8",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointments",
    "column_name": "status",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": "'Checked-In'::text"
  },
  {
    "table_name": "appointments",
    "column_name": "checked_in_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "appointments",
    "column_name": "start_time",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointments",
    "column_name": "technician_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointments",
    "column_name": "final_price",
    "data_type": "numeric",
    "udt_name": "numeric",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointments",
    "column_name": "notes",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointments",
    "column_name": "add_ons",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointments",
    "column_name": "booking_type",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": "'walk_in'::text"
  },
  {
    "table_name": "appointments",
    "column_name": "scheduled_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointments",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "appointments",
    "column_name": "checked_in_by",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointments",
    "column_name": "start_time_new",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "appointments",
    "column_name": "refreshment_pref",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "customer_waivers",
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "customer_waivers",
    "column_name": "customer_phone",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "customer_waivers",
    "column_name": "customer_name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "customer_waivers",
    "column_name": "agreed_to_terms",
    "data_type": "boolean",
    "udt_name": "bool",
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "customer_waivers",
    "column_name": "signature_image",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "customer_waivers",
    "column_name": "signed_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "timezone('utc'::text, now())"
  },
  {
    "table_name": "customer_waivers",
    "column_name": "profile_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "inventory_logs",
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "inventory_logs",
    "column_name": "inventory_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "inventory_logs",
    "column_name": "appointment_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "inventory_logs",
    "column_name": "customer_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "inventory_logs",
    "column_name": "quantity_changed",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "inventory_logs",
    "column_name": "reason",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "inventory_logs",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "notifications",
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "notifications",
    "column_name": "profile_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "notifications",
    "column_name": "reference_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "notifications",
    "column_name": "body",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "notifications",
    "column_name": "is_read",
    "data_type": "boolean",
    "udt_name": "bool",
    "is_nullable": "YES",
    "column_default": "false"
  },
  {
    "table_name": "notifications",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "notifications",
    "column_name": "recipient_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "notifications",
    "column_name": "title",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "notifications",
    "column_name": "type",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": "'system'::text"
  },
  {
    "table_name": "payment_transactions",
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "payment_transactions",
    "column_name": "appointment_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "payment_transactions",
    "column_name": "customer_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "payment_transactions",
    "column_name": "technician_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "payment_transactions",
    "column_name": "cashier_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "payment_transactions",
    "column_name": "service_id",
    "data_type": "bigint",
    "udt_name": "int8",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "payment_transactions",
    "column_name": "amount",
    "data_type": "numeric",
    "udt_name": "numeric",
    "is_nullable": "NO",
    "column_default": "0"
  },
  {
    "table_name": "payment_transactions",
    "column_name": "discount_amount",
    "data_type": "numeric",
    "udt_name": "numeric",
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "table_name": "payment_transactions",
    "column_name": "discount_type",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "payment_transactions",
    "column_name": "final_amount",
    "data_type": "numeric",
    "udt_name": "numeric",
    "is_nullable": "NO",
    "column_default": "0"
  },
  {
    "table_name": "payment_transactions",
    "column_name": "payment_method",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "payment_transactions",
    "column_name": "status",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "'completed'::text"
  },
  {
    "table_name": "payment_transactions",
    "column_name": "notes",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "payment_transactions",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_name": "profiles",
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_name": "profiles",
    "column_name": "full_name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "profiles",
    "column_name": "loyalty_points",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "table_name": "profiles",
    "column_name": "tier",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": "'Silver'::text"
  },
  {
    "table_name": "profiles",
    "column_name": "refreshment_pref",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "profiles",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_name": "profiles",
    "column_name": "email",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "profiles",
    "column_name": "nail_goal",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "profiles",
    "column_name": "role",
    "data_type": "USER-DEFINED",
    "udt_name": "user_role",
    "is_nullable": "YES",
    "column_default": "'customer'::user_role"
  },
  {
    "table_name": "profiles",
    "column_name": "phone",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "profiles",
    "column_name": "referral_code",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "profiles",
    "column_name": "referral_by",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "profiles",
    "column_name": "pin",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "profiles",
    "column_name": "birthday",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "services",
    "column_name": "id",
    "data_type": "bigint",
    "udt_name": "int8",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "services",
    "column_name": "name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "services",
    "column_name": "price",
    "data_type": "numeric",
    "udt_name": "numeric",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_name": "services",
    "column_name": "duration_minutes",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "YES",
    "column_default": "60"
  },
  {
    "table_name": "services",
    "column_name": "category",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "services",
    "column_name": "is_addon",
    "data_type": "boolean",
    "udt_name": "bool",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_name": "services",
    "column_name": "description",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  }
]


[
  {
    "table_name": "customer_waivers",
    "sample_row": {
      "id": "258df289-02c6-4eee-9cae-ffd925ea6786",
      "customer_phone": "5555599999",
      "customer_name": "asdqwe",
      "agreed_to_terms": true,
      "signature_image": "data:image/png;base64,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",
      "signed_at": "2026-06-02T02:14:30.105766+00:00",
      "profile_id": "532c5f40-994e-4b0c-a2dc-2c99748a13b0"
    }
  }
]