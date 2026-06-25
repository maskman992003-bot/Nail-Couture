import { getSupabase } from '../lib/supabase.js';

export const MYSTERY_GIFT_MANAGEMENT_ROLES = ['owner', 'super_admin'];

export const MYSTERY_GIFT_TIERS = [
  { ranks: [1, 2, 3], amount: 200, label: 'Top 3' },
  { ranks: [4, 5, 6], amount: 100, label: 'Ranks 4–6' },
  { ranks: [7, 8, 9, 10, 11, 12], amount: 50, label: 'Ranks 7–12' },
];

export const MYSTERY_GIFT_TRACKING_DAYS = 30;
export const MYSTERY_GIFT_CARD_VALIDITY_DAYS = 30;
export const MYSTERY_GIFT_SLIDE_IN_AUTO_HIDE_SECONDS = 8;

export const MYSTERY_GIFT_TEASER_COPY = {
  eyebrow: 'Grand Opening · Limited Time',
  headline: 'Your next visit could unlock a surprise',
  subhead: 'Celebrate our opening with Mystery Gifts — visit us for a chance at an exclusive Nail Couture gift card. The reward stays a surprise until winners are chosen.',
  cta: 'See how it works',
  slideInTitle: 'Mystery Gift',
  slideInHook: 'A surprise gift card could be yours',
  slideInTap: 'Tap to learn more',
  modalTitle: 'Grand Opening Mystery Gift',
  modalIntro: 'Visit us during our first 30 days for a chance to win a surprise Nail Couture gift card. Prize values stay secret — winners are revealed when the opening window closes.',
  modalRules: [
    'Selected members will receive gift cards as a thank-you for celebrating with us.',
    'Gift card amounts are a surprise — no ranks, spend amounts, or prize values are shown during the campaign.',
    'Winners receive their gift card in the app when awards are issued.',
  ],
};

/**
 * @param {number} daysRemaining
 */
export function formatMysteryGiftCountdown(daysRemaining) {
  const days = Number(daysRemaining);
  if (!Number.isFinite(days) || days <= 0) return 'Closing soon';
  if (days === 1) return 'Last day!';
  return `${days} days left`;
}

/**
 * @param {string | null | undefined} role
 */
export function canManageMysteryGift(role) {
  return MYSTERY_GIFT_MANAGEMENT_ROLES.includes(role ?? '');
}

/**
 * @returns {Promise<import('./mysteryGift.js').MysteryGiftStatus>}
 */
export async function getMysteryGiftStatus() {
  const { data, error } = await getSupabase().rpc('get_mystery_gift_status');
  if (error) throw error;
  return data ?? {};
}

/**
 * @param {string} callerPhone
 * @param {string | Date} [openingAt]
 */
export async function setMysteryGiftOpening(callerPhone, openingAt) {
  const payload = {
    p_caller_phone: callerPhone,
    p_opening_at: openingAt ? new Date(openingAt).toISOString() : null,
  };
  const { data, error } = await getSupabase().rpc('set_mystery_gift_opening', payload);
  if (error) throw error;
  return data;
}

/**
 * @param {string} callerPhone
 */
export async function getMysteryGiftLeaderboard(callerPhone) {
  const { data, error } = await getSupabase().rpc('get_mystery_gift_leaderboard', {
    p_caller_phone: callerPhone,
  });
  if (error) throw error;
  return data ?? { entries: [] };
}

/**
 * @param {string} callerPhone
 */
export async function finalizeMysteryGiftAwards(callerPhone) {
  const { data, error } = await getSupabase().rpc('finalize_mystery_gift_awards', {
    p_caller_phone: callerPhone,
  });
  if (error) throw error;
  return data;
}

/**
 * @param {number} rank
 */
export function getMysteryGiftAwardAmount(rank) {
  if (rank <= 3) return 200;
  if (rank <= 6) return 100;
  if (rank <= 12) return 50;
  return 0;
}

/**
 * @param {MysteryGiftStatus | null | undefined} status
 */
export function shouldShowMysteryGiftTeaser(status) {
  return Boolean(status?.configured && status?.active && !status?.finalized);
}

/**
 * @typedef {Object} MysteryGiftStatus
 * @property {boolean} [configured]
 * @property {boolean} [active]
 * @property {boolean} [finalized]
 * @property {boolean} [can_finalize]
 * @property {number} [days_remaining]
 * @property {string | null} [opening_at]
 * @property {string | null} [tracking_ends_at]
 * @property {string | null} [awards_finalized_at]
 */

/**
 * @typedef {Object} MysteryGiftLeaderboardEntry
 * @property {number} rank
 * @property {number} [total_spend]
 * @property {number} award_amount
 * @property {string} customer_id
 * @property {string} [full_name]
 * @property {string} [phone]
 * @property {string} [gift_card_code]
 * @property {string} [gift_card_expires_at]
 * @property {string} [awarded_at]
 */
