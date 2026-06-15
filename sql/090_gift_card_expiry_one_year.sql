-- Migration 090: Gift card expiration — 1 year from purchase date (was 6 months)
-- Run once in Supabase SQL Editor after 089_fix_get_my_appointments_rpc.sql
--
-- Applies to new purchases only. Existing gift cards keep their current expires_at.

COMMENT ON COLUMN gift_cards.expires_at IS
  'Fixed expiration date — always 1 year after purchase (created_at). Never reset on transfer.';

CREATE OR REPLACE FUNCTION gift_card_purchase_expires_at(p_purchased_at timestamptz DEFAULT now())
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_purchased_at + interval '1 year';
$$;

CREATE OR REPLACE FUNCTION gift_card_enforce_expiration(p_card gift_cards)
RETURNS gift_cards
LANGUAGE plpgsql
AS $$
DECLARE
  v_card gift_cards%ROWTYPE := p_card;
  v_prev_balance numeric;
BEGIN
  IF v_card.id IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_card.status = 'active'
     AND gift_card_is_expired(v_card.expires_at, v_card.status) THEN
    v_prev_balance := v_card.balance;
    UPDATE gift_cards SET
      status = 'expired',
      balance = 0,
      updated_at = now()
    WHERE id = v_card.id
    RETURNING * INTO v_card;

    IF v_prev_balance > 0 THEN
      INSERT INTO gift_card_transactions (
        gift_card_id, transaction_type, amount, balance_after, description
      ) VALUES (
        v_card.id,
        'expire',
        -v_prev_balance,
        0,
        format(
          'Expired on %s (1 year from purchase)',
          to_char(v_card.expires_at, 'Mon DD, YYYY')
        )
      );
    END IF;
  END IF;

  RETURN v_card;
END;
$$;
