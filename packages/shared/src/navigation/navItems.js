import { featureFlags } from '../constants/featureFlags.js';
import { getMySchedulePath, getStaffPlannerPath } from '../utils/routes.js';

export const navItemsByRole = {
  super_admin: [
    { id: 'home', label: 'Home', href: '/superadmin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'schedule', label: 'Schedule', href: '/superadmin/schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'lobby', label: 'Lobby', href: '/superadmin/lobby', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'bookings', label: 'Bookings', href: '/superadmin/bookings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'staff', label: 'Staff', href: '/superadmin/staff', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'inventory', label: 'Inventory', href: '/superadmin/inventory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'services', label: 'Services', href: '/superadmin/services', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { id: 'reports', label: 'Reports', href: '/superadmin/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'customers', label: 'Customers', href: '/superadmin/customers', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v3' },
    { id: 'salon-activity', label: 'Salon Activity', href: '/superadmin/salon-activity', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  ],
  owner: [
    { id: 'home', label: 'Home', href: '/owner', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 001 1h3m6 0h6' },
    { id: 'schedule', label: 'Schedule', href: '/owner/schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'lobby', label: 'Lobby', href: '/owner/lobby', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'bookings', label: 'Bookings', href: '/owner/bookings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2-2v12a2 2 0 002 2z' },
    { id: 'staff', label: 'Staff', href: '/owner/staff', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'inventory', label: 'Inventory', href: '/owner/inventory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'services', label: 'Services', href: '/owner/services', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 002-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { id: 'customers', label: 'Customers', href: '/owner/customers', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v3' },
    { id: 'salon-activity', label: 'Salon Activity', href: '/owner/salon-activity', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'reports', label: 'Reports', href: '/owner/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ],
  partner: [
    { id: 'home', label: 'Home', href: '/partner', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 001 1h3m6 0h6' },
    { id: 'schedule', label: 'Schedule', href: '/partner/schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'lobby', label: 'Lobby', href: '/partner/lobby', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'bookings', label: 'Bookings', href: '/partner/bookings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 002-2v12a2 2 0 002 2z' },
    { id: 'staff', label: 'Staff', href: '/partner/staff', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'inventory', label: 'Inventory', href: '/partner/inventory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'services', label: 'Services', href: '/partner/services', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 002-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { id: 'reports', label: 'Reports', href: '/partner/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 002-2v6a2 2 0 002-2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'customers', label: 'Customers', href: '/partner/customers', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v3' },
    { id: 'salon-activity', label: 'Salon Activity', href: '/partner/salon-activity', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  ],
  admin: [
    { id: 'home', label: 'Home', href: '/admin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'lobby', label: 'Lobby', href: '/admin/lobby', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'schedule', label: 'Schedule', href: '/admin/schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'bookings', label: 'Bookings', href: '/admin/bookings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'services', label: 'Services', href: '/admin/services', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { id: 'customers', label: 'Customers', href: '/admin/customers', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v3' },
  ],
  cashier: [
    { id: 'home', label: 'Home', href: '/cashier', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'lobby', label: 'Lobby', href: '/cashier/lobby', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'schedule', label: 'Schedule', href: '/cashier/schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'checkout', label: 'Checkout', href: '/cashier/checkout', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { id: 'customers', label: 'Customers', href: '/cashier/customers', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v3' },
    { id: 'reports', label: 'Reports', href: '/cashier/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ],
  technician: [
    { id: 'home', label: 'Home', href: '/technician', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'schedule', label: 'My Schedule', href: '/technician/schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'customers', label: 'Customers', href: '/technician/customers', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v3' },
  ],
  customer: [
    { id: 'home', label: 'Home', href: '/portal', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'profile', label: 'Profile', href: '/customer/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'services', label: 'Services', href: '/customer/services', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { id: 'book', label: 'Book', href: '/customer/book', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'loyalty', label: 'Rewards', href: '/customer/loyalty', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'history', label: 'History', href: '/customer/history', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  ],
};

const navItemFeatureMappings = {
  bookings: ['customer.onlineBooking', 'customer.onlineCalendarBooking'],
  book: ['customer.onlineBooking', 'customer.onlineCalendarBooking'],
  services: ['customer.staticServiceMenu'],
  customers: ['management.customerHistory'],
  checkout: ['staff.cashierCheckout'],
  reports: ['staff.reportingBasic'],
};

export const navItemScreenMap = {
  home: 'Home',
  schedule: 'Schedule',
  lobby: 'Lobby',
  bookings: 'Bookings',
  staff: 'Staff',
  inventory: 'Inventory',
  services: 'Services',
  reports: 'Reports',
  customers: 'Customers',
  'salon-activity': 'SalonActivity',
  checkout: 'Checkout',
  profile: 'Profile',
  book: 'Book',
  loyalty: 'Loyalty',
  history: 'History',
};

export function getNavItemsForRole(role) {
  if (!role) return [];
  const actualUserRole = role || 'customer';
  let items = navItemsByRole[actualUserRole] || navItemsByRole.customer;

  if (actualUserRole !== 'super_admin') {
    items = items.filter((item) => {
      if (item.id === 'schedule') {
        if (['technician', 'cashier'].includes(actualUserRole)) {
          return featureFlags.staff.scheduleView === true;
        }
        return featureFlags.staff.staffShifts === true;
      }

      const mapping = navItemFeatureMappings[item.id];
      if (!mapping) return true;

      const flagsToCheck = Array.isArray(mapping) ? mapping : [mapping];
      return flagsToCheck.some((flag) => {
        const [featureArea, featureName] = flag.split('.');
        return featureFlags[featureArea]?.[featureName] === true;
      });
    });
  }

  return items.map((item) => {
    if (item.id !== 'schedule') return item;
    if (['technician', 'cashier'].includes(actualUserRole)) {
      return { ...item, href: getMySchedulePath(actualUserRole) };
    }
    return { ...item, href: getStaffPlannerPath(actualUserRole) };
  });
}

export function getScreenNameForNavItem(navItemId) {
  return navItemScreenMap[navItemId] || navItemId;
}
