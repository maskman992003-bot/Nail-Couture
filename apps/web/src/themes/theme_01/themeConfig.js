import { DEFAULT_NAV_LINKS } from '../landingContent.js';
import { STANDARD_PALETTES } from '../skinPalettes.js';

const themeConfig = {
  id: 'theme_01',
  name: 'Standard',
  description: 'Charcoal and gold — our classic salon identity',
  defaultColorScheme: 'dark',
  palettes: STANDARD_PALETTES,
  accentColor: '#C5A059',
  buttonAnimations: {
    transition: 'all 0.3s ease',
    hoverTransform: 'translateY(-1px)',
    activeTransform: 'scale(0.98)',
    shimmerClass: null,
  },
  fonts: {
    heading: "'Playfair Display', Georgia, serif",
    body: "'Inter', system-ui, sans-serif",
  },
  branding: {
    logoUrl: '/NC.jpg',
    watermarkUrl: '/NC.jfif.png',
    logoType: 'image',
  },
  layout: {
    contentMaxWidth: '1280px',
    cardRadius: '1rem',
  },
  cardStyle: {
    borderRadius: '1rem',
    backdropFilter: null,
    boxShadow: 'none',
  },
  landing: {
    layout: 'classic',
    navLinks: DEFAULT_NAV_LINKS,
    assets: {
      watermark: '/NC.jfif.png',
    },
  },
};

export default themeConfig;
