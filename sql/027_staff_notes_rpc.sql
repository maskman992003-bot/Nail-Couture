-- Migration 027: Staff notes RPCs (phone-based auth, bypasses RLS)
-- Run after 025_phase4_staff_crm.sql (re-creates table/policies if missing)

CREATE TABLE IF NOT EXISTS customer_staff_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT 'Staff',
  note text NOT NULL CHECK (char_length(trim(note)) > 0),
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customer_staff_notes
  ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customer_staff_notes_customer
  ON customer_staff_notes (customer_id, created_at DESC);

ALTER TABLE customer_staff_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read customer_staff_notes" ON customer_staff_notes;
CREATE POLICY "Allow anon read customer_staff_notes"
  ON customer_staff_notes FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon insert customer_staff_notes" ON customer_staff_notes;
CREATE POLICY "Allow anon insert customer_staff_notes"
  ON customer_staff_notes FOR INSERT TO anon WITH CHECK (true);

-- ============================================================
-- Staff: Fetch internal notes for a customer
-- ============================================================
CREATE OR REPLACE FUNCTION get_staff_notes(
  caller_phone TEXT,
  p_customer_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  result JSONB;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE phone = caller_phone;
  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician') THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  IF p_customer_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(sub)::jsonb ORDER BY sub.created_at DESC), '[]'::jsonb)
  INTO result
  FROM (
    SELECT id, customer_id, author_id, author_name, note, appointment_id, created_at
    FROM customer_staff_notes
    WHERE customer_id = p_customer_id
    ORDER BY created_at DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 200))
  ) sub;

  RETURN result;
END;
$$;

-- ============================================================
-- Staff: Add internal note on a customer
-- ============================================================
CREATE OR REPLACE FUNCTION add_staff_note(
  caller_phone TEXT,
  p_customer_id UUID,
  p_note TEXT,
  p_appointment_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
  caller_name TEXT;
  trimmed_note TEXT;
  new_id UUID;
  new_created_at TIMESTAMPTZ;
  result JSONB;
BEGIN
  SELECT id, role, full_name INTO caller_id, caller_role, caller_name
  FROM profiles WHERE phone = caller_phone;

  IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician') THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  trimmed_note := trim(p_note);
  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'Customer is required.';
  END IF;
  IF trimmed_note IS NULL OR trimmed_note = '' THEN
    RAISE EXCEPTION 'Note cannot be empty.';
  END IF;

  INSERT INTO customer_staff_notes (customer_id, author_id, author_name, note, appointment_id)
  VALUES (p_customer_id, caller_id, COALESCE(caller_name, 'Staff'), trimmed_note, p_appointment_id)
  RETURNING id, created_at INTO new_id, new_created_at;

  SELECT jsonb_build_object(
    'success', true,
    'note', jsonb_build_object(
      'id', new_id,
      'customer_id', p_customer_id,
      'author_id', caller_id,
      'author_name', COALESCE(caller_name, 'Staff'),
      'note', trimmed_note,
      'appointment_id', p_appointment_id,
      'created_at', new_created_at
    )
  ) INTO result;

  RETURN result;
END;
$$;
