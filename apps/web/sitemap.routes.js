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
  '/fitness-assessment',
  '/nail-assessment',
];

export const publicSitemapRoutes = [...corePublicRoutes, ...wellnessSitemapRoutes];

/** Per-route sitemap metadata (vite-plugin-sitemap RoutesOptionMap) */
export const sitemapPriority = {
  '/': 1.0,
  '/fitness-assessment': 0.85,
  '/nail-assessment': 0.85,
  '*': 0.8,
};

export const sitemapChangefreq = {
  '/fitness-assessment': 'monthly',
  '/nail-assessment': 'monthly',
  '*': 'weekly',
};
