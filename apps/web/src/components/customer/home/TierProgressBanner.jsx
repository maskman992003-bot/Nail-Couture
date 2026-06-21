import { getTierInfo } from '@nail-couture/shared/utils/loyaltyTier.js';
import { getTierProgressSummary } from '@nail-couture/shared/utils/tierProgress.js';

export default function TierProgressBanner({ profile, snapshot }) {
  const tier = getTierInfo(profile);
  const progress = getTierProgressSummary(tier, profile, snapshot);

  return (
    <div className="rounded-2xl border border-card bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-[10px] uppercase tracking-widest text-secondary">
          {tier.name} · Tier progress
        </p>
        <p className="text-xs text-secondary shrink-0">{progress.progressLabel}</p>
      </div>
      {tier.nextTier ? (
        <>
          <div className="w-full rounded-full h-1.5 bg-primary/10 overflow-hidden">
            <div
              className="h-1.5 rounded-full bg-gold-strong transition-all"
              style={{ width: `${Math.min(100, tier.progress ?? 0)}%` }}
            />
          </div>
          <p className="text-xs text-secondary mt-2">{progress.progressDetail}</p>
        </>
      ) : (
        <p className="text-xs text-secondary">{progress.progressDetail}</p>
      )}
    </div>
  );
}
