import { getSupabase } from '../lib/supabase.js';

/** @typedef {'public_home' | 'customer_home'} PromotionSurface */
/** @typedef {'first_visit' | 'seasonal' | 'general'} PromotionKind */
/** @typedef {'all' | 'customers' | 'first_visit_only'} PromotionAudience */
/** @typedef {'copy_code' | 'scroll_booking' | 'external_url'} PromotionCtaAction */

/**
 * @typedef {Object} Promotion
 * @property {string} id
 * @property {string} slug
 * @property {PromotionKind} kind
 * @property {string} title
 * @property {string | null} [subtitle]
 * @property {string} body
 * @property {string} promo_code
 * @property {string} discount_label
 * @property {string} cta_label
 * @property {PromotionCtaAction} cta_action
 * @property {string | null} [cta_url]
 * @property {string[]} display_surfaces
 * @property {PromotionAudience} audience
 * @property {string | null} [starts_at]
 * @property {string | null} [ends_at]
 * @property {boolean} is_active
 * @property {number} sort_order
 * @property {boolean} show_slide_in
 * @property {boolean} show_shimmer_cta
 * @property {number | null} [slide_in_auto_hide_seconds]
 * @property {boolean} [suppress_after_dismiss]
 * @property {boolean} [suppress_after_copy]
 */

/**
 * @param {string | null | undefined} phone
 * @param {PromotionSurface} surface
 * @returns {Promise<Promotion[]>}
 */
export async function fetchActivePromotions(phone, surface) {
  const { data, error } = await getSupabase().rpc('list_active_promotions', {
    p_caller_phone: phone || null,
    p_surface: surface,
  });
  if (error) throw error;
  return data ?? [];
}

/**
 * @param {string} callerPhone
 * @returns {Promise<Promotion[]>}
 */
export async function fetchPromotionsAdmin(callerPhone) {
  const { data, error } = await getSupabase().rpc('list_promotions_admin', {
    p_caller_phone: callerPhone,
  });
  if (error) throw error;
  return data ?? [];
}

/**
 * @param {string} callerPhone
 * @param {Record<string, unknown>} payload
 * @returns {Promise<Promotion>}
 */
export async function savePromotion(callerPhone, payload) {
  const { data, error } = await getSupabase().rpc('upsert_promotion', {
    p_caller_phone: callerPhone,
    p_promotion_id: payload.id ?? null,
    p_slug: payload.slug,
    p_kind: payload.kind,
    p_title: payload.title,
    p_subtitle: payload.subtitle ?? null,
    p_body: payload.body ?? '',
    p_promo_code: payload.promo_code ?? '',
    p_discount_label: payload.discount_label ?? '',
    p_cta_label: payload.cta_label ?? 'Copy code',
    p_cta_action: payload.cta_action ?? 'copy_code',
    p_cta_url: payload.cta_url ?? null,
    p_display_surfaces: payload.display_surfaces ?? ['public_home'],
    p_audience: payload.audience ?? 'all',
    p_starts_at: payload.starts_at ?? null,
    p_ends_at: payload.ends_at ?? null,
    p_is_active: payload.is_active ?? true,
    p_sort_order: payload.sort_order ?? 0,
    p_show_slide_in: payload.show_slide_in ?? false,
    p_show_shimmer_cta: payload.show_shimmer_cta ?? false,
    p_slide_in_auto_hide_seconds: payload.slide_in_auto_hide_seconds ?? null,
    p_suppress_after_dismiss: payload.suppress_after_dismiss ?? false,
    p_suppress_after_copy: payload.suppress_after_copy ?? false,
  });
  if (error) throw error;
  return data;
}

/**
 * @param {string} callerPhone
 * @param {string} promotionId
 * @param {boolean} isActive
 * @returns {Promise<Promotion>}
 */
export async function setPromotionActive(callerPhone, promotionId, isActive) {
  const { data, error } = await getSupabase().rpc('set_promotion_active', {
    p_caller_phone: callerPhone,
    p_promotion_id: promotionId,
    p_is_active: isActive,
  });
  if (error) throw error;
  return data;
}

/**
 * @param {string} callerPhone
 * @param {string} promotionId
 */
export async function deletePromotion(callerPhone, promotionId) {
  const { error } = await getSupabase().rpc('delete_promotion', {
    p_caller_phone: callerPhone,
    p_promotion_id: promotionId,
  });
  if (error) throw error;
}

/**
 * @param {Promotion[]} promos
 * @param {{ dismissedIds?: string[], copiedIds?: string[] }} options
 * @returns {Promotion[]}
 */
