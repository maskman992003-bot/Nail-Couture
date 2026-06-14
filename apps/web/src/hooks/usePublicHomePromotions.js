import { useCallback, useState } from 'react';
import { usePromotions } from '@nail-couture/shared/hooks/usePromotions.js';
import { webPromotionLocalState } from '../utils/promotionStorage';
import '../lib/supabase.js';

/**
 * @param {object} options
 * @param {string | null | undefined} options.userPhone
 * @param {boolean} [options.isStaff]
 * @param {() => void} [options.scrollToBooking]
 */
export function usePublicHomePromotions({ scrollToBooking } = {}) {
  const [toast, setToast] = useState('');

  const onCopyCode = useCallback(async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setToast('Code copied');
      setTimeout(() => setToast(''), 2000);
    } catch {
      setToast('Could not copy code');
      setTimeout(() => setToast(''), 2000);
    }
  }, []);

  const promoState = usePromotions({
    userPhone: null,
    surface: 'public_home',
    isStaff: false,
    localState: webPromotionLocalState,
    onCopyCode,
    scrollToBooking,
    openUrl: (url) => window.open(url, '_blank', 'noopener,noreferrer'),
  });

  return {
    ...promoState,
    toast,
  };
}
