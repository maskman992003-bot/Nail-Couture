/**
 * Spend-based tier progress copy for Digital Wallet UI.
 * Tiers are driven by calendar-year spend — not loyalty_points.
 */

import { getTierConfig } from '../constants/loyaltyProgram.js';

export function formatTierSpend(amount) {
  return `$${Number(amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function resolveCalendarSpend(profile, snapshot) {
  return Number(
    snapshot?.calendar_spend_ytd ?? profile?.calendar_spend_ytd ?? 0,
  ) || 0;
}

/**
 * @param {ReturnType<import('./loyaltyTier.js').getTierInfo>} tierInfo
 */
export function getTierProgressSummary(tierInfo, profile, snapshot) {
  const spend = resolveCalendarSpend(profile, snapshot);

  if (!tierInfo.nextTier || tierInfo.nextThreshold == null) {
    return {
      spend,
      nextTier: null,
      nextThreshold: null,
      spendRemaining: 0,
      progressLabel: `${formatTierSpend(spend)} spent this year`,
      progressDetail: `You're at ${tierInfo.name} — enjoy your tier benefits.`,
      headline: `Top tier: ${tierInfo.name}`,
    };
  }

  const spendRemaining = Math.max(0, tierInfo.nextThreshold - spend);

  return {
    spend,
    nextTier: tierInfo.nextTier,
    nextThreshold: tierInfo.nextThreshold,
    spendRemaining,
    progressLabel: `${formatTierSpend(spend)} / ${formatTierSpend(tierInfo.nextThreshold)} YTD spend`,
    progressDetail: `${formatTierSpend(spendRemaining)} more to reach ${tierInfo.nextTier}`,
    headline: `Your path to ${tierInfo.nextTier}`,
  };
}

/** Benefit line for the next tier in upsell modals. */
export function getNextTierUpsellBenefit(tierInfo) {
  if (!tierInfo.nextTierId) {
    return tierInfo.benefit || tierInfo.tagline || '';
  }
  const next = getTierConfig(tierInfo.nextTierId);
  return next.benefits?.[0] || next.tagline || '';
}
