import { useCallback, useEffect, useState } from 'react';
import {
  enrichWalletSnapshot,
  fetchWalletSnapshot,
  readWalletCache,
  subscribeWalletUpdates,
  writeWalletCache,
} from '@nail-couture/shared/utils/loyaltyWallet.js';

export function useWalletState(profileId) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);

  const applySnapshot = useCallback(
    (next, persist = true) => {
      const enriched = enrichWalletSnapshot(next);
      setSnapshot(enriched);
      setIsStale(false);
      if (persist && profileId && enriched?.success) {
        writeWalletCache(profileId, enriched);
      }
    },
    [profileId],
  );

  const refresh = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const live = await fetchWalletSnapshot(profileId);
      if (live?.success) {
        applySnapshot(live);
      } else {
        setSnapshot((prev) => prev || live);
        setIsStale(true);
      }
    } catch {
      setIsStale(true);
    } finally {
      setLoading(false);
    }
  }, [profileId, applySnapshot]);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return undefined;
    }

    const cached = readWalletCache(profileId);
    if (cached?.success) {
      setSnapshot(cached);
      setLoading(false);
      setIsStale(true);
    }

    refresh();

    const unsubscribe = subscribeWalletUpdates(profileId, {
      onProfileChange: () => refresh(),
      onPointsChange: () => refresh(),
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh on mount + profileId change only
  }, [profileId]);

  return { snapshot, loading, isStale, refresh };
}
