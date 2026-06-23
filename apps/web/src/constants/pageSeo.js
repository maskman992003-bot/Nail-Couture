export const SITE_URL = 'https://www.nailcouture.net';
export const SITE_NAME = 'Nail Couture';

export function formatPageTitle(pageTitle) {
  const trimmed = String(pageTitle || '').trim();
  if (!trimmed || trimmed === SITE_NAME) return SITE_NAME;
  if (trimmed.startsWith(`${SITE_NAME} |`) || trimmed.startsWith(`${SITE_NAME}|`)) {
    return trimmed;
  }
  return `${SITE_NAME} | ${trimmed}`;
}

export const DEFAULT_PAGE_SEO = {
  title: 'Beauty · Care · Affection',
  description:
    'Beauty · Care · Affection · Uptown New Orleans',
  path: '/',
};

export const APP_PAGE_SEO = {
  '/': DEFAULT_PAGE_SEO,
  '/lookbook': {
    title: 'Luxury Custom Gallery',
    description:
      'Browse our luxury custom gallery. Explore nail art designs handcrafted at Nail Couture.',
    path: '/lookbook',
  },
  '/booking': {
    title: 'Book Your Custom Consultation',
    description:
      'Schedule your custom Nail consultation at Nail Couture.',
    path: '/booking',
  },
  '/about': {
    title: 'About Our Luxury Studio',
    description:
      'Learn about Nail Couture, our luxury nail salon. medical-grade sterilization, and artisan custom nail art.',
    path: '/about',
  },
  '/check-in': {
    title: 'Guest Check-In Portal',
    description:
      'Check in for your Nail Couture appointment. Use our guest check-in portal for fast salon arrivals, service selection, and visit registration.',
    path: '/check-in',
  },
  '/fitness-assessment': {
    title: 'Fitness Assessment Dashboard',
    description:
      'Calculate your BMI, BMR, TDEE, and body fat percentage with our free fitness assessment tool. Real-time results with personalized calorie targets.',
    path: '/fitness-assessment',
  },
  '/nail-assessment': {
    title: 'Nail Health Assessment Dashboard',
    description:
      'Assess nail structure, surface health, and lifestyle to receive personalized chemistry recommendations, prep protocols, and maintenance timelines.',
    path: '/nail-assessment',
  },
  '/services': {
    title: 'Premium Manicure & Nail Art Services',
    description:
      'View premium manicure and nail art services at Nail Couture. Medical-grade sterilization and custom couture pricing.',
    path: '/services',
  },
  '/login': {
    title: 'Sign In',
    description: 'Sign in to your Nail Couture account.',
    path: '/login',
  },
  '/register': {
    title: 'Create Account',
    description: 'Create your Nail Couture account.',
    path: '/register',
  },
  '/portal': {
    title: 'My Portal',
    description: 'Your Nail Couture home — bookings, loyalty, and salon updates.',
    path: '/portal',
  },
  '/customer/book': {
    title: 'Book Appointment',
    description: 'Book your next Nail Couture appointment online.',
    path: '/customer/book',
  },
  '/customer/services': {
    title: 'Services',
    description: 'Browse Nail Couture services and pricing.',
    path: '/customer/services',
  },
  '/customer/history': {
    title: 'Visit History',
    description: 'View your Nail Couture visit and booking history.',
    path: '/customer/history',
  },
  '/customer/loyalty': {
    title: 'Digital Wallet',
    description: 'Track your Nail Couture loyalty points and rewards.',
    path: '/customer/loyalty',
  },
  '/customer/gift-cards': {
    title: 'Gift Cards',
    description: 'View and manage your Nail Couture gift cards.',
    path: '/customer/gift-cards',
  },
  '/customer/profile': {
    title: 'My Profile',
    description: 'Your Nail Couture customer profile.',
    path: '/customer/profile',
  },
  '/customer/settings': {
    title: 'Settings',
    description: 'Manage your Nail Couture account settings.',
    path: '/customer/settings',
  },
  '/customer/salon-updates': {
    title: 'Salon Updates',
    description: 'Announcements and updates from Nail Couture.',
    path: '/customer/salon-updates',
  },
  '/customer/fitness-assessment': {
    title: 'Fitness Assessment',
    description: 'Your personal fitness assessment dashboard.',
    path: '/customer/fitness-assessment',
  },
  '/customer/nail-assessment': {
    title: 'Nail Health Assessment',
    description: 'Your personal nail health assessment dashboard.',
    path: '/customer/nail-assessment',
  },
};

const ROUTE_TITLE_OVERRIDES = {
  lobby: 'Lobby',
  reports: 'Reports',
  checkout: 'Checkout',
  transactions: 'Transactions',
  'gift-cards': 'Gift Cards',
  customers: 'Customers',
  services: 'Services',
  staff: 'Staff Management',
  schedule: 'Schedule',
  inventory: 'Inventory',
  bookings: 'Bookings',
  settings: 'Settings',
  announcements: 'Announcements',
  promotions: 'Promotions',
  reviews: 'Reviews',
  tips: 'Tips',
  activity: 'Salon Activity',
};

export function resolveRouteSeo(pathname) {
  if (APP_PAGE_SEO[pathname]) {
    return { ...APP_PAGE_SEO[pathname], path: pathname };
  }

  if (pathname.startsWith('/customer/edit/')) {
    return {
      title: 'Edit Booking',
      description: 'Update your Nail Couture appointment.',
      path: pathname,
    };
  }

  if (/\/customers\/[^/]+$/.test(pathname)) {
    return {
      title: 'Customer Detail',
      description: 'Customer profile and visit history.',
      path: pathname,
    };
  }

  const segments = pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  const title = ROUTE_TITLE_OVERRIDES[last]
    || (last ? last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Home');

  return {
    title,
    description: DEFAULT_PAGE_SEO.description,
    path: pathname,
  };
}
