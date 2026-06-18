import { DEFAULT_NAV_LINKS } from '../landingContent.js';
import { PREMIUM_PALETTES } from '../skinPalettes.js';

const PREMIUM_SERVICES = [
  { key: 'acrylics', image: '/landing/service-acrylics.jpg', alt: 'Acrylic nail enhancements' },
  { key: 'gelx', image: '/landing/service-gelx.jpg', alt: 'Gel X nail extensions' },
  { key: 'builder', image: '/landing/service-builder.jpg', alt: 'Builder gel nails' },
  { key: 'pedicures', image: '/landing/service-pedicures.jpg', alt: 'Luxury pedicure service' },
  { key: 'waxing', image: '/landing/service-waxing.jpg', alt: 'Waxing refinements' },
];

const themeConfig = {
  id: 'theme_02',
  name: 'Nail Couture Premium Cream',
  description: 'Warm ivory, crisp white panels, and muted metallic gold',
  defaultColorScheme: 'light',
  palettes: PREMIUM_PALETTES,
  accentColor: '#B88E4C',
  buttonAnimations: {
    transition: 'all 0.4s ease',
    hoverTransform: 'none',
    activeTransform: 'scale(0.98)',
    shimmerClass: null,
  },
  fonts: {
    heading: "'Cormorant Garamond', serif",
    body: "'Inter', sans-serif",
  },
  branding: {
    logoUrl: '/landing/logo-header.png',
    logoType: 'monogram',
  },
  layout: {
    contentMaxWidth: '1280px',
    cardRadius: '0.25rem',
  },
  cardStyle: {
    borderRadius: '0.25rem',
    backdropFilter: null,
    boxShadow: 'none',
  },
  landing: {
    layout: 'premium',
    navLinks: DEFAULT_NAV_LINKS,
    assets: {
      hero: '/landing/hero-reception.jpg',
      experience: '/landing/experience-interior.jpg',
      story: '/landing/story-detail.jpg',
      gallery: null,
      services: PREMIUM_SERVICES,
    },
  },
};

export default themeConfig;
