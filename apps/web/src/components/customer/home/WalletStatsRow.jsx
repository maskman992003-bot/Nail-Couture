import { Link } from 'react-router-dom';

function StatCard({ label, value, suffix, icon, footerLink }) {
  return (
    <div className="flex-1 rounded-2xl border border-card bg-card p-4 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-secondary mb-1">{label}</p>
          <p className="font-heading text-2xl text-primary truncate">
            {value}
            {suffix ? <span className="text-base font-body text-secondary ml-1">{suffix}</span> : null}
          </p>
        </div>
        <div className="shrink-0 w-9 h-9 rounded-full border border-card flex items-center justify-center text-gold-strong">
          {icon}
        </div>
      </div>
      {footerLink ? (
        <Link to={footerLink.href} className="inline-block mt-3 text-xs text-gold-strong hover:opacity-80">
          {footerLink.label} →
        </Link>
      ) : null}
    </div>
  );
}

export default function WalletStatsRow({ points, rewardsAvailable }) {
  const formattedRewards = `$${rewardsAvailable}`;

  return (
    <div className="flex gap-3">
      <StatCard
        label="Points Balance"
        value={Number(points || 0).toLocaleString()}
        suffix="Points"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        }
      />
      <StatCard
        label="Rewards Available"
        value={formattedRewards}
        footerLink={{ href: '/customer/loyalty', label: 'View Rewards' }}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
        }
      />
    </div>
  );
}
