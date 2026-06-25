-- Migration 119: Mystery Gift grand-opening campaign
-- Run once in Supabase SQL Editor after 118_delete_customer_profile.sql

-- ---------------------------------------------------------------------------
-- 1) Extend gift_cards with promotional source
-- ---------------------------------------------------------------------------

ALTER TABLE gift_cards
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'purchase';

ALTER TABLE gift_cards
  DROP CONSTRAINT IF EXISTS gift_cards_source_check;

ALTER TABLE gift_cards
  ADD CONSTRAINT gift_cards_source_check
  CHECK (source IN ('purchase', 'mystery_gift'));

COMMENT ON COLUMN gift_cards.source IS
  'purchase = sold at front desk; mystery_gift = grand-opening promotional award';

-- ---------------------------------------------------------------------------
-- 2) Campaign config (singleton)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mystery_gift_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  opening_started_at timestamptz NULL,
  awards_finalized_at timestamptz NULL,
  finalized_by_id uuid NULL REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO mystery_gift_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE mystery_gift_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read mystery gift config" ON mystery_gift_config;
CREATE POLICY "Anyone can read mystery gift config"
  ON mystery_gift_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- 3) Awards ledger
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mystery_gift_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rank integer NOT NULL CHECK (rank BETWEEN 1 AND 12),
  award_amount numeric(10,2) NOT NULL CHECK (award_amount > 0),
  gift_card_id uuid NOT NULL REFERENCES gift_cards(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id),
  UNIQUE (rank)
);

CREATE INDEX IF NOT EXISTS idx_mystery_gift_awards_customer
  ON mystery_gift_awards (customer_id);

ALTER TABLE mystery_gift_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read mystery gift awards" ON mystery_gift_awards;
CREATE POLICY "Anyone can read mystery gift awards"
  ON mystery_gift_awards
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- 4) Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION mystery_gift_normalize_caller_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_digits text;
BEGIN
  v_digits := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  IF length(v_digits) = 11 AND left(v_digits, 1) = '1' THEN
    v_digits := substring(v_digits from 2);
  END IF;
  RETURN v_digits;
END;
$$;

CREATE OR REPLACE FUNCTION mystery_gift_caller_role(p_caller_phone text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digits text;
  v_role text;
BEGIN
  v_digits := mystery_gift_normalize_caller_phone(p_caller_phone);
  IF length(v_digits) < 10 THEN
    RETURN NULL;
  END IF;

  SELECT role::text INTO v_role
  FROM profiles
  WHERE regexp_replace(COALESCE(phone, ''), '\D', '', 'g') IN (v_digits, '1' || v_digits)
     OR phone = p_caller_phone
  LIMIT 1;

  RETURN v_role;
END;
$$;

CREATE OR REPLACE FUNCTION mystery_gift_is_management_role(p_role text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_role, '') IN ('owner', 'super_admin');
$$;

CREATE OR REPLACE FUNCTION mystery_gift_award_amount_for_rank(p_rank integer)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_rank <= 3 THEN 200::numeric
    WHEN p_rank <= 6 THEN 100::numeric
    ELSE 50::numeric
  END;
$$;

CREATE OR REPLACE FUNCTION mystery_gift_payment_spend(
  p_amount numeric,
  p_discount_amount numeric,
  p_gift_card_id uuid,
  p_gift_card_amount numeric
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT GREATEST(
    COALESCE(p_amount, 0) - COALESCE(p_discount_amount, 0)
    - CASE
        WHEN p_gift_card_id IS NOT NULL
         AND EXISTS (
           SELECT 1
           FROM gift_cards gc
           WHERE gc.id = p_gift_card_id
             AND gc.source = 'mystery_gift'
         )
        THEN COALESCE(p_gift_card_amount, 0)
        ELSE 0
      END,
    0
  );
$$;

CREATE OR REPLACE FUNCTION mystery_gift_counted_spend(
  p_customer_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    mystery_gift_payment_spend(
      pt.amount,
      pt.discount_amount,
      pt.gift_card_id,
      pt.gift_card_amount
    )
  ), 0)
  FROM payment_transactions pt
  WHERE pt.customer_id = p_customer_id
    AND pt.status = 'completed'
    AND pt.created_at >= p_start
    AND pt.created_at < p_end;
$$;

CREATE OR REPLACE FUNCTION mystery_gift_get_config_row()
RETURNS mystery_gift_config
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM mystery_gift_config
  WHERE id = 1;
$$;

-- ---------------------------------------------------------------------------
-- 5) Issue promotional gift card (internal)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION issue_mystery_gift_card(
  p_customer_id uuid,
  p_amount numeric,
  p_rank integer,
  p_issued_by_id uuid DEFAULT NULL
)
RETURNS gift_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount numeric;
  v_code text;
  v_card gift_cards%ROWTYPE;
  v_expires_at timestamptz := now() + interval '30 days';
