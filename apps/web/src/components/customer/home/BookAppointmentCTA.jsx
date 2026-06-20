import { Link } from 'react-router-dom';
import { CUSTOMER_ONLINE_BOOKING } from '@nail-couture/shared/constants/featureFlags.js';

export default function BookAppointmentCTA() {
  const className =
    'block w-full py-4 px-6 rounded-2xl font-heading text-sm tracking-[0.15em] uppercase text-center transition-opacity hover:opacity-90';

  if (CUSTOMER_ONLINE_BOOKING) {
    return (
      <Link
        to="/customer/book"
        className={className}
        style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' }}
      >
        Book Appointment
      </Link>
    );
  }

  return (
    <a
      href="/about#contact"
      className={className}
      style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' }}
    >
      Contact Support
    </a>
  );
}
