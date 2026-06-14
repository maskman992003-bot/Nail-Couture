import { useCallback, useEffect, useMemo, useState } from 'react';
import { featureFlags } from '../constants/featureFlags.js';
import { createPromotionLocalState } from '../utils/promotionLocalState.js';
import {
  fetchActivePromotions,
  fetchPromotionsAdmin,
  filterPromosForDisplay,
  resolvePromoCta,
  savePromotion,
  setPromotionActive,
  deletePromotion,
  canHaveActivePromotion,
  getActivePromotionLimitMessage,
} from '../utils/promotions.js';
import { getSupabaseErrorMessage } from '../utils/supabaseErrors.js';

/**
 * @param {object} options
 * @param {string | null | undefined} options.userPhone
 * @param {import('../utils/promotions.js').PromotionSurface} options.surface
 * @param {boolean} [options.enabled]
 * @param {boolean} [options.isStaff]
 * @param {ReturnType<typeof createPromotionLocalState>} options.localState
 * @param {(code: string) => void | Promise<void>} [options.onCopyCode]
 * @param {() => void} [options.scrollToBooking]
 * @param {(url: string) => void} [options.openUrl]
 */
export function usePromotions({
  userPhone,
  surface,
  enabled: enabledOverride,
  isStaff = false,
  localState,
  onCopyCode,
  scrollToBooking,
  openUrl,
}) {
  const enabled = enabledOverride ?? (
    featureFlags.customer.promotions === true && !isStaff
  );

  const [rawPromos, setRawPromos] = useState([]);
  const [dismissedIds, setDismissedIds] = useState([]);
  const [copiedIds, setCopiedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionSkippedIds, setSessionSkippedIds] = useState([]);
  const [detailPromo, setDetailPromo] = useState(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setRawPromos([]);
      return;
    }

    setLoading(true);
    try {
      const [promos, dismissed, copied] = await Promise.all([
        fetchActivePromotions(userPhone, surface),
        localState.getDismissedIds(),
        localState.getCopiedIds(),
      ]);
      setRawPromos(promos);
      setDismissedIds(dismissed);
      setCopiedIds(copied);
      setSessionSkippedIds([]);
      setDetailPromo(null);
      setError('');
    } catch (err) {
      setError(getSupabaseErrorMessage(err, 'Failed to load promotions.'));
    } finally {
      setLoading(false);
    }
  }, [enabled, userPhone, surface, localState]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const promos = useMemo(
    () => filterPromosForDisplay(rawPromos, { dismissedIds, copiedIds }),
    [rawPromos, dismissedIds, copiedIds],
  );

  const slideInQueue = useMemo(
    () => promos.filter((p) => !sessionSkippedIds.includes(p.id)),
    [promos, sessionSkippedIds],
  );

  const currentSlideInPromo = slideInQueue[0] ?? null;
  const chipReady = Boolean(enabled && currentSlideInPromo && !detailPromo);

  const advanceSlideInQueue = useCallback(() => {
    if (!currentSlideInPromo?.id) return;
    const skippedId = currentSlideInPromo.id;
    setSessionSkippedIds((prev) => (
      prev.includes(skippedId) ? prev : [...prev, skippedId]
    ));
  }, [currentSlideInPromo?.id]);

  const openSlideInDetail = useCallback((promo) => {
    if (!promo) return;
    setDetailPromo(promo);
  }, []);

  const dismiss = useCallback(async (promotionId) => {
    if (!promotionId) return;
    await localState.dismiss(promotionId);
    setDismissedIds((prev) => (prev.includes(promotionId) ? prev : [...prev, promotionId]));
  }, [localState]);

  const closeSlideInDetail = useCallback(() => {
    setDetailPromo(null);
    advanceSlideInQueue();
  }, [advanceSlideInQueue]);

  const copyCode = useCallback(async (promo) => {
    if (!promo?.promo_code) return;
    await resolvePromoCta(promo, {
      scrollToBooking,
      copyCode: async (code) => {
        await onCopyCode?.(code);
        await localState.markCopied(promo.id);
        setCopiedIds((prev) => (prev.includes(promo.id) ? prev : [...prev, promo.id]));
      },
      openUrl,
    });
    if (Boolean(promo.suppress_after_copy)) {
      setDetailPromo(null);
      advanceSlideInQueue();
    }
  }, [advanceSlideInQueue, localState, onCopyCode, openUrl, scrollToBooking]);

  return {
    enabled,
    loading,
    error,
    promos,
    slideInQueue,
    currentSlideInPromo,
    chipReady,
    detailPromo,
    dismiss,
    copyCode,
    advanceSlideInQueue,
    openSlideInDetail,
    closeSlideInDetail,
    refresh,
    // Legacy aliases for gradual migration
    slideInPromo: chipReady ? currentSlideInPromo : null,
  };
}

