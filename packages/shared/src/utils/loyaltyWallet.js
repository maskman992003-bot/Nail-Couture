import { supabase } from '../lib/supabase.js';
import { getNextTier, getTierConfig } from '../constants/loyaltyProgram.js';

export const WALLET_CACHE_PREFIX = 'wallet_snapshot_';

export function walletCacheKey(profileId) {
  return `${WALLET_CACHE_PREFIX}${profileId}`;
}

export async function fetchWalletSnapshot(profileId) {
  const { data, error } = await supabase.rpc('get_wallet_snapshot', {
    p_profile_id: profileId,
  });

  if (error) {
    if (error.message?.includes('get_wallet_snapshot') || error.code === '42883') {
      return { success: false, error: 'Wallet service unavailable. Run sql/100_loyalty_digital_wallet.sql in Supabase.' };
    }
    return { success: false, error: error.message || 'Failed to load wallet' };
  }

  return data || { success: false, error: 'Unexpected response' };
}

export async function redeemVaultMilestone(profileId, milestonePoints) {
  const { data, error } = await supabase.rpc('redeem_vault_milestone', {
    p_profile_id: profileId,
    p_milestone_points: milestonePoints,
  });

  if (error) {
    if (error.message?.includes('redeem_vault_milestone') || error.code === '42883') {
      return { success: false, error: 'Vault redemption unavailable. Run sql/100_loyalty_digital_wallet.sql in Supabase.' };
    }
    return { success: false, error: error.message || 'Redemption failed' };
  }

  return data || { success: false, error: 'Unexpected response' };
}

export function subscribeWalletUpdates(profileId, { onProfileChange, onPointsChange } = {}) {
  const channel = supabase
    .channel(`wallet-${profileId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profileId}` },
      (payload) => onProfileChange?.(payload),
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'loyalty_transactions', filter: `profile_id=eq.${profileId}` },
      (payload) => onPointsChange?.(payload),
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export function enrichWalletSnapshot(snapshot) {
  if (!snapshot?.success) return snapshot;
  const tier = getTierConfig(snapshot.tier);
  const nextTierId = snapshot.next_tier || getNextTier(snapshot.tier);
  const nextTier = nextTierId ? getTierConfig(nextTierId) : null;
  return {
    ...snapshot,
    tierName: tier.name,
    tierColor: tier.color,
    tierTagline: tier.tagline,
    tierBenefits: tier.benefits,
    nextTierName: nextTier?.name || null,
    rolling_spend_12m: snapshot.rolling_spend_12m ?? snapshot.calendar_spend_ytd ?? 0,
    cached_at: new Date().toISOString(),
  };
}

/** Browser localStorage cache (web Digital Wallet) */
export function readWalletCache(profileId) {
  if (typeof localStorage === 'undefined' || !profileId) return null;
  try {
    const raw = localStorage.getItem(walletCacheKey(profileId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeWalletCache(profileId, snapshot) {
  if (typeof localStorage === 'undefined' || !profileId || !snapshot?.success) return;
  try {
    const enriched = enrichWalletSnapshot(snapshot);
    localStorage.setItem(walletCacheKey(profileId), JSON.stringify(enriched));
  } catch {
    // ignore cache write failures
  }
}

export function clearWalletCache(profileId) {
  if (typeof localStorage === 'undefined' || !profileId) return;
  try {
    localStorage.removeItem(walletCacheKey(profileId));
  } catch {
    // ignore
  }
}
