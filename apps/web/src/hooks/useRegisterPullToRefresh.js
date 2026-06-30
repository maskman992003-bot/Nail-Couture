import { useEffect } from 'react';
import { usePullToRefreshContext } from '../contexts/PullToRefreshContext';

/**
 * Register a page-level refresh handler with the global pull-to-refresh host.
 * `blocked` suppresses starting a new pull (e.g. during drag-and-drop).
 */
export default function useRegisterPullToRefresh(onRefresh, { blocked = false } = {}) {
  const { register } = usePullToRefreshContext();

  useEffect(() => {
    if (!onRefresh) return undefined;
    return register(onRefresh, { blocked });
  }, [onRefresh, blocked, register]);
}