/**
 * @param {string | undefined | null} userPhone
 * @param {string | undefined | null} role
 */
export function usePromotionsAdminEnabled(userPhone, role) {
  return Boolean(
    userPhone
    && ['super_admin', 'owner', 'partner'].includes(role ?? '')
    && (role === 'super_admin' || featureFlags.staff.announcements === true),
  );
}

/**
 * @param {string | undefined | null} userPhone
 * @param {string | undefined | null} role
 */
export function usePromotionsAdmin(userPhone, role) {
  const enabled = usePromotionsAdminEnabled(userPhone, role);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!enabled || !userPhone) return;
    setLoading(true);
    try {
      const rows = await fetchPromotionsAdmin(userPhone);
      setPromotions(rows);
      setError('');
    } catch (err) {
      setError(getSupabaseErrorMessage(err, 'Failed to load promotions.'));
    } finally {
      setLoading(false);
    }
  }, [enabled, userPhone]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(async (payload) => {
    if (!enabled || !userPhone) return null;

    if (payload.is_active !== false) {
      const candidate = {
        audience: payload.audience ?? 'all',
        starts_at: payload.starts_at ?? null,
        ends_at: payload.ends_at ?? null,
      };
      if (!canHaveActivePromotion(promotions, candidate, payload.id ?? null)) {
        setError(getActivePromotionLimitMessage(candidate.audience));
        return null;
      }
    }

    setSaving(true);
    try {
      const saved = await savePromotion(userPhone, payload);
      await refresh();
      setError('');
      return saved;
    } catch (err) {
      setError(getSupabaseErrorMessage(err, 'Failed to save promotion.'));
      return null;
    } finally {
      setSaving(false);
    }
  }, [enabled, promotions, refresh, userPhone]);

  const setActive = useCallback(async (promotionId, isActive) => {
    if (!enabled || !userPhone) return null;

    if (isActive) {
      const promo = promotions.find((row) => row.id === promotionId);
      if (promo && !canHaveActivePromotion(promotions, promo, promotionId)) {
        setError(getActivePromotionLimitMessage(promo.audience));
        return null;
      }
    }

    setSaving(true);
    try {
      const updated = await setPromotionActive(userPhone, promotionId, isActive);
      await refresh();
      setError('');
      return updated;
    } catch (err) {
      setError(getSupabaseErrorMessage(err, 'Failed to update promotion.'));
      return null;
    } finally {
      setSaving(false);
    }
  }, [enabled, promotions, refresh, userPhone]);

  const remove = useCallback(async (promotionId) => {
    if (!enabled || !userPhone || !promotionId) return false;
    setSaving(true);
    try {
      await deletePromotion(userPhone, promotionId);
      await refresh();
      setError('');
      return true;
    } catch (err) {
      setError(getSupabaseErrorMessage(err, 'Failed to delete promotion.'));
      return false;
    } finally {
      setSaving(false);
    }
  }, [enabled, refresh, userPhone]);

  return {
    enabled,
    promotions,
    loading,
    saving,
    error,
    setError,
    refresh,
    save,
    setActive,
    remove,
  };
}
