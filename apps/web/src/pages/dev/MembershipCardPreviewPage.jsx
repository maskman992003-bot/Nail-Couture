import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TIER_CONFIG } from '@nail-couture/shared/constants/loyaltyProgram.js';
import { MEMBERSHIP_CARD_HERO } from '@nail-couture/shared/constants/membershipCardLayout.js';
import { MembershipCardSection } from '../../components/customer/home/MembershipHeroCard.jsx';
import {
  getMembershipCardPreviewProfile,
  MEMBERSHIP_CARD_PREVIEW_TIERS,
} from '../../constants/membershipCardPreviewProfiles.js';

function normalizeTierParam(value) {
  const tier = String(value || '').trim().toLowerCase();
  return MEMBERSHIP_CARD_PREVIEW_TIERS.includes(tier) ? tier : 'atelier';
}

export default function MembershipCardPreviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [founding, setFounding] = useState(searchParams.get('founding') === '1');

  const tierId = normalizeTierParam(searchParams.get('tier'));
  const profile = useMemo(
    () => getMembershipCardPreviewProfile(tierId, { founding }),
    [tierId, founding],
  );

  const setTier = (nextTier) => {
    const params = new URLSearchParams(searchParams);
    params.set('tier', nextTier);
    if (founding) params.set('founding', '1');
    else params.delete('founding');
    setSearchParams(params, { replace: true });
  };

  const toggleFounding = () => {
    const next = !founding;
    setFounding(next);
    const params = new URLSearchParams(searchParams);
    params.set('tier', tierId);
    if (next) params.set('founding', '1');
    else params.delete('founding');
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="min-h-screen bg-primary text-primary p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="rounded-2xl border border-card bg-card p-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gold">Dev only</p>
              <h1 className="font-heading text-2xl text-primary">Membership card preview</h1>
              <p className="text-sm text-secondary mt-1">
                Tune overlay positions in{' '}
                <code className="text-xs">packages/shared/src/constants/membershipCardLayout.js</code>
              </p>
            </div>
            <Link to="/portal" className="text-sm text-gold hover:underline">
              ← Customer home
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            {MEMBERSHIP_CARD_PREVIEW_TIERS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTier(id)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  tierId === id
                    ? 'border-gold bg-gold/15 text-gold'
                    : 'border-card text-secondary hover:text-primary'
                }`}
              >
                {TIER_CONFIG[id]?.name || id}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={founding}
              onChange={toggleFounding}
              className="rounded border-card"
            />
            Founding member badge (12/25 Vanguard)
          </label>

          <p className="text-xs text-secondary">
            URL:{' '}
            <code>
              /dev/membership-card?tier={tierId}
              {founding ? '&founding=1' : ''}
            </code>
          </p>
        </div>

        <MembershipCardSection profile={profile} />

        <div
          className="rounded-2xl border border-dashed border-card bg-card/50 p-4 text-xs text-secondary space-y-1"
          style={{ borderRadius: MEMBERSHIP_CARD_HERO.borderRadiusPx }}
        >
          <p>
            <span className="text-primary">Name:</span> {profile.full_name}
          </p>
          <p>
            <span className="text-primary">Tier:</span> {TIER_CONFIG[tierId]?.name}
          </p>
          <p>
            <span className="text-primary">Founding:</span>{' '}
            {profile.founding_spot ? `${profile.founding_type} #${profile.founding_spot}` : 'none'}
          </p>
        </div>
      </div>
    </div>
  );
}
