import { useState } from 'react';
import { redeemVaultMilestone } from '@nail-couture/shared/utils/loyaltyWallet.js';
import { getTierInfo, getTierBenefitsList } from '@nail-couture/shared/utils/loyaltyTier';
import { getActiveVaultCodes, resolveMilestonePress } from '@nail-couture/shared/utils/vaultMilestones.js';
import {
  formatFmFloorUntil,
  formatPointsExpiryDate,
  getTierProgressSummary,
} from '@nail-couture/shared/utils/tierProgress.js';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useWalletState } from './hooks/useWalletState';
import { useFoundingMemberRealtime } from './hooks/useFoundingMemberRealtime';
import { MembershipCardSection } from '../../components/customer/home/MembershipHeroCard';
import TierProgressBanner from '../../components/customer/home/TierProgressBanner';
import TheVault from './components/vault/TheVault';
import VaultActiveCodes from './components/vault/VaultActiveCodes';
import VaultUnboxingModal from './components/vault/VaultUnboxingModal';
import FoundingRevealOverlay from './components/animations/FoundingRevealOverlay';
import WaxSealBadge from './components/WaxSealBadge';
import LoyaltyTermsSummary from './components/LoyaltyTermsSummary';

export default function DigitalWallet() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { snapshot, loading, isStale, refresh } = useWalletState(user?.id);
  const { revealPayload, dismissReveal } = useFoundingMemberRealtime(user?.id);
  const [unboxingCode, setUnboxingCode] = useState(null);
  const [unboxingLabel, setUnboxingLabel] = useState(undefined);
  const [unboxingReview, setUnboxingReview] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  const walletPoints = snapshot?.points ?? user?.loyalty_points ?? 0;
  const activeCodes = getActiveVaultCodes(snapshot?.milestones, walletPoints);

  const openUnboxing = (code, label, reviewMode = false) => {
    setUnboxingCode(code);
    setUnboxingLabel(label);
    setUnboxingReview(reviewMode);
  };

  const closeUnboxing = () => {
    setUnboxingCode(null);
    setUnboxingReview(false);
  };

  const muted = theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50';

  const walletProfile = {
    loyalty_tier: snapshot?.tier || user?.loyalty_tier,
    loyalty_tier_earned: snapshot?.tier_earned,
    rolling_spend_12m: snapshot?.rolling_spend_12m ?? snapshot?.calendar_spend_ytd ?? user?.rolling_spend_12m ?? user?.calendar_spend_ytd,
    calendar_spend_ytd: snapshot?.rolling_spend_12m ?? snapshot?.calendar_spend_ytd ?? user?.calendar_spend_ytd,
    founding_type: snapshot?.founding?.type || user?.founding_type,
    founding_spot: snapshot?.founding?.spot ?? user?.founding_spot,
    founding_awarded_at: user?.founding_awarded_at,
    fm_floor_active: snapshot?.fm_floor_active,
    fm_floor_until: snapshot?.fm_floor_until,
    loyalty_points: snapshot?.points ?? user?.loyalty_points,
  };

  const tierInfo = getTierInfo(walletProfile);
  const progress = getTierProgressSummary(tierInfo, walletProfile, snapshot);

  const tierBenefits = getTierBenefitsList(tierInfo);

  const handleMilestonePress = async (milestonePoints) => {
    if (!user?.id || redeeming) return;
    const ms = snapshot?.milestones?.find((m) => m.points === milestonePoints);
    const decision = resolveMilestonePress(milestonePoints, walletPoints, ms);

    if (decision.action === 'show') {
      openUnboxing(decision.code, decision.label, true);
      return;
    }
    if (decision.action !== 'claim') return;

    setRedeeming(true);
    try {
      const result = await redeemVaultMilestone(user.id, milestonePoints);
      if (result.success && result.redemption_code) {
        openUnboxing(result.redemption_code, result.reward_label, false);
        await refresh();
      }
    } finally {
      setRedeeming(false);
    }
  };

  if (loading && !snapshot) {
    return <div className="text-gold animate-pulse py-12 text-center">Loading wallet…</div>;
  }

  const isFounding = Boolean(snapshot?.founding?.spot || user?.founding_spot);
  const showMembershipCard = tierInfo.id !== 'regular_customer';
  const pointsExpiringSoon = snapshot?.points_expiring_soon ?? 0;
  const nextPointsExpiry = formatPointsExpiryDate(snapshot?.next_points_expiry);

  const cardProfile = {
    full_name: user?.full_name,
    ...walletProfile,
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="font-heading text-4xl text-gold">Digital Wallet</h1>
          <p className={`${muted} text-sm mt-1 flex items-center gap-2`}>
            {isStale ? (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                Showing cached wallet · syncing…
              </>
            ) : (
              showMembershipCard
                ? 'Your membership card & The Vault'
                : 'Your tier progress & The Vault'
            )}
          </p>
        </div>
        <WaxSealBadge
          foundingType={snapshot?.founding?.type || user?.founding_type}
          foundingSpot={snapshot?.founding?.spot ?? user?.founding_spot}
          pending={!isFounding}
          size={36}
        />
      </div>

      <div className="space-y-8 mt-8">
        <div>
          {pointsExpiringSoon > 0 && nextPointsExpiry ? (
            <p className="text-xs mb-3 text-amber-600/90 dark:text-amber-400/90">
              {pointsExpiringSoon} vault points expiring by {nextPointsExpiry}
            </p>
          ) : null}

          {showMembershipCard ? (
            <div className="w-3/4 mx-auto">
              <MembershipCardSection profile={cardProfile} asStatic />
              {tierInfo.fmFloorActive && tierInfo.fmFloorUntil ? (
                <p className={`text-xs text-center mt-3 ${muted}`}>
                  Valid until {formatFmFloorUntil(tierInfo.fmFloorUntil)}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <TierProgressBanner profile={walletProfile} snapshot={snapshot} />
              <p className={`text-xs text-center ${muted}`}>
                {progress.progressDetail} — unlock your Pearl membership card at {progress.nextThreshold != null ? `$${progress.nextThreshold}` : '$500'} rolling spend.
              </p>
            </div>
          )}
        </div>

        <div className="lg:grid lg:grid-cols-2 lg:gap-8 space-y-8 lg:space-y-0">
          <div className="space-y-8 min-w-0">
            <TheVault
              points={walletPoints}
              milestones={snapshot?.milestones}
              onMilestonePress={handleMilestonePress}
            />
            <VaultActiveCodes
              codes={activeCodes}
              onCodePress={(code, label) => openUnboxing(code, label, true)}
            />
            <LoyaltyTermsSummary variant="wallet" />
          </div>
          <div
            className="rounded-2xl p-6 border mt-0 min-w-0"
            style={{ borderColor: 'rgba(197,160,89,0.25)', backgroundColor: theme === 'dark' ? '#111' : '#fff' }}
          >
            <p className={`text-[10px] uppercase tracking-widest mb-4 ${muted}`}>Tier Benefits</p>
            <ul className={`space-y-2 text-sm ${muted}`}>
              {tierBenefits.map((b) => (
                <li key={b}>· {b}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <VaultUnboxingModal
        open={Boolean(unboxingCode)}
        onClose={closeUnboxing}
        redemptionCode={unboxingCode || ''}
        rewardLabel={unboxingLabel}
        reviewMode={unboxingReview}
      />

      {revealPayload ? (
        <FoundingRevealOverlay
          open
          foundingType={revealPayload.founding_type}
          foundingSpot={revealPayload.founding_spot}
          onDismiss={dismissReveal}
        />
      ) : null}
    </>
  );
}
