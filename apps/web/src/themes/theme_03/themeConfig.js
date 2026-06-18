import { DEFAULT_NAV_LINKS } from '../landingContent.js';
import { BOUTIQUE_PALETTES } from '../skinPalettes.js';

const BOUTIQUE_SERVICES = [
  { key: 'acrylics', image: '/landing/boutique/service-acrylics.png', alt: 'Hands with nude pink acrylic nails' },
  { key: 'gelx', image: '/landing/boutique/service-gelx.png', alt: 'Hands with natural gel nails' },
  { key: 'builder', image: '/landing/boutique/service-builder.png', alt: 'Hands with pink builder gel nails' },
  { key: 'pedicures', image: '/landing/boutique/service-pedicure.png', alt: 'Luxury pedicure with flowers in spa bowl' },
  { key: 'waxing', image: '/landing/boutique/service-waxing.png', alt: 'Woman receiving a facial waxing treatment' },
];

const themeConfig = {
  id: 'theme_03',
  name: 'Boutique Lounge',
  description: 'Soft cream canvas, Cormorant headings, and Montserrat body type',
  defaultColorScheme: 'light',
  palettes: BOUTIQUE_PALETTES,
  accentColor: '#9A7A4E',
  buttonAnimations: {
    transition: 'all 0.4s ease',
    hoverTransform: 'none',
    activeTransform: 'scale(0.98)',
    shimmerClass: null,
  },
  fonts: {
    heading: "'Cormorant Garamond', serif",
    body: "'Montserrat', sans-serif",
  },
  branding: {
    logoUrl: '/landing/logo-nc.png',
    logoType: 'text',
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
    layout: 'boutique',
    navLinks: DEFAULT_NAV_LINKS,
    assets: {
      hero: '/landing/boutique/hero-reception.png',
      experience: '/landing/boutique/experience-chairs.png',
      story: null,
      gallery: '/landing/boutique/flowers-vases.png',
      services: BOUTIQUE_SERVICES,
    },
  },
};

export default themeConfig;
