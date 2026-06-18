/** Per-skin dark/light surface palettes. Accent, fonts, and branding stay on the skin. */

export const STANDARD_PALETTES = {
  dark: {
    backgroundColor: '#121212',
    backgroundSecondary: '#1a1a1a',
    textPrimary: '#F9F9F9',
    textSecondary: 'rgba(249, 249, 249, 0.6)',
    textMuted: 'rgba(249, 249, 249, 0.4)',
    borderColor: 'rgba(197, 160, 89, 0.3)',
    borderLight: 'rgba(249, 249, 249, 0.1)',
    inputBg: 'rgba(249, 249, 249, 0.1)',
    inputBorder: 'rgba(249, 249, 249, 0.2)',
    accentGradient: 'linear-gradient(135deg, rgba(197, 160, 89, 0.15) 0%, rgba(26, 26, 26, 1) 100%)',
    cardStyle: {
      background: '#1a1a1a',
      border: '1px solid rgba(197, 160, 89, 0.2)',
    },
    layoutOverrides: {
      modalOverlay: 'rgba(0, 0, 0, 0.7)',
      sidebarBackground: '#0a0a0a',
      sidebarShadow: '0 12px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(240, 215, 140, 0.06)',
    },
  },
  light: {
    backgroundColor: '#FDF8F0',
    backgroundSecondary: '#F9F9F9',
    textPrimary: '#121212',
    textSecondary: 'rgba(18, 18, 18, 0.82)',
    textMuted: 'rgba(18, 18, 18, 0.65)',
    borderColor: 'rgba(197, 160, 89, 0.5)',
    borderLight: 'rgba(18, 18, 18, 0.1)',
    inputBg: 'rgba(18, 18, 18, 0.06)',
    inputBorder: 'rgba(18, 18, 18, 0.2)',
    accentGradient: 'linear-gradient(135deg, rgba(197, 160, 89, 0.12) 0%, #FDF8F0 100%)',
    cardStyle: {
      background: '#FFFFFF',
      border: '1px solid rgba(197, 160, 89, 0.3)',
    },
    layoutOverrides: {
      modalOverlay: 'rgba(18, 18, 18, 0.45)',
      sidebarBackground: '#F5F1EB',
      sidebarShadow: '0 12px 40px rgba(197, 160, 89, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
    },
  },
};

export const PREMIUM_PALETTES = {
  light: {
    backgroundColor: '#FBF9F6',
    backgroundSecondary: '#FFFFFF',
    textPrimary: '#2A241F',
    textSecondary: '#6E6259',
    textMuted: 'rgba(110, 98, 89, 0.55)',
    borderColor: 'rgba(184, 142, 76, 0.15)',
    borderLight: 'rgba(184, 142, 76, 0.08)',
    inputBg: '#FFFFFF',
    inputBorder: 'rgba(184, 142, 76, 0.22)',
    accentGradient: 'linear-gradient(135deg, rgba(184, 142, 76, 0.14) 0%, #FBF9F6 100%)',
    cardStyle: {
      background: '#FFFFFF',
      border: '1px solid rgba(184, 142, 76, 0.15)',
    },
    layoutOverrides: {
      modalOverlay: 'rgba(42, 36, 31, 0.45)',
      sidebarBackground: '#F5F1EB',
      sidebarShadow: '0 12px 40px rgba(184, 142, 76, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
    },
  },
  dark: {
    backgroundColor: '#1C1916',
    backgroundSecondary: '#252118',
    textPrimary: '#F9F6F2',
    textSecondary: 'rgba(249, 246, 242, 0.65)',
    textMuted: 'rgba(249, 246, 242, 0.45)',
    borderColor: 'rgba(184, 142, 76, 0.35)',
    borderLight: 'rgba(249, 246, 242, 0.1)',
    inputBg: 'rgba(249, 246, 242, 0.08)',
    inputBorder: 'rgba(249, 246, 242, 0.2)',
    accentGradient: 'linear-gradient(135deg, rgba(184, 142, 76, 0.18) 0%, #1C1916 100%)',
    cardStyle: {
      background: '#252118',
      border: '1px solid rgba(184, 142, 76, 0.25)',
    },
    layoutOverrides: {
      modalOverlay: 'rgba(0, 0, 0, 0.7)',
      sidebarBackground: '#141210',
      sidebarShadow: '0 12px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(184, 142, 76, 0.08)',
    },
  },
};

export const BOUTIQUE_PALETTES = {
  light: {
    backgroundColor: '#F7F4F0',
    backgroundSecondary: '#FDFCF9',
    textPrimary: '#3D3832',
    textSecondary: '#736A61',
    textMuted: 'rgba(115, 106, 97, 0.55)',
    borderColor: 'rgba(154, 122, 78, 0.15)',
    borderLight: 'rgba(154, 122, 78, 0.08)',
    inputBg: '#FFFFFF',
    inputBorder: 'rgba(154, 122, 78, 0.22)',
    accentGradient: 'linear-gradient(135deg, rgba(154, 122, 78, 0.14) 0%, #F7F4F0 100%)',
    cardStyle: {
      background: '#FDFCF9',
      border: '1px solid rgba(154, 122, 78, 0.15)',
    },
    layoutOverrides: {
      modalOverlay: 'rgba(61, 56, 50, 0.45)',
      sidebarBackground: '#EDE8E0',
      sidebarShadow: '0 12px 40px rgba(154, 122, 78, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
    },
  },
  dark: {
    backgroundColor: '#1A1815',
    backgroundSecondary: '#242019',
    textPrimary: '#F7F4F0',
    textSecondary: 'rgba(247, 244, 240, 0.65)',
    textMuted: 'rgba(247, 244, 240, 0.45)',
    borderColor: 'rgba(154, 122, 78, 0.35)',
    borderLight: 'rgba(247, 244, 240, 0.1)',
    inputBg: 'rgba(247, 244, 240, 0.08)',
    inputBorder: 'rgba(247, 244, 240, 0.2)',
    accentGradient: 'linear-gradient(135deg, rgba(154, 122, 78, 0.18) 0%, #1A1815 100%)',
    cardStyle: {
      background: '#242019',
      border: '1px solid rgba(154, 122, 78, 0.25)',
    },
    layoutOverrides: {
      modalOverlay: 'rgba(0, 0, 0, 0.7)',
      sidebarBackground: '#12100E',
      sidebarShadow: '0 12px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(154, 122, 78, 0.08)',
    },
  },
};
