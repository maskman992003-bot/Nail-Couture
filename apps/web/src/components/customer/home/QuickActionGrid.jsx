import { Link } from 'react-router-dom';
import { NAIL_HEALTH_ASSESSMENT, FITNESS_ASSESSMENT } from '@nail-couture/shared/constants/featureFlags.js';
import BrandLogo from '../../BrandLogo.jsx';

const ACTIONS = [
  {
    id: 'appointments',
    label: 'My Appointments',
    href: '/customer/history',
    icon: (className) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'rewards',
    label: 'Rewards',
    href: '/customer/loyalty',
    icon: (className) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'refer',
    label: 'Refer a Friend',
    action: 'refer',
    icon: (className) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
  {
    id: 'membership',
    label: 'Membership',
    href: '/customer/loyalty',
    icon: () => <BrandLogo className="h-7 w-7" rounded />,
  },
];

function ActionTile({ action, onReferPress }) {
  const iconClass = 'w-6 h-6 text-gold-strong';
  const tileClass =
    'flex flex-col items-center justify-center gap-2 rounded-2xl border border-card bg-card p-4 min-h-[96px] hover:border-gold/40 transition-colors text-center';

  const content = (
    <>
      <div className="flex items-center justify-center h-8">
        {action.icon(iconClass)}
      </div>
      <span className="text-[10px] uppercase tracking-wide text-secondary leading-tight">{action.label}</span>
    </>
  );

  if (action.action === 'refer') {
    return (
      <button type="button" onClick={onReferPress} className={tileClass}>
        {content}
      </button>
    );
  }

  return (
    <Link to={action.href} className={tileClass}>
      {content}
    </Link>
  );
}

export default function QuickActionGrid({ onReferPress }) {
  const visible = ACTIONS.filter((a) => {
    if (a.id === 'nail-assessment') return NAIL_HEALTH_ASSESSMENT;
    if (a.id === 'fitness-assessment') return FITNESS_ASSESSMENT;
    return true;
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {visible.map((action) => (
        <ActionTile key={action.id} action={action} onReferPress={onReferPress} />
      ))}
    </div>
  );
}
