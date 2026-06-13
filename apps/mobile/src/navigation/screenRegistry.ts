import { getScreenNameForNavItem } from '@nail-couture/shared/navigation/navItems.js';

export type AppScreenName =
  | 'Home'
  | 'Schedule'
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
  | 'History'
  | 'Settings'
  | 'FitnessAssessment';

export function resolveScreenName(navItemId: string): AppScreenName {
  return getScreenNameForNavItem(navItemId) as AppScreenName;
}

export const ALL_SCREEN_NAMES: AppScreenName[] = [
  'Home',
  'Schedule',
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
  'History',
  'Settings',
  'FitnessAssessment',
];
