import { useEffect } from 'react';
import { usePullToRefreshContext } from '../contexts/PullToRefreshContext';

/**
 * Register a page-level refresh handler with the global pull-to-refresh host.
 * Listeners stay active while the page is mounted — `blocked` only suppresses
 * starting a new pull (e.g. during drag-and-drop), not the gesture system itself.
 */
export default function useRegisterPullToRefresh(onRefresh, { blocked = false } = {}) {
  const { register } = usePullToRefreshContext();

  useEffect(() => {
    if (!onRefresh) return undefined;
    return register(onRefresh, { blocked });
  }, [onRefresh, blocked, register]);
}
