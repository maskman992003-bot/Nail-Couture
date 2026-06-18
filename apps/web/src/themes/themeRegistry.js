import theme01Config from './theme_01/themeConfig.js';
import theme02Config from './theme_02/themeConfig.js';
import theme03Config from './theme_03/themeConfig.js';
import { mergeSkinWithPalette } from './resolveThemePalette.js';

export const THEME_REGISTRY = {
  theme_01: theme01Config,
  theme_02: theme02Config,
  theme_03: theme03Config,
};

export const AVAILABLE_THEMES = Object.keys(THEME_REGISTRY);

export function getSkinConfig(activeTheme) {
  return THEME_REGISTRY[activeTheme] ?? theme01Config;
}

export function resolveThemeConfig(activeTheme, colorScheme = 'dark') {
  return mergeSkinWithPalette(getSkinConfig(activeTheme), colorScheme);
}

export function getThemeOptions() {
  return AVAILABLE_THEMES.map((id) => ({
    id,
    config: THEME_REGISTRY[id],
    description: THEME_REGISTRY[id].description,
  }));
}
