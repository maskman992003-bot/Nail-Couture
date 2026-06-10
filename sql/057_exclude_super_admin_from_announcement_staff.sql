-- Migration 057: Exclude super_admin from announcement staff targeting/recipients
-- Run after 056_announcement_send_quota_response.sql
--
-- Super admins compose announcements but are not listed as staff recipients.

CREATE OR REPLACE FUNCTION announcement_staff_roles()
RETURNS user_role[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY[
    'owner', 'partner', 'admin', 'cashier', 'technician'
  ]::user_role[];
$$;

COMMENT ON FUNCTION announcement_staff_roles IS
  'Staff roles eligible for salon announcement targeting and delivery (excludes super_admin).';
