-- Migration 124: Gift card expiry — unified 6 months from purchase date
-- Run once in Supabase SQL Editor after 123_gift_card_claim_token_fix.sql
--
-- Applies to all gift cards (self-purchase, registered recipient, pending claim / unregistered).

COMMENT ON COLUMN gift_cards.expires_at IS
  'Fixed expiration date — always 6 months after purchase (created_at). Never reset on transfer.';

CREATE OR REPLACE FUNCTION gift_card_purchase_expires_at(p_purchased_at timestamptz DEFAULT now())
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_purchased_at + interval '6 months';
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
          'Expired on %s (6 months from purchase)',
          to_char(v_card.expires_at, 'Mon DD, YYYY')
        )
      );
    END IF;
  END IF;

  RETURN v_card;
END;
$$;

-- Align active cards to the unified policy (including pending-claim / unregistered recipient cards).
UPDATE gift_cards
SET
  expires_at = gift_card_purchase_expires_at(created_at),
  updated_at = now()
WHERE status = 'active'
  AND (
    expires_at IS NULL
    OR expires_at <> gift_card_purchase_expires_at(created_at)
  );

-- Phone numbers accidentally stored as gift messages should not display to customers.
UPDATE gift_cards
SET
  gift_message = NULL,
  updated_at = now()
WHERE gift_message IS NOT NULL
  AND length(gift_card_normalize_phone(gift_message)) >= 8
  AND gift_card_normalize_phone(gift_message) = regexp_replace(trim(gift_message), '\D', '', 'g');

NOTIFY pgrst, 'reload schema';
