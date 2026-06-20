import AppointmentServicesPanel from './AppointmentServicesPanel';

export default function CheckoutServiceSummary({ appointment, theme }) {
  if (!appointment) return null;

  return (
    <div className="space-y-3 pt-2 border-t border-light">
      <AppointmentServicesPanel appointment={appointment} tone="checkout" theme={theme} showHistory />
    </div>
  );
}
