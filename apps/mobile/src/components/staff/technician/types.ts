export type AppointmentCustomer = {
  full_name?: string;
  phone?: string;
  preferences?: unknown;
  refreshment_pref?: string;
  nail_goal?: string;
};

export type TechnicianAppointment = {
  id: string;
  status: string;
  customer_id?: string;
  customer?: AppointmentCustomer;
  services?: { name?: string; price?: number; duration_minutes?: number };
  add_ons?: string;
  final_price?: number;
  checked_in_at?: string;
  start_time?: string;
  end_time?: string;
  completed_at?: string;
  service_id?: string;
  technician_id?: string;
  metadata?: unknown;
  technician?: { full_name?: string };
};

export type QueueStats = {
  completedToday: number;
  pendingCount: number;
  avgServiceMinutes: number | null;
  completedAppointments: TechnicianAppointment[];
  todayWorkAppointments: TechnicianAppointment[];
  nextClient: TechnicianAppointment | null;
  nextClientService: string | null;
  currentAppointment: TechnicianAppointment | null;
  pendingAssignments: TechnicianAppointment[];
};

export type WeekStats = {
  byDay: number[];
  byDayCompleted: number[];
  max: number;
  completed: number;
  scheduled: number;
  weekRevenue: number;
  completionRate: number | null;
};

export type FloorTechnician = {
  id: string;
  full_name?: string;
  preferences?: unknown;
};

export type ToastState = {
  message: string;
  type?: 'success' | 'error';
};

export type NewAssignmentBannerItem = {
  id: string;
  name: string;
};

export type ServiceUpdatePayload = {
  service_id?: string | null;
  add_ons?: string | null;
  final_price?: number | null;
  selected_service_names?: string[] | null;
};