export function filterPromosForDisplay(promos, { dismissedIds = [], copiedIds = [] } = {}) {
  const dismissed = new Set(dismissedIds);
  const copied = new Set(copiedIds);
  return (promos || []).filter((promo) => {
    if (Boolean(promo.suppress_after_dismiss) && dismissed.has(promo.id)) return false;
    if (Boolean(promo.suppress_after_copy) && copied.has(promo.id)) return false;
    return true;
  }).slice(0, 2);
}

/**
 * @param {Promotion} promo
 * @param {{ scrollToBooking?: () => void, copyCode?: (code: string) => void | Promise<void>, openUrl?: (url: string) => void }} handlers
 */
export async function resolvePromoCta(promo, { scrollToBooking, copyCode, openUrl } = {}) {
  if (!promo) return;

  if (promo.cta_action === 'scroll_booking') {
    scrollToBooking?.();
    return;
  }

  if (promo.cta_action === 'external_url' && promo.cta_url) {
    openUrl?.(promo.cta_url);
    return;
  }

  if (promo.promo_code) {
    await copyCode?.(promo.promo_code);
  }
}

export function formatPromotionKind(kind) {
  if (kind === 'first_visit') return 'First visit';
  if (kind === 'seasonal') return 'Seasonal';
  return 'General';
}

export function formatPromotionAudience(audience) {
  if (audience === 'first_visit_only') return 'First visit only';
  if (audience === 'customers') return 'Customers';
  return 'Everyone';
}

export function formatPromotionSurfaces(surfaces = []) {
  return surfaces
    .map((s) => (s === 'customer_home' ? 'Customer home' : 'Public home'))
    .join(', ');
}

export const MAX_ACTIVE_PROMOTIONS_PER_AUDIENCE = 2;

/**
 * @param {string | null | undefined} startsAtA
 * @param {string | null | undefined} endsAtA
 * @param {string | null | undefined} startsAtB
 * @param {string | null | undefined} endsAtB
 */
export function promotionDateRangesOverlap(startsAtA, endsAtA, startsAtB, endsAtB) {
  const toStart = (value) => {
    if (!value) return Number.NEGATIVE_INFINITY;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
  };
  const toEnd = (value) => {
    if (!value) return Number.POSITIVE_INFINITY;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
  };

  const aStart = toStart(startsAtA);
  const aEnd = toEnd(endsAtA);
  const bStart = toStart(startsAtB);
  const bEnd = toEnd(endsAtB);
  return aStart <= bEnd && bStart <= aEnd;
}

/**
 * @param {Promotion[]} promotions
 * @param {{ audience?: string, starts_at?: string | null, ends_at?: string | null }} candidate
 * @param {string | null | undefined} [excludeId]
 */
export function countOverlappingActivePromotions(promotions, candidate, excludeId = null) {
  return (promotions || []).filter((promo) => {
    if (excludeId && promo.id === excludeId) return false;
    if (promo.is_active === false) return false;
    if (promo.audience !== candidate.audience) return false;
    return promotionDateRangesOverlap(
      promo.starts_at,
      promo.ends_at,
      candidate.starts_at,
      candidate.ends_at,
    );
  }).length;
}

/**
 * @param {Promotion[]} promotions
 * @param {{ audience?: string, starts_at?: string | null, ends_at?: string | null }} candidate
 * @param {string | null | undefined} [excludeId]
 */
export function canHaveActivePromotion(promotions, candidate, excludeId = null) {
  return countOverlappingActivePromotions(promotions, candidate, excludeId)
    < MAX_ACTIVE_PROMOTIONS_PER_AUDIENCE;
}

/** @param {string | undefined | null} audience */
export function getActivePromotionLimitMessage(audience) {
  return `Only ${MAX_ACTIVE_PROMOTIONS_PER_AUDIENCE} promotions can be active at the same time for ${formatPromotionAudience(audience)}. Deactivate or adjust dates on another offer first.`;
}

function formatPromotionDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatPromotionDateRange(startsAt, endsAt) {
  if (!startsAt && !endsAt) return 'Always on';
  const fmt = (value) => {
    if (!value) return null;
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  const start = fmt(startsAt);
  const end = fmt(endsAt);
  if (start && end) return `${start} – ${end}`;
  if (start) return `From ${start}`;
  if (end) return `Until ${end}`;
  return 'Always on';
}

export function formatPromotionValidity(startsAt, endsAt) {
  const start = formatPromotionDateTime(startsAt);
  const end = formatPromotionDateTime(endsAt);
  if (start && end) return `Valid ${start} – ${end}`;
  if (start) return `Valid from ${start}`;
  if (end) return `Valid until ${end}`;
  return 'No validity window set';
}
