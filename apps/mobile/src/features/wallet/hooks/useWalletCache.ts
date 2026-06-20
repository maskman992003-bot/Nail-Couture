import AsyncStorage from '@react-native-async-storage/async-storage';
import { walletCacheKey } from '@nail-couture/shared/utils/loyaltyWallet.js';
import type { WalletSnapshot } from '../types';

export async function getCachedWalletSnapshot(profileId: string): Promise<WalletSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(walletCacheKey(profileId));
    if (!raw) return null;
    return JSON.parse(raw) as WalletSnapshot;
  } catch {
    return null;
  }
}

export async function setCachedWalletSnapshot(profileId: string, snapshot: WalletSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(walletCacheKey(profileId), JSON.stringify(snapshot));
  } catch {
    // ignore cache write failures
  }
}

export async function clearWalletCache(profileId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(walletCacheKey(profileId));
  } catch {
    // ignore
  }
}
