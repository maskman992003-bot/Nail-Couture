import { useCallback, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { usePromotions } from '@nail-couture/shared/hooks/usePromotions.js';
import { mobilePromotionLocalState } from '../utils/promotionStorage';

export function useCustomerHomePromotions(userPhone?: string | null) {
  const [toast, setToast] = useState('');

  const onCopyCode = useCallback(async (code: string) => {
    await Clipboard.setStringAsync(code);
    setToast('Code copied');
    setTimeout(() => setToast(''), 2000);
  }, []);

  const promoState = usePromotions({
    userPhone,
    surface: 'customer_home',
    isStaff: false,
    localState: mobilePromotionLocalState,
    onCopyCode,
  });

  return {
    ...promoState,
    toast,
  };
}
