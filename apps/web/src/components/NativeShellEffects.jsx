import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../contexts/AuthContext';
import { useMobileBridge } from '../hooks/useMobileBridge';
import { isFlutterWebView, isNativeRootPath } from '../utils/nativeShell';

export default function NativeShellEffects() {
  const { isNativeShell } = useMobileBridge();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const splashHiddenRef = useRef(false);
  const navigateRef = useRef(navigate);
  const userRef = useRef(user);
  navigateRef.current = navigate;
  userRef.current = user;

  useEffect(() => {
    if (!isNativeShell || !Capacitor.isNativePlatform()) return;

    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    if (Capacitor.getPlatform() === 'android') {
      StatusBar.setBackgroundColor({ color: '#121212' }).catch(() => {});
    }
  }, [isNativeShell]);

  useEffect(() => {
    if (!isNativeShell || !Capacitor.isNativePlatform() || loading || splashHiddenRef.current) {
      return;
    }

    splashHiddenRef.current = true;
    const hideSplash = () => SplashScreen.hide().catch(() => {});
    requestAnimationFrame(() => {
      requestAnimationFrame(hideSplash);
    });
  }, [isNativeShell, loading]);

  useEffect(() => {
    if (!isNativeShell || Capacitor.getPlatform() !== 'android') return;

    let removeListener;
    const setup = async () => {
      const handle = await App.addListener('backButton', () => {
        const pathname = location.pathname;
        if (isNativeRootPath(pathname, user)) {
          App.exitApp();
          return;
        }
        if (window.history.length > 1) {
          navigate(-1);
          return;
        }
        App.exitApp();
      });
      removeListener = () => handle.remove();
    };

    setup().catch(() => {});

    return () => {
      removeListener?.();
    };
  }, [isNativeShell, navigate, user, location.pathname]);

  // Flutter WebView: mark shell + back-button bridge (WKWebView often reports 0 safe-area env vars).
  useEffect(() => {
    if (!isFlutterWebView()) return undefined;

    document.documentElement.setAttribute('data-native-shell', 'flutter');

    window.__ncHandleBackButton = () => {
      const pathname = window.location.pathname;
      if (isNativeRootPath(pathname, userRef.current)) {
        return 'exit';
      }
      if (window.history.length > 1) {
        navigateRef.current(-1);
        return 'navigated';
      }
      return 'exit';
    };

    return () => {
      document.documentElement.removeAttribute('data-native-shell');
      delete window.__ncHandleBackButton;
    };
  }, []);

  return null;
}
