// Feature Flags for Phased Rollout
// Organized by feature area and phase

export const featureFlags = {
  // Customer-Facing Features
  customer: {
    // Phase 1 (Currently Active)
    accountEditing: true,           // Edit profile, change password
    loyaltyTiers: true,             // Points, rewards, tier benefits
    referrals: true,                // Referral program
    promotions: true,               // View and apply promotions
    staticServiceMenu: true,        // View services and pricing
    adminCheckIn: true,             // See when checked in by admin
    liveFloorTracker: false,        // Real-time chair/station status (Phase 2)
    onlineCalendarBooking: false,   // Online booking (Phase 2)
    
    // Phase 2 (Future)
    onlineBooking: false,           // Main online booking toggle
    appointmentReminders: false,    // SMS/email reminders (Phase 3 — infra ready, off until enabled)
    birthdayWishes: true,           // Daily automated birthday wishes + tier bonus points
    prepayOptions: false,           // Pay online in advance (Phase 3)
    giftCards: true,                // View and transfer gift cards
    mysteryGift: true,              // Grand opening Mystery Gift teaser
    fitnessAssessment: false,       // Fitness assessment wellness tool (hidden until launch)
    nailHealthAssessment: true,     // Nail health assessment wellness tool
  },
  
  // Admin/Staff Features  
  staff: {
    // Phase 1 (Currently Active)
    cashierCheckout: true,          // Process payments
    scheduleView: true,             // View own schedule
    clientHistory: true,            // See client visit history
    serviceMenu: true,              // View/edit service details
    inventoryBasic: true,           // View stock levels
    reportingBasic: true,           // Basic sales reports
    
    // Phase 2 (Active)
    staffShifts: true,              // Manage work schedules (Phase 2)
    timeOffRequests: true,          // Request time off (Phase 2)
    technicianLiveFloor: true,      // Read-only technician grid on dashboard (Phase 6)
    multiTechVisits: true,         // Multi-technician visits + tip splitting (opt-in)
    inventoryAutomation: false,     // Auto-low stock alerts (Phase 2/3)
    advancedReporting: false,       // Custom reports, analytics (Phase 3)
    employeeManagement: false,      // Add/remove staff, roles (Phase 3)
    announcements: true,           // Management salon announcements tab
    promotions: true,                // Management home-screen promotions tab
    giftCards: true,                 // Sell gift cards at front desk
    mysteryGiftAdmin: true,          // Owner/super_admin Mystery Gift campaign
    phoneBooking: true,              // Couture Canvas phone booking tab
  },
  
  // Inventory & Operations
  operations: {
    // Phase 1 (Currently Active)
    stockTracking: true,            // Manual inventory updates
    supplierInfo: true,             // View supplier details
    
    // Phase 2 (Future)
    autoReorder: false,             // Automatic reorder alerts (Phase 2)
    barcodeScanning: false,         // Scan products for checkout (Phase 2)
    vendorManagement: false,        // Manage supplier relationships (Phase 3)
  },
  
// Global Application Features
  global: {
    // Always On
    authentication: true,           // Login/logout/user management
    notifications: true,            // In-app notifications
    pushNotifications: true,        // Mobile push via Expo (Phase 2)
    externalMessaging: false,       // SMS/email — infra ready, off until Twilio/Resend configured
    notificationPreferences: true,  // Per-user mute toggles in Settings (Phase 5)
    roleBasedAccess: true,          // Different views by role
    realtimeUpdates: true,          // Live data sync between clients
    
    // Phase 5 — RN cutover
    mobileApp: true,                // Native mobile app (primary target)
    apiAccess: false,               // Third-party integrations (Phase 3)
  },
  
  // Management Features
  management: {
    // Phase 1 (Currently Active)
    customerHistory: true,          // View customer profiles and visit histories
  }
};

// Convenience flags for direct access
export const CUSTOMER_ONLINE_BOOKING = featureFlags.customer.onlineBooking || featureFlags.customer.onlineCalendarBooking;
export const STAFF_SHIFTS = featureFlags.staff.staffShifts;
export const TIME_OFF_REQUESTS = featureFlags.staff.timeOffRequests;
export const INVENTORY_AUTOMATION = featureFlags.operations.autoReorder;
export const LIVE_FLOOR_TRACKER = featureFlags.customer.liveFloorTracker;
export const TECHNICIAN_LIVE_FLOOR = featureFlags.staff.technicianLiveFloor;
export const MULTI_TECH_VISITS = featureFlags.staff.multiTechVisits;
export const ADVANCED_REPORTING = featureFlags.staff.advancedReporting;
export const MANAGEMENT_CUSTOMER_HISTORY = featureFlags.management.customerHistory;
export const CASHIER_CHECKOUT = featureFlags.staff.cashierCheckout;
export const PUSH_NOTIFICATIONS = featureFlags.global.pushNotifications;
export const EXTERNAL_MESSAGING = featureFlags.global.externalMessaging;
export const NOTIFICATION_PREFERENCES = featureFlags.global.notificationPreferences;
export const APPOINTMENT_REMINDERS = featureFlags.customer.appointmentReminders;
export const BIRTHDAY_WISHES = featureFlags.customer.birthdayWishes;
export const STAFF_ANNOUNCEMENTS = featureFlags.staff.announcements;
export const STAFF_GIFT_CARDS = featureFlags.staff.giftCards;
export const CUSTOMER_GIFT_CARDS = featureFlags.customer.giftCards;
export const FITNESS_ASSESSMENT = featureFlags.customer.fitnessAssessment;
export const NAIL_HEALTH_ASSESSMENT = featureFlags.customer.nailHealthAssessment;