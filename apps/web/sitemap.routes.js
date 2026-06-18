import {
  FITNESS_ASSESSMENT,
  NAIL_HEALTH_ASSESSMENT,
} from '../../packages/shared/src/constants/featureFlags.js';

/** Public marketing routes included in sitemap.xml */
/** Homepage (/) is auto-included from dist/index.html by vite-plugin-sitemap */

/** Core salon pages */
const corePublicRoutes = [
  '/lookbook',
  '/services',
  '/booking',
  '/about',
];

/** Wellness tools — public fitness and nail health assessments */
export const wellnessSitemapRoutes = [
  FITNESS_ASSESSMENT && '/fitness-assessment',
  NAIL_HEALTH_ASSESSMENT && '/nail-assessment',
].filter(Boolean);

export const publicSitemapRoutes = [...corePublicRoutes, ...wellnessSitemapRoutes];

/** Per-route sitemap metadata (vite-plugin-sitemap RoutesOptionMap) */
export const sitemapPriority = {
  '/': 1.0,
  ...(FITNESS_ASSESSMENT ? { '/fitness-assessment': 0.85 } : {}),
  ...(NAIL_HEALTH_ASSESSMENT ? { '/nail-assessment': 0.85 } : {}),
  '*': 0.8,
};

export const sitemapChangefreq = {
  ...(FITNESS_ASSESSMENT ? { '/fitness-assessment': 'monthly' } : {}),
  ...(NAIL_HEALTH_ASSESSMENT ? { '/nail-assessment': 'monthly' } : {}),
  '*': 'weekly',
};
