import { useCallback, useState } from 'react';
import { usePromotions } from '@nail-couture/shared/hooks/usePromotions.js';
import { webPromotionLocalState } from '../utils/promotionStorage';

export function useCustomerHomePromotions(userPhone) {
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
    userPhone,
    surface: 'customer_home',
    isStaff: false,
    localState: webPromotionLocalState,
    onCopyCode,
  });

  return {
    ...promoState,
    toast,
  };
}
