import AppointmentServicesPanel from './AppointmentServicesPanel';
import clsx from 'clsx';

export default function CheckoutServiceSummary({ appointment, theme }) {
  const isDark = theme === 'dark';
  const sectionBorder = isDark ? 'border-offwhite/10' : 'border-charcoal/10';

  if (!appointment) return null;

  return (
    <div className={clsx('space-y-3 pt-2 border-t', sectionBorder)}>
      <AppointmentServicesPanel appointment={appointment} tone="checkout" theme={theme} showHistory />
    </div>
  );
}
