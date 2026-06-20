import { VAULT_MILESTONES } from '../constants/loyaltyProgram.js';

/**
 * Sum dollar value of vault milestones the user has unlocked but not yet redeemed.
 */
export function computeVaultRewardsAvailable(points, milestones = VAULT_MILESTONES) {
  const source = milestones?.length ? milestones : VAULT_MILESTONES;
  return source
    .filter((m) => (m.unlocked ?? points >= m.points) && !m.redeemed)
    .reduce((sum, m) => sum + (m.rewardValue ?? m.reward_value ?? 0), 0);
}