BEGIN
  v_amount := round(COALESCE(p_amount, 0)::numeric, 2);
  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'Mystery gift amount must be greater than zero.';
  END IF;

  v_code := gift_card_generate_code();

  INSERT INTO gift_cards (
    code,
    initial_amount,
    balance,
    status,
    purchased_by_id,
    owner_id,
    recipient_name,
    gift_message,
    sold_by_id,
    expires_at,
    source
  ) VALUES (
    v_code,
    v_amount,
    v_amount,
    'active',
    p_customer_id,
    p_customer_id,
    NULL,
    'Mystery Gift — Grand Opening',
    p_issued_by_id,
    v_expires_at,
    'mystery_gift'
  )
  RETURNING * INTO v_card;

  INSERT INTO gift_card_transactions (
    gift_card_id,
    transaction_type,
    amount,
    balance_after,
    performed_by_id,
    description
  ) VALUES (
    v_card.id,
    'adjustment',
    v_amount,
    v_amount,
    p_issued_by_id,
    format(
      'Mystery Gift award (rank %s) — $%s',
      p_rank,
      trim(to_char(v_amount, '999990.99'))
    )
  );

  RETURN v_card;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) Set opening date (owner / super_admin, one-time)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_mystery_gift_opening(
  p_caller_phone text,
  p_opening_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_config mystery_gift_config%ROWTYPE;
  v_opening timestamptz;
BEGIN
  v_role := mystery_gift_caller_role(p_caller_phone);
  IF NOT mystery_gift_is_management_role(v_role) THEN
    RAISE EXCEPTION 'Not authorized. Only owners or super admins can start Mystery Gift tracking.';
  END IF;

  SELECT * INTO v_config FROM mystery_gift_config WHERE id = 1 FOR UPDATE;
  IF v_config.opening_started_at IS NOT NULL THEN
    RAISE EXCEPTION 'Mystery Gift opening date has already been set.';
  END IF;

  v_opening := COALESCE(p_opening_at, now());
  IF v_opening > now() + interval '5 minutes' THEN
    RAISE EXCEPTION 'Opening date cannot be more than a few minutes in the future.';
  END IF;

  UPDATE mystery_gift_config
  SET opening_started_at = v_opening,
      updated_at = now()
  WHERE id = 1;

  RETURN jsonb_build_object(
    'success', true,
    'opening_started_at', v_opening,
    'tracking_ends_at', v_opening + interval '30 days'
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 7) Public campaign status (customer teaser)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_mystery_gift_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config mystery_gift_config%ROWTYPE;
  v_end timestamptz;
  v_active boolean;
  v_days_remaining integer;
  v_finalized boolean;
  v_can_finalize boolean;
BEGIN
  SELECT * INTO v_config FROM mystery_gift_config WHERE id = 1;

  v_finalized := v_config.awards_finalized_at IS NOT NULL;

  IF v_config.opening_started_at IS NULL THEN
    RETURN jsonb_build_object(
      'configured', false,
      'active', false,
      'finalized', v_finalized,
      'can_finalize', false,
      'days_remaining', 0,
      'opening_at', NULL,
      'tracking_ends_at', NULL,
      'awards_finalized_at', v_config.awards_finalized_at
    );
  END IF;

  v_end := v_config.opening_started_at + interval '30 days';
  v_active := NOT v_finalized AND now() >= v_config.opening_started_at AND now() < v_end;
  v_days_remaining := GREATEST(
    0,
    CEIL(EXTRACT(EPOCH FROM (v_end - now())) / 86400.0)::integer
  );
  v_can_finalize := NOT v_finalized AND now() >= v_end;

  RETURN jsonb_build_object(
    'configured', true,
    'active', v_active,
    'finalized', v_finalized,
    'can_finalize', v_can_finalize,
    'days_remaining', CASE WHEN v_finalized OR now() >= v_end THEN 0 ELSE v_days_remaining END,
    'opening_at', v_config.opening_started_at,
    'tracking_ends_at', v_end,
    'awards_finalized_at', v_config.awards_finalized_at
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 8) Admin leaderboard preview
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_mystery_gift_leaderboard(p_caller_phone text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_config mystery_gift_config%ROWTYPE;
  v_start timestamptz;
  v_end timestamptz;
  v_rows jsonb;
BEGIN
  v_role := mystery_gift_caller_role(p_caller_phone);
  IF NOT mystery_gift_is_management_role(v_role) THEN
    RAISE EXCEPTION 'Not authorized. Only owners or super admins can view the Mystery Gift leaderboard.';
  END IF;

  SELECT * INTO v_config FROM mystery_gift_config WHERE id = 1;
  IF v_config.opening_started_at IS NULL THEN
    RETURN jsonb_build_object(
      'configured', false,
      'finalized', v_config.awards_finalized_at IS NOT NULL,
      'entries', '[]'::jsonb
    );
  END IF;

  v_start := v_config.opening_started_at;
  v_end := v_config.opening_started_at + interval '30 days';

  IF v_config.awards_finalized_at IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.rank), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT
        mga.rank,
        mga.award_amount,
        mga.created_at AS awarded_at,
        p.id AS customer_id,
        p.full_name,
        p.phone,
        gc.code AS gift_card_code,
        gc.expires_at AS gift_card_expires_at
      FROM mystery_gift_awards mga
      JOIN profiles p ON p.id = mga.customer_id
      JOIN gift_cards gc ON gc.id = mga.gift_card_id
      ORDER BY mga.rank
    ) t;
  ELSE
    WITH ranked AS (
      SELECT
        p.id AS customer_id,
        p.full_name,
        p.phone,
        COALESCE(SUM(
          mystery_gift_payment_spend(
            pt.amount,
            pt.discount_amount,
            pt.gift_card_id,
            pt.gift_card_amount
          )
        ), 0) AS total_spend,
        MIN(pt.created_at) AS first_payment_at,
        ROW_NUMBER() OVER (
          ORDER BY
            COALESCE(SUM(
              mystery_gift_payment_spend(
                pt.amount,
                pt.discount_amount,
                pt.gift_card_id,
                pt.gift_card_amount
              )
            ), 0) DESC,
            MIN(pt.created_at) ASC,
            p.id ASC
        ) AS rank
      FROM payment_transactions pt
      JOIN profiles p ON p.id = pt.customer_id
      WHERE pt.status = 'completed'
        AND pt.created_at >= v_start
        AND pt.created_at < v_end
        AND p.role = 'customer'
      GROUP BY p.id, p.full_name, p.phone
      HAVING COALESCE(SUM(
        mystery_gift_payment_spend(
          pt.amount,
          pt.discount_amount,
          pt.gift_card_id,
          pt.gift_card_amount
        )
      ), 0) > 0
    )
    SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.rank), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT
        r.rank,
        r.total_spend,
        mystery_gift_award_amount_for_rank(r.rank::integer) AS award_amount,
        r.customer_id,
        r.full_name,
        r.phone,
        r.first_payment_at
      FROM ranked r
      WHERE r.rank <= 12
      ORDER BY r.rank
    ) t;
  END IF;

  RETURN jsonb_build_object(
    'configured', true,
    'finalized', v_config.awards_finalized_at IS NOT NULL,
    'opening_at', v_config.opening_started_at,
    'tracking_ends_at', v_end,
    'awards_finalized_at', v_config.awards_finalized_at,
    'entries', COALESCE(v_rows, '[]'::jsonb)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 9) Finalize awards (idempotent)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION finalize_mystery_gift_awards(p_caller_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_caller_id uuid;
  v_config mystery_gift_config%ROWTYPE;
  v_start timestamptz;
  v_end timestamptz;
  v_winner RECORD;
  v_card gift_cards%ROWTYPE;
  v_award_amount numeric;
  v_awards jsonb := '[]'::jsonb;
  v_existing_count integer;
BEGIN
  v_role := mystery_gift_caller_role(p_caller_phone);
  IF NOT mystery_gift_is_management_role(v_role) THEN
    RAISE EXCEPTION 'Not authorized. Only owners or super admins can finalize Mystery Gift awards.';
  END IF;

  SELECT id INTO v_caller_id
  FROM profiles
  WHERE regexp_replace(COALESCE(phone, ''), '\D', '', 'g') IN (
    mystery_gift_normalize_caller_phone(p_caller_phone),
    '1' || mystery_gift_normalize_caller_phone(p_caller_phone)
  )
     OR phone = p_caller_phone
  LIMIT 1;

  SELECT * INTO v_config FROM mystery_gift_config WHERE id = 1 FOR UPDATE;

  IF v_config.opening_started_at IS NULL THEN
    RAISE EXCEPTION 'Mystery Gift opening date has not been set.';
  END IF;

  v_start := v_config.opening_started_at;
  v_end := v_config.opening_started_at + interval '30 days';

  IF v_config.awards_finalized_at IS NOT NULL THEN
    RETURN get_mystery_gift_leaderboard(p_caller_phone)
      || jsonb_build_object('success', true, 'already_finalized', true);
  END IF;

  IF now() < v_end THEN
    RAISE EXCEPTION 'Mystery Gift tracking period has not ended yet. Finalize after %.', to_char(v_end, 'Mon DD, YYYY HH12:MI AM');
  END IF;

  FOR v_winner IN
    WITH ranked AS (
      SELECT
        p.id AS customer_id,
        p.full_name,
        COALESCE(SUM(
          mystery_gift_payment_spend(
            pt.amount,
            pt.discount_amount,
            pt.gift_card_id,
            pt.gift_card_amount
          )
        ), 0) AS total_spend,
        MIN(pt.created_at) AS first_payment_at,
        ROW_NUMBER() OVER (
          ORDER BY
            COALESCE(SUM(
              mystery_gift_payment_spend(
                pt.amount,
                pt.discount_amount,
                pt.gift_card_id,
                pt.gift_card_amount
              )
            ), 0) DESC,
            MIN(pt.created_at) ASC,
            p.id ASC
        ) AS rank
      FROM payment_transactions pt
      JOIN profiles p ON p.id = pt.customer_id
      WHERE pt.status = 'completed'
        AND pt.created_at >= v_start
        AND pt.created_at < v_end
        AND p.role = 'customer'
      GROUP BY p.id, p.full_name
      HAVING COALESCE(SUM(
        mystery_gift_payment_spend(
          pt.amount,
          pt.discount_amount,
          pt.gift_card_id,
          pt.gift_card_amount
        )
      ), 0) > 0
    )
    SELECT customer_id, full_name, rank, total_spend
    FROM ranked
    WHERE rank <= 12
    ORDER BY rank
  LOOP
    v_award_amount := mystery_gift_award_amount_for_rank(v_winner.rank);
    v_card := issue_mystery_gift_card(
      v_winner.customer_id,
      v_award_amount,
      v_winner.rank,
      v_caller_id
    );

    INSERT INTO mystery_gift_awards (
      customer_id,
      rank,
      award_amount,
      gift_card_id
    ) VALUES (
      v_winner.customer_id,
      v_winner.rank,
      v_award_amount,
      v_card.id
    );

    PERFORM create_notification(
      v_winner.customer_id,
      'You won a Mystery Gift!',
      format(
        'Congratulations! You placed #%s in our Grand Opening Mystery Gift. Your $%s gift card is ready. Code: %s. Valid until %s.',
        v_winner.rank,
        trim(to_char(v_award_amount, '999990.99')),
        v_card.code,
        to_char(v_card.expires_at, 'Mon DD, YYYY')
      ),
      'mystery_gift_awarded',
      v_card.id,
      jsonb_build_object(
        'gift_card_id', v_card.id,
        'code', v_card.code,
        'amount', v_award_amount,
        'rank', v_winner.rank,
        'expires_at', v_card.expires_at
      )
    );

    v_awards := v_awards || jsonb_build_array(
      jsonb_build_object(
        'rank', v_winner.rank,
        'customer_id', v_winner.customer_id,
        'full_name', v_winner.full_name,
        'award_amount', v_award_amount,
        'gift_card_id', v_card.id,
        'gift_card_code', v_card.code
      )
    );
  END LOOP;

  SELECT count(*)::integer INTO v_existing_count FROM mystery_gift_awards;

  UPDATE mystery_gift_config
  SET awards_finalized_at = now(),
      finalized_by_id = v_caller_id,
      updated_at = now()
  WHERE id = 1;

  RETURN jsonb_build_object(
    'success', true,
    'already_finalized', false,
    'winners_count', v_existing_count,
    'awards', v_awards
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 10) Grants
-- ---------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION mystery_gift_normalize_caller_phone(text) TO authenticated;
GRANT EXECUTE ON FUNCTION mystery_gift_caller_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION mystery_gift_is_management_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION mystery_gift_award_amount_for_rank(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION mystery_gift_payment_spend(numeric, numeric, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION mystery_gift_counted_spend(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION mystery_gift_get_config_row() TO authenticated;
GRANT EXECUTE ON FUNCTION issue_mystery_gift_card(uuid, numeric, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION set_mystery_gift_opening(text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mystery_gift_status() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_mystery_gift_leaderboard(text) TO authenticated;
GRANT EXECUTE ON FUNCTION finalize_mystery_gift_awards(text) TO authenticated;
