import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const PullToRefreshContext = createContext(null);

export function PullToRefreshProvider({ children }) {
  const registrationRef = useRef({
    onRefresh: null,
    blocked: false,
  });
  const [blocked, setBlocked] = useState(false);

  const register = useCallback((onRefresh, { blocked: nextBlocked = false } = {}) => {
    registrationRef.current = { onRefresh, blocked: nextBlocked };
    setBlocked((prev) => (prev === nextBlocked ? prev : nextBlocked));

    return () => {
      if (registrationRef.current.onRefresh === onRefresh) {
        registrationRef.current = { onRefresh: null, blocked: false };
        setBlocked((prev) => (prev ? false : prev));
      }
    };
  }, []);

  const runRefresh = useCallback(async () => {
    const { onRefresh } = registrationRef.current;
    if (onRefresh) {
      await onRefresh();
      return;
    }
    window.location.reload();
  }, []);

  const value = useMemo(
    () => ({
      register,
      runRefresh,
      blocked,
    }),
    [register, runRefresh, blocked],
  );

  return (
    <PullToRefreshContext.Provider value={value}>
      {children}
    </PullToRefreshContext.Provider>
  );
}

export function usePullToRefreshContext() {
  const context = useContext(PullToRefreshContext);
  if (!context) {
    throw new Error('usePullToRefreshContext must be used within PullToRefreshProvider');
  }
  return context;
}
