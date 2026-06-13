import type { ComponentType } from 'react';
import { CustomerHomeScreen } from '../screens/customer/CustomerHomeScreen';
import { CustomerProfileScreen } from '../screens/customer/CustomerProfileScreen';
import { CustomerServicesScreen } from '../screens/customer/CustomerServicesScreen';
import { CustomerBookingScreen } from '../screens/customer/CustomerBookingScreen';
import { CustomerLoyaltyScreen } from '../screens/customer/CustomerLoyaltyScreen';
import { CustomerHistoryScreen } from '../screens/customer/CustomerHistoryScreen';
import { CustomerFitnessAssessmentScreen } from '../screens/customer/CustomerFitnessAssessmentScreen';
import { CustomerSettingsScreen } from '../screens/customer/CustomerSettingsScreen';
import { TechnicianHomeScreen } from '../screens/staff/TechnicianHomeScreen';
import { TechnicianTipsScreen } from '../screens/staff/TechnicianTipsScreen';
import { CashierHomeScreen } from '../screens/staff/CashierHomeScreen';
import { CashierCheckoutScreen } from '../screens/staff/CashierCheckoutScreen';
import { CashierTransactionsScreen } from '../screens/staff/CashierTransactionsScreen';
import { EmployeeScheduleView as ScheduleScreen } from '../screens/staff/EmployeeScheduleScreen';
import { StaffSettingsScreen } from '../screens/staff/StaffSettingsScreen';
import { AdminHomeScreen } from '../screens/admin/AdminHomeScreen';
import { AdminLobbyScreen } from '../screens/admin/AdminLobbyScreen';
import { AdminBookingsScreen } from '../screens/admin/AdminBookingsScreen';
import { AdminServicesScreen } from '../screens/admin/AdminServicesScreen';
import { AdminInventoryScreen } from '../screens/admin/AdminInventoryScreen';
import { AdminReportsScreen } from '../screens/admin/AdminReportsScreen';
import { SalonActivityScreen } from '../screens/admin/SalonActivityScreen';
import { AnnouncementsScreen } from '../screens/admin/AnnouncementsScreen';
import { SalonUpdatesScreen } from '../screens/shared/SalonUpdatesScreen';
import { StaffReviewsScreen } from '../screens/shared/StaffReviewsScreen';
import { CustomersStackNavigator } from './CustomersStackNavigator';
import { StaffStackNavigator } from './StaffStackNavigator';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import type { AppScreenName } from './screenRegistry';

type ScreenComponent = ComponentType<Record<string, unknown>>;

export const CUSTOMER_SCREEN_COMPONENTS: Partial<Record<AppScreenName, ScreenComponent>> = {
  Home: CustomerHomeScreen,
  Profile: CustomerProfileScreen,
  Services: CustomerServicesScreen,
  Book: CustomerBookingScreen,
  Loyalty: CustomerLoyaltyScreen,
  History: CustomerHistoryScreen,
  FitnessAssessment: CustomerFitnessAssessmentScreen,
  SalonUpdates: SalonUpdatesScreen,
  Settings: CustomerSettingsScreen,
};

const TECHNICIAN_SCREEN_COMPONENTS: Partial<Record<AppScreenName, ScreenComponent>> = {
  Home: TechnicianHomeScreen,
  Schedule: ScheduleScreen,
  Tips: TechnicianTipsScreen,
  Customers: CustomersStackNavigator,
  Reviews: StaffReviewsScreen,
  FitnessAssessment: CustomerFitnessAssessmentScreen,
  SalonUpdates: SalonUpdatesScreen,
  Settings: StaffSettingsScreen,
};

const CASHIER_SCREEN_COMPONENTS: Partial<Record<AppScreenName, ScreenComponent>> = {
  Home: CashierHomeScreen,
  Schedule: ScheduleScreen,
  Lobby: AdminLobbyScreen,
  Checkout: CashierCheckoutScreen,
  Transactions: CashierTransactionsScreen,
  Customers: CustomersStackNavigator,
  Reviews: StaffReviewsScreen,
  Reports: AdminReportsScreen,
  FitnessAssessment: CustomerFitnessAssessmentScreen,
  SalonUpdates: SalonUpdatesScreen,
  Settings: StaffSettingsScreen,
};

const ADMIN_SCREEN_COMPONENTS: Partial<Record<AppScreenName, ScreenComponent>> = {
  Home: AdminHomeScreen,
  Schedule: ScheduleScreen,
  Lobby: AdminLobbyScreen,
  Bookings: AdminBookingsScreen,
  Services: AdminServicesScreen,
  Inventory: AdminInventoryScreen,
  Reports: AdminReportsScreen,
  Customers: CustomersStackNavigator,
  Staff: StaffStackNavigator,
  Reviews: StaffReviewsScreen,
  SalonActivity: SalonActivityScreen,
  Announcements: AnnouncementsScreen,
  FitnessAssessment: CustomerFitnessAssessmentScreen,
  SalonUpdates: SalonUpdatesScreen,
  Settings: StaffSettingsScreen,
};

const STAFF_SHARED_COMPONENTS: Partial<Record<AppScreenName, ScreenComponent>> = {
  Schedule: ScheduleScreen,
  Customers: CustomersStackNavigator,
  Reviews: StaffReviewsScreen,
  FitnessAssessment: CustomerFitnessAssessmentScreen,
  SalonUpdates: SalonUpdatesScreen,
  Settings: StaffSettingsScreen,
};

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'owner', 'partner']);
const STAFF_ROLES = new Set(['technician', 'cashier', 'admin', 'super_admin', 'owner', 'partner']);

export function getScreenComponent(
  screenName: AppScreenName,
  role?: string,
): ScreenComponent {
  if (role === 'customer' && CUSTOMER_SCREEN_COMPONENTS[screenName]) {
    return CUSTOMER_SCREEN_COMPONENTS[screenName]!;
  }
  if (role === 'technician' && TECHNICIAN_SCREEN_COMPONENTS[screenName]) {
    return TECHNICIAN_SCREEN_COMPONENTS[screenName]!;
  }
  if (role === 'cashier' && CASHIER_SCREEN_COMPONENTS[screenName]) {
    return CASHIER_SCREEN_COMPONENTS[screenName]!;
  }
  if (role && ADMIN_ROLES.has(role) && ADMIN_SCREEN_COMPONENTS[screenName]) {
    return ADMIN_SCREEN_COMPONENTS[screenName]!;
  }
  if (role && STAFF_ROLES.has(role) && STAFF_SHARED_COMPONENTS[screenName]) {
    return STAFF_SHARED_COMPONENTS[screenName]!;
  }
  return PlaceholderScreen as ScreenComponent;
}
