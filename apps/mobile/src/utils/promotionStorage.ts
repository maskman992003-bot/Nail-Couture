import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPromotionLocalState } from '@nail-couture/shared/utils/promotionLocalState.js';

export const mobilePromotionLocalState = createPromotionLocalState({
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
});
