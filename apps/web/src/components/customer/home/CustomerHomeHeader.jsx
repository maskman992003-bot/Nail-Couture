import { Link } from 'react-router-dom';
import BrandLogo from '../../BrandLogo.jsx';

export default function CustomerHomeHeader() {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 pt-2">
      <div className="flex justify-start">
        <button
          type="button"
          className="p-2 rounded-full text-secondary hover:text-gold-strong hover:bg-primary/5 transition-colors"
          aria-label="Notifications"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </button>
      </div>

      <div className="flex flex-col items-center min-w-0">
        <BrandLogo className="h-9 w-9" />
        <span className="text-[9px] uppercase tracking-[0.22em] text-secondary mt-1 font-medium whitespace-nowrap">
          Nail Couture
        </span>
      </div>

      <div className="flex justify-end">
        <Link
          to="/customer/loyalty"
          className="p-2 rounded-full text-secondary hover:text-gold-strong hover:bg-primary/5 transition-colors"
          aria-label="Rewards"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}
