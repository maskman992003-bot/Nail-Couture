export type CanvasAppointment = {
  id: string;
  startAt: Date;
  durationMinutes: number;
  clientName: string;
  serviceName: string;
  technicianId: string;
  technicianName: string;
  accentColor: string;
  customerId?: string;
  serviceId?: string;
  phone?: string;
  notes?: string;
  status?: string;
};

export type CanvasStaffMember = {
  id: string;
  fullName: string;
  accentColor: string;
  initial: string;
};

export type BookingDraft = {
  appointmentId: string;
  date: Date;
  timeMinutes: number;
  durationMinutes: number;
  clientName: string;
  phone: string;
  customerId: string;
  serviceId: string;
  technicianId: string;
  notes: string;
};

export type BookingConfirmPayload = {
  appointmentId: string;
  date: Date;
  scheduledAt: Date;
  durationMinutes: number;
  clientName: string;
  phone: string;
  customerId: string;
  serviceId: string;
  technicianId: string;
  notes: string;
};

export type CanvasService = {
  id: string;
  name: string;
  durationMinutes?: number;
  price?: number;
};
