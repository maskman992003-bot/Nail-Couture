const PUBLIC_PATH_PREFIXES = [
  '/login',
  '/register',
  '/check-in',
  '/gift/claim',
];

const PUBLIC_EXACT_PATHS = new Set([
  '/',
  '/lookbook',
  '/about',
  '/booking',
  '/services',
  '/fitness-assessment',
  '/nail-assessment',
]);

export function shouldShowAppSidebar(pathname, user) {
  if (!user) return false;
  if (PUBLIC_EXACT_PATHS.has(pathname)) return false;
  if (PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false;
  if (import.meta.env.DEV && pathname.startsWith('/dev/')) return false;
  return true;
}
