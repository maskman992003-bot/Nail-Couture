import { useEffect } from 'react';
import { usePullToRefreshContext } from '../contexts/PullToRefreshContext';

export default function useRegisterPullToRefresh(onRefresh, { disabled = false } = {}) {
  const { register } = usePullToRefreshContext();

  useEffect(() => {
    if (!onRefresh) return undefined;
    return register(onRefresh, { disabled });
  }, [onRefresh, disabled, register]);
}
