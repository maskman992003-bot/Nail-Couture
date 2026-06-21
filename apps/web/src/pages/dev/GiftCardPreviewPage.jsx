import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GiftCardVisual } from '../../components/GiftCardVisual.jsx';

const PREVIEW_PROFILES = {
  active: {
    balance: 500,
    initialAmount: 500,
    ownerName: 'Customer5',
    statusText: 'Active',
    expiryText: 'Expires Jun 21, 2027',
    giftedFromText: 'Gifted from A',
    giftMessage: 'Hello',
    codeDisplay: 'GC--****-44RT',
  },
  lowBalance: {
    balance: 42.5,
    ownerName: 'Jordan Lee',
    statusText: 'Active',
    expiryText: 'Expires Mar 15, 2026',
    codeDisplay: 'GC-AB12-CD34',
  },
  preview: {
    balance: 100,
    ownerName: 'Recipient Name',
    expiryText: 'Valid for 1 year',
    giftMessage: 'Enjoy your spa day!',
    codeDisplay: 'GC-****-****',
  },
};

export default function GiftCardPreviewPage() {
  const [profileKey, setProfileKey] = useState('active');
  const profile = PREVIEW_PROFILES[profileKey] || PREVIEW_PROFILES.active;

  return (
    <div className="min-h-screen bg-primary text-primary p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="rounded-2xl border border-card bg-card p-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gold">Dev only</p>
              <h1 className="font-heading text-2xl text-primary">Gift card preview</h1>
              <p className="text-sm text-secondary mt-1">
                Compact gift card layout in{' '}
                <code className="text-xs">apps/web/src/components/GiftCardVisual.jsx</code>
              </p>
            </div>
            <Link to="/customer/gift-cards" className="text-sm text-gold hover:underline">
              ← Gift cards
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.keys(PREVIEW_PROFILES).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setProfileKey(key)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  profileKey === key
                    ? 'border-gold bg-gold/15 text-gold'
                    : 'border-card text-secondary hover:text-primary'
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          <p className="text-xs text-secondary">
            URL: <code>/dev/gift-card</code>
          </p>
        </div>

        <div className="rounded-2xl border border-card bg-card p-4">
          <GiftCardVisual isDark codeInteractive {...profile} />
        </div>
      </div>
    </div>
  );
}
