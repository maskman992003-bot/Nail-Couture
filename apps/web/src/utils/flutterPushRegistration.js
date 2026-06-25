import { isFlutterWebView } from './mobileFilePickers.js';

/**
 * Register the device FCM token with Supabase when running inside the Flutter APK.
 */
export async function registerFlutterPushToken(phone) {
  if (!phone?.trim()) return false;
  if (!isFlutterWebView() || typeof window === 'undefined' || !window.NativeBridge?.registerPushToken) {
    return false;
  }

  try {
    const result = await window.NativeBridge.registerPushToken({ phone: phone.trim() });
    return Boolean(result?.ok);
  } catch (error) {
    console.warn('Flutter push registration failed', error);
    return false;
  }
}
