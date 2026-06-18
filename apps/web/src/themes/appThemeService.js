import { supabase } from '../lib/supabase.js';
import { THEME_ENGINE_STORAGE_KEY } from './applyThemeEngine.js';
import { AVAILABLE_THEMES } from './themeRegistry.js';

const VALID_THEMES = new Set(AVAILABLE_THEMES);

export function normalizeAppTheme(value) {
  return VALID_THEMES.has(value) ? value : 'theme_01';
}

export async function fetchAppThemeFromDatabase() {
  try {
    const { data, error } = await supabase.rpc('get_app_theme');
    if (error) {
      if (import.meta.env.DEV) {
        console.warn('[ThemeEngine] get_app_theme unavailable:', error.message);
      }
      return null;
    }
    return normalizeAppTheme(data);
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[ThemeEngine] Failed to fetch app theme:', err);
    }
    return null;
  }
}

export async function persistAppThemeToDatabase(themeName, callerPhone) {
  if (!callerPhone) {
    return { success: false, error: 'missing_caller_phone' };
  }

  try {
    const { data, error } = await supabase.rpc('set_app_theme', {
      caller_phone: callerPhone,
      p_theme: themeName,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return data ?? { success: false, error: 'empty_response' };
  } catch (err) {
    return { success: false, error: err?.message || 'persist_failed' };
  }
}

export function cacheAppThemeLocally(themeName) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(THEME_ENGINE_STORAGE_KEY, normalizeAppTheme(themeName));
}

export function subscribeToAppThemeChanges(onThemeChange) {
  const channel = supabase
    .channel('app-theme-config')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'app_configurations' },
      (payload) => {
        const next = normalizeAppTheme(payload.new?.active_theme);
        onThemeChange(next);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
