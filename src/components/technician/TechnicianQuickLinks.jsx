import { Link } from 'react-router-dom';
import { getCustomersPath, getMySchedulePath, getSettingsPath } from '../../utils/routes';
import { TIME_OFF_REQUESTS } from '../../constants/featureFlags';

const LINKS = [
  { key: 'schedule', label: 'My Schedule', desc: 'Week view & shifts', href: (role) => getMySchedulePath(role), icon: '📅' },
  { key: 'customers', label: 'Customers', desc: 'Client history & notes', href: (role) => getCustomersPath(role), icon: '👥' },
  { key: 'timeoff', label: 'Time Off', desc: 'Request time off', href: (role) => `${getMySchedulePath(role)}?tab=timeoff`, icon: '🏖️', flag: TIME_OFF_REQUESTS },
  { key: 'settings', label: 'Settings', desc: 'Profile & preferences', href: (role) => getSettingsPath(role), icon: '⚙️' },
];

export default function TechnicianQuickLinks({ role }) {
  const items = LINKS.filter((l) => !l.flag || l.flag);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((link) => (
        <Link
          key={link.key}
          to={link.href(role)}
          className="block p-4 sm:p-5 bg-card border border-card rounded-xl hover:border-theme transition-colors text-center"
        >
          <div className="text-2xl mb-2">{link.icon}</div>
          <h3 className="font-heading text-base text-gold-strong">{link.label}</h3>
          <p className="text-secondary text-xs mt-1">{link.desc}</p>
        </Link>
      ))}
    </div>
  );
}
