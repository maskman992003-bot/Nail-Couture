import { Capacitor } from '@capacitor/core';
import { getHomePath } from '@nail-couture/shared/utils/routes';

/** Public marketing routes blocked in the native shell (Apple 4.2). */
export const NATIVE_BLOCKED_PUBLIC_PATHS = [
  '/',
  '/lookbook',
  '/about',
  '/booking',
  '/services',
  '/fitness-assessment',
  '/nail-assessment',
];

const MOCK_NATIVE_QUERY = 'nativeShell';
const MOCK_NATIVE_STORAGE_KEY = 'nc-mock-native-shell';

function isMockNativeShellEnabled() {
  if (typeof window === 'undefined') return false;
  if (import.meta.env.VITE_MOCK_NATIVE_SHELL === 'true') return true;
  try {
    if (new URLSearchParams(window.location.search).has(MOCK_NATIVE_QUERY)) {
      sessionStorage.setItem(MOCK_NATIVE_STORAGE_KEY, '1');
      return true;
    }
    return sessionStorage.getItem(MOCK_NATIVE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function isNativeShell() {
  if (Capacitor.isNativePlatform()) return true;
  return isMockNativeShellEnabled();
}

export function getNativePlatform() {
  if (Capacitor.isNativePlatform()) return Capacitor.getPlatform();
  if (isMockNativeShellEnabled()) return 'web-mock';
  return 'web';
}

export function isNativeBlockedPublicPath(pathname) {
  return NATIVE_BLOCKED_PUBLIC_PATHS.includes(pathname);
}

/** Paths where Android back should exit the app instead of navigating. */
export function getNativeRootPaths(user) {
  const paths = ['/login', '/register'];
  if (user?.role) {
    paths.push(getHomePath(user.role));
  }
  return paths;
}

export function isNativeRootPath(pathname, user) {
  return getNativeRootPaths(user).includes(pathname);
}
