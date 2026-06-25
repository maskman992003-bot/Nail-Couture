import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { registerFlutterPushToken } from '../utils/flutterPushRegistration.js';

/** Registers FCM push tokens when the app runs inside the Flutter WebView shell. */
export default function FlutterPushRegistrar() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.phone) return undefined;

    registerFlutterPushToken(user.phone).catch(() => undefined);
    return undefined;
  }, [user?.phone]);

  return null;
}
