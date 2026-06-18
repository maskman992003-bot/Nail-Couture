import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  applyThemeEngineConfig,
  readStoredAppTheme,
} from '../themes/applyThemeEngine.js';
import { AVAILABLE_THEMES, getSkinConfig } from '../themes/themeRegistry.js';
import { buildAppThemeContextValue } from '../themes/themeUtils.js';
import {
  cacheColorScheme,
  getSkinDefaultColorScheme,
  mergeSkinWithPalette,
  readStoredColorScheme,
} from '../themes/resolveThemePalette.js';
import {
  cacheAppThemeLocally,
  fetchAppThemeFromDatabase,
  normalizeAppTheme,
  persistAppThemeToDatabase,
  subscribeToAppThemeChanges,
} from '../themes/appThemeService.js';

const THEME_POLL_MS = 15000;

const ThemeEngineContext = createContext(null);

function ThemeEngineApplicator() {
  const { skinConfig, colorScheme } = useAppTheme();

  useEffect(() => {
    applyThemeEngineConfig(skinConfig, colorScheme);
    cacheColorScheme(colorScheme);
  }, [skinConfig, colorScheme]);

  return null;
}

export function ThemeEngineProvider({ children }) {
  const [activeTheme, setActiveTheme] = useState(readStoredAppTheme);
  const skinConfig = useMemo(() => getSkinConfig(activeTheme), [activeTheme]);
  const [colorScheme, setColorScheme] = useState(() =>
    readStoredColorScheme(getSkinDefaultColorScheme(skinConfig)),
  );
  const [themeLoading, setThemeLoading] = useState(true);
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeError, setThemeError] = useState('');

  const resolvedThemeConfig = useMemo(
    () => mergeSkinWithPalette(skinConfig, colorScheme),
    [skinConfig, colorScheme],
  );

  const applySkin = useCallback((themeName) => {
    const normalized = normalizeAppTheme(themeName);
    setActiveTheme(normalized);
    cacheAppThemeLocally(normalized);
    return normalized;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncFromDatabase() {
      const remoteTheme = await fetchAppThemeFromDatabase();
      if (!cancelled && remoteTheme) {
        applySkin(remoteTheme);
      }
      if (!cancelled) {
        setThemeLoading(false);
      }
    }

    syncFromDatabase();
    const unsubscribeRealtime = subscribeToAppThemeChanges((remoteTheme) => {
      if (!cancelled) {
        applySkin(remoteTheme);
      }
    });
    const pollId = window.setInterval(syncFromDatabase, THEME_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      unsubscribeRealtime();
    };
  }, [applySkin]);

  const toggleTheme = useCallback(() => {
    setColorScheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      cacheColorScheme(next);
      return next;
    });
  }, []);

  const switchTheme = useCallback(async (themeName, callerPhone) => {
    if (!AVAILABLE_THEMES.includes(themeName)) {
      console.warn(`[ThemeEngine] Unknown theme "${themeName}". Available: ${AVAILABLE_THEMES.join(', ')}`);
      return { success: false, error: 'invalid_theme' };
    }

    setThemeError('');
    setThemeSaving(true);
    const previousTheme = activeTheme;
    applySkin(themeName);

    try {
      if (callerPhone) {
        const result = await persistAppThemeToDatabase(themeName, callerPhone);
        if (!result?.success) {
          applySkin(previousTheme);
          const message = result?.error === 'forbidden'
            ? 'Only super admins can change the global application theme.'
            : result?.error || 'Failed to save theme.';
          setThemeError(message);
          return { success: false, error: message };
        }
      }

      return { success: true, activeTheme: themeName };
    } catch (err) {
      applySkin(previousTheme);
      const message = err?.message || 'Failed to save theme.';
      setThemeError(message);
      return { success: false, error: message };
    } finally {
      setThemeSaving(false);
    }
  }, [activeTheme, applySkin]);

  const value = useMemo(
    () => buildAppThemeContextValue({
      activeTheme,
      skinConfig,
      themeConfig: resolvedThemeConfig,
      colorScheme,
      themeLoading,
      themeSaving,
      themeError,
      switchTheme,
      toggleTheme,
      availableThemes: AVAILABLE_THEMES,
    }),
    [
      activeTheme,
      skinConfig,
      resolvedThemeConfig,
      colorScheme,
      themeLoading,
      themeSaving,
      themeError,
      switchTheme,
      toggleTheme,
    ],
  );

  return (
    <ThemeEngineContext.Provider value={value}>
      <ThemeEngineApplicator />
      {children}
    </ThemeEngineContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeEngineContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeEngineProvider');
  }
  return context;
}

export const useThemeEngine = useAppTheme;
