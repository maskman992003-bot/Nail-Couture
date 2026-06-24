-- Vault milestone redemption values (tier earn multipliers unchanged — see loyalty_tiers).
-- 100 pts = $5 | 250 pts = $12 | 500 pts = $25 | 1000 pts = $60

INSERT INTO loyalty_milestones (points, reward_label, reward_value, sort_order)
VALUES
  (100, '$5 reward', 5, 1),
  (250, '$12 reward', 12, 2),
  (500, '$25 reward', 25, 3),
  (1000, '$60 reward', 60, 4)
ON CONFLICT (points) DO UPDATE SET
  reward_label = EXCLUDED.reward_label,
  reward_value = EXCLUDED.reward_value,
  sort_order = EXCLUDED.sort_order;
