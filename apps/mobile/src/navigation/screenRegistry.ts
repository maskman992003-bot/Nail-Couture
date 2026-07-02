import { getScreenNameForNavItem } from '@nail-couture/shared/navigation/navItems.js';

export type AppScreenName =
  | 'Home'
  | 'Schedule'
  | 'PhoneBooking'
  | 'Lobby'
  | 'Bookings'
  | 'Staff'
  | 'Inventory'
  | 'Services'
  | 'Reports'
  | 'Customers'
  | 'SalonActivity'
  | 'Announcements'
  | 'SalonUpdates'
  | 'Checkout'
  | 'Transactions'
  | 'Tips'
  | 'Profile'
  | 'Book'
  | 'Loyalty'
  | 'GiftCards'
  | 'History'
  | 'Reviews'
  | 'Settings'
  | 'FitnessAssessment';

export function resolveScreenName(navItemId: string): AppScreenName {
  return getScreenNameForNavItem(navItemId) as AppScreenName;
}

export const ALL_SCREEN_NAMES: AppScreenName[] = [
  'Home',
  'Schedule',
  'PhoneBooking',
  'Lobby',
  'Bookings',
  'Staff',
  'Inventory',
  'Services',
  'Reports',
  'Customers',
  'SalonActivity',
  'Announcements',
  'SalonUpdates',
  'Checkout',
  'Transactions',
  'Tips',
  'Profile',
  'Book',
  'Loyalty',
  'GiftCards',
  'History',
  'Reviews',
  'Settings',
  'FitnessAssessment',
];
