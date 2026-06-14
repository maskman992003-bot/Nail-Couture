import { useCallback, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { usePromotions } from '@nail-couture/shared/hooks/usePromotions.js';
import { mobilePromotionLocalState } from '../utils/promotionStorage';

type Options = {
  userPhone?: string | null;
  isStaff?: boolean;
  scrollToBooking?: () => void;
};

export function usePublicHomePromotions({ userPhone, isStaff, scrollToBooking }: Options) {
  const [toast, setToast] = useState('');

  const onCopyCode = useCallback(async (code: string) => {
    await Clipboard.setStringAsync(code);
    setToast('Code copied');
    setTimeout(() => setToast(''), 2000);
  }, []);

  const promoState = usePromotions({
    userPhone,
    surface: 'public_home',
    isStaff,
    localState: mobilePromotionLocalState,
    onCopyCode,
    scrollToBooking,
    openUrl: (url) => {
      import('react-native').then(({ Linking }) => Linking.openURL(url));
    },
  });

  return {
    ...promoState,
    toast,
  };
}
