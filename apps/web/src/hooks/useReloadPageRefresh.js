import { useCallback } from 'react';
import useRegisterPullToRefresh from './useRegisterPullToRefresh';

/** Register pull-to-refresh that reloads the current page (public/marketing/auth shells). */
export function useReloadPageRefresh() {
  const reload = useCallback(() => {
    window.location.reload();
  }, []);
  useRegisterPullToRefresh(reload);
}
