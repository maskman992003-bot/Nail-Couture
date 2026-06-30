import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const PullToRefreshContext = createContext(null);

export function PullToRefreshProvider({ children }) {
  const registrationRef = useRef({
    onRefresh: null,
    blocked: false,
  });
  const [version, setVersion] = useState(0);

  const register = useCallback((onRefresh, { blocked = false } = {}) => {
    registrationRef.current = { onRefresh, blocked };
    setVersion((value) => value + 1);

    return () => {
      if (registrationRef.current.onRefresh === onRefresh) {
        registrationRef.current = { onRefresh: null, blocked: false };
        setVersion((value) => value + 1);
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
      blocked: registrationRef.current.blocked,
      version,
    }),
    [register, runRefresh, version],
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
