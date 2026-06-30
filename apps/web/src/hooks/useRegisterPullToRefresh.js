import { useEffect, useRef } from 'react';
import { usePullToRefreshContext } from '../contexts/PullToRefreshContext';

/**
 * Register a page-level refresh handler with the global pull-to-refresh host.
 * `blocked` suppresses starting a new pull (e.g. during drag-and-drop).
 */
export default function useRegisterPullToRefresh(onRefresh, { blocked = false } = {}) {
  const { register } = usePullToRefreshContext();
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const stableHandler = (...args) => onRefreshRef.current?.(...args);
    return register(stableHandler, { blocked });
  }, [blocked, register]);
}
