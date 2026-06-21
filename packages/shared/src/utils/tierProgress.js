/**
 * Spend-based tier progress copy for Digital Wallet UI.
 * Tiers are driven by rolling 12-month spend — not loyalty_points.
 */

import { getTierConfig } from '../constants/loyaltyProgram.js';
import { resolveRollingSpend } from './loyaltyTier.js';

export function formatTierSpend(amount) {
  return `$${Number(amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function resolveCalendarSpend(profile, snapshot) {
  return resolveRollingSpend({
    rolling_spend_12m: snapshot?.rolling_spend_12m ?? snapshot?.calendar_spend_ytd,
    calendar_spend_ytd: snapshot?.calendar_spend_ytd,
    ...profile,
  });
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
      progressLabel: `${formatTierSpend(spend)} spent in the last 12 months`,
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
    progressLabel: `${formatTierSpend(spend)} / ${formatTierSpend(tierInfo.nextThreshold)} rolling spend`,
    progressDetail: `${formatTierSpend(spendRemaining)} more to reach ${tierInfo.nextTier}`,
    headline: tierInfo.id === 'regular_customer'
      ? 'Unlock your Pearl membership card'
      : `Your path to ${tierInfo.nextTier}`,
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

export function formatPointsExpiryDate(isoDate) {
  if (!isoDate) return null;
  try {
    return new Date(isoDate).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

export function formatFmFloorUntil(isoDate) {
  return formatPointsExpiryDate(isoDate);
}
