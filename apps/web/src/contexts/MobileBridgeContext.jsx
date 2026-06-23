import { createContext, useContext, useMemo } from 'react';
import {
  getNativePlatform,
  getNativeRootPaths,
  isNativeShell,
} from '../utils/nativeShell';

const MobileBridgeContext = createContext(null);

export function MobileBridgeProvider({ children }) {
  const value = useMemo(() => {
    const native = isNativeShell();
    return {
      isNativeShell: native,
      platform: getNativePlatform(),
      hideWebOnly: native,
      rootPaths: getNativeRootPaths,
    };
  }, []);

  return (
    <MobileBridgeContext.Provider value={value}>
      {children}
    </MobileBridgeContext.Provider>
  );
}

export function useMobileBridgeContext() {
  const ctx = useContext(MobileBridgeContext);
  if (!ctx) {
    throw new Error('useMobileBridgeContext must be used within MobileBridgeProvider');
  }
  return ctx;
}
