import { useCallback, useEffect, useState } from 'react';
import {
  enrichWalletSnapshot,
  fetchWalletSnapshot,
  subscribeWalletUpdates,
} from '@nail-couture/shared/utils/loyaltyWallet.js';
import type { WalletSnapshot } from '../types';
import { getCachedWalletSnapshot, setCachedWalletSnapshot } from './useWalletCache';

export function useWalletState(profileId: string | undefined) {
  const [snapshot, setSnapshot] = useState<WalletSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);

  const applySnapshot = useCallback(
    async (next: WalletSnapshot, persist = true) => {
      const enriched = enrichWalletSnapshot(next) as WalletSnapshot;
      setSnapshot(enriched);
      setIsStale(false);
      if (persist && profileId && enriched.success) {
        await setCachedWalletSnapshot(profileId, enriched);
      }
    },
    [profileId],
  );

  const refresh = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const live = (await fetchWalletSnapshot(profileId)) as WalletSnapshot;
      if (live?.success) {
        await applySnapshot(live);
      } else if (!snapshot) {
        setSnapshot(live);
      } else {
        setIsStale(true);
      }
    } catch {
      setIsStale(true);
    } finally {
      setLoading(false);
    }
  }, [profileId, applySnapshot, snapshot]);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return undefined;
    }

    let mounted = true;

    (async () => {
      const cached = await getCachedWalletSnapshot(profileId);
      if (mounted && cached?.success) {
        setSnapshot(cached);
        setLoading(false);
        setIsStale(true);
      }
      await refresh();
    })();

    const unsubscribe = subscribeWalletUpdates(profileId, {
      onProfileChange: () => refresh(),
      onPointsChange: () => refresh(),
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [profileId, refresh]);

  return { snapshot, loading, isStale, refresh };
}
