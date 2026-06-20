import { Link } from 'react-router-dom';

export default function CustomerHomeHeader({ profile }) {
  const firstName = profile?.full_name?.split(' ')[0] || 'back';

  return (
    <div className="flex items-start justify-between gap-4 pt-2">
      <div className="flex-1 min-w-0">
        <p className="text-secondary text-sm">Welcome back,</p>
        <h1 className="font-heading text-3xl md:text-4xl text-primary truncate">{firstName}</h1>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          to="/customer/loyalty"
          className="p-2 rounded-full text-gold-strong hover:bg-primary/5 transition-colors"
          aria-label="Rewards"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
        </Link>
      </div>
    </div>
  );
}
