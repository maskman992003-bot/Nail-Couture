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
    appointmentReminders: false,    // SMS/email reminders (Phase 3)
    prepayOptions: false,           // Pay online in advance (Phase 3)
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
    
    // Phase 2 (Future)
    staffShifts: false,             // Manage work schedules (Phase 2)
    timeOffRequests: false,         // Request time off (Phase 2)
    inventoryAutomation: false,     // Auto-low stock alerts (Phase 2/3)
    advancedReporting: false,       // Custom reports, analytics (Phase 3)
    employeeManagement: false,      // Add/remove staff, roles (Phase 3)
  },
  
  // Inventory & Operations
  operations: {
    // Phase 1 (Currently Active)
    stockTracking: true,            // Manual inventory updates
    usageLogging: true,             // Track product usage per service
    wasteTracking: true,            // Track product waste
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
    roleBasedAccess: true,          // Different views by role
    realtimeUpdates: true,          // Live data sync between clients
    
    // Phase 2
    mobileApp: false,               // Native mobile app (Phase 2+)
    apiAccess: false,               // Third-party integrations (Phase 3)
  },
  
  // Management Features
  management: {
    // Phase 1 (Currently Active)
    customerHistory: true,          // View customer profiles and visit histories
  }
};

// Convenience flags for direct access
export const CUSTOMER_ONLINE_BOOKING = featureFlags.customer.onlineBooking;
export const STAFF_SHIFTS = featureFlags.staff.staffShifts;
export const TIME_OFF_REQUESTS = featureFlags.staff.timeOffRequests;
export const INVENTORY_AUTOMATION = featureFlags.operations.autoReorder;
export const LIVE_FLOOR_TRACKER = featureFlags.customer.liveFloorTracker;
export const ADVANCED_REPORTING = featureFlags.staff.advancedReporting;
export const MANAGEMENT_CUSTOMER_HISTORY = featureFlags.management.customerHistory;