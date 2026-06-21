import { VAULT_MILESTONES } from '../constants/loyaltyProgram.js';

/**
 * Normalize a wallet milestone for UI (claim, view code, or locked).
 */
export function enrichVaultMilestone(milestone, points, live) {
  const pts = Number(points) || 0;
  const threshold = milestone.points;
  const redeemed = Boolean(live?.redeemed);
  const usedAtCheckout = Boolean(live?.used_at);
  const redemptionCode = live?.redemption_code ?? null;
  const rewardLabel = live?.reward_label ?? milestone.rewardLabel ?? milestone.reward_label;
  const rewardValue = live?.reward_value ?? milestone.rewardValue ?? milestone.reward_value;

  const canClaim = pts >= threshold && !redeemed;
  const canViewCode = redeemed && Boolean(redemptionCode) && !usedAtCheckout;
  const tappable = canClaim || canViewCode;
  const earned = pts >= threshold || redeemed;

  let statusLabel = `${threshold} pts needed`;
  if (usedAtCheckout) statusLabel = 'Used at checkout';
  else if (canViewCode) statusLabel = 'Claimed — tap to view code';
  else if (canClaim) statusLabel = 'Tap to claim';
  else if (redeemed) statusLabel = 'Claimed';

  return {
    points: threshold,
    rewardLabel,
    reward_value: rewardValue,
    rewardValue,
    redeemed,
    used_at: live?.used_at ?? null,
    redemption_code: redemptionCode,
    earned,
    canClaim,
    canViewCode,
    tappable,
    statusLabel,
  };
}

export function mergeVaultMilestones(milestones, points, source = VAULT_MILESTONES) {
  return source.map((m) => {
    const live = milestones?.find((ms) => ms.points === m.points);
    return enrichVaultMilestone(m, points, live);
  });
}

/** Active vault codes waiting to be applied at checkout. */
export function getActiveVaultCodes(milestones, points, source = VAULT_MILESTONES) {
  return mergeVaultMilestones(milestones, points, source).filter((m) => m.canViewCode);
}

export function resolveMilestonePress(milestonePoints, points, live, source = VAULT_MILESTONES) {
  const base = source.find((m) => m.points === milestonePoints) ?? { points: milestonePoints };
  const enriched = enrichVaultMilestone(base, points, live);

  if (enriched.canViewCode) {
    return {
      action: 'show',
      code: enriched.redemption_code,
      label: enriched.rewardLabel,
      reviewMode: true,
    };
  }
  if (enriched.canClaim) {
    return { action: 'claim', points: enriched.points, reviewMode: false };
  }
  return { action: 'none' };
}
