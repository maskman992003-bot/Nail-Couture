import { useCallback, useState } from 'react';
import { isNativeShell } from './nativeShell';

const LOG_PREFIX = '[biometricAuth]';

/**
 * Check whether biometrics are available on this device.
 * In browser dev tools, returns a safe mock without throwing.
 */
export async function checkBiometryAvailable() {
  if (!isNativeShell()) {
    console.warn(`${LOG_PREFIX} Web dev mode — biometrics unavailable, using mock.`);
    return { available: false, mocked: true, biometryType: null };
  }

  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
    const result = await BiometricAuth.checkBiometry();
    return { ...result, mocked: false };
  } catch (err) {
    console.warn(`${LOG_PREFIX} checkBiometry failed:`, err);
    return { available: false, mocked: true, error: err };
  }
}

/**
 * Prompt Face ID / fingerprint. Never throws — returns { success, mocked?, error? }.
 */
export async function authenticateWithBiometrics(options = {}) {
  const {
    reason = 'Verify your identity',
    allowDeviceCredential = true,
  } = options;

  if (!isNativeShell()) {
    console.warn(`${LOG_PREFIX} Mock authenticate success (browser).`);
    return { success: true, mocked: true };
  }

  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
    await BiometricAuth.authenticate({
      reason,
      allowDeviceCredential,
    });
    return { success: true, mocked: false };
  } catch (err) {
    console.warn(`${LOG_PREFIX} authenticate failed:`, err);
    return { success: false, mocked: false, error: err };
  }
}

export function useBiometricAuth() {
  const [checking, setChecking] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const result = await checkBiometryAvailable();
      setLastResult(result);
      return result;
    } finally {
      setChecking(false);
    }
  }, []);

  const authenticate = useCallback(async (options) => {
    setAuthenticating(true);
    try {
      const result = await authenticateWithBiometrics(options);
      setLastResult(result);
      return result;
    } finally {
      setAuthenticating(false);
    }
  }, []);

  return {
    checking,
    authenticating,
    lastResult,
    check,
    authenticate,
  };
}
