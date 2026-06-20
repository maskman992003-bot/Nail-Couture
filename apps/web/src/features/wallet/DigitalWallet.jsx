import { useState } from 'react';
import { redeemVaultMilestone } from '@nail-couture/shared/utils/loyaltyWallet.js';
import { getTierInfo } from '@nail-couture/shared/utils/loyaltyTier';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useWalletState } from './hooks/useWalletState';
import { useFoundingMemberRealtime } from './hooks/useFoundingMemberRealtime';
import WalletCardDeck from './components/cards/WalletCardDeck';
import TheVault from './components/vault/TheVault';
import VaultUnboxingModal from './components/vault/VaultUnboxingModal';
import FoundingRevealOverlay from './components/animations/FoundingRevealOverlay';
import WaxSealBadge from './components/WaxSealBadge';

export default function DigitalWallet() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { snapshot, loading, isStale, refresh } = useWalletState(user?.id);
  const { revealPayload, dismissReveal } = useFoundingMemberRealtime(user?.id);
  const [unboxingCode, setUnboxingCode] = useState(null);
  const [unboxingLabel, setUnboxingLabel] = useState(undefined);
  const [redeeming, setRedeeming] = useState(false);

  const muted = theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50';

  const tierInfo = getTierInfo({
    loyalty_tier: snapshot?.tier || user?.loyalty_tier,
    calendar_spend_ytd: snapshot?.calendar_spend_ytd ?? user?.calendar_spend_ytd,
    founding_type: snapshot?.founding?.type || user?.founding_type,
    founding_spot: snapshot?.founding?.spot ?? user?.founding_spot,
    loyalty_points: snapshot?.points ?? user?.loyalty_points,
  });

  const tierBenefits =
    'benefits' in tierInfo && Array.isArray(tierInfo.benefits)
      ? tierInfo.benefits
      : [tierInfo.benefit].filter(Boolean);

  const handleMilestonePress = async (milestonePoints) => {
    if (!user?.id || redeeming) return;
    const ms = snapshot?.milestones?.find((m) => m.points === milestonePoints);
    if (!ms?.unlocked) return;

    if (ms.redemption_code) {
      setUnboxingCode(ms.redemption_code);
      setUnboxingLabel(ms.reward_label);
      return;
    }

    setRedeeming(true);
    try {
      const result = await redeemVaultMilestone(user.id, milestonePoints);
      if (result.success && result.redemption_code) {
        setUnboxingCode(result.redemption_code);
        setUnboxingLabel(result.reward_label);
        await refresh();
      }
    } finally {
      setRedeeming(false);
    }
  };

  if (loading && !snapshot) {
    return <div className="text-gold animate-pulse py-12 text-center">Loading wallet…</div>;
  }

  const activeTier = snapshot?.tier || user?.loyalty_tier || 'pearl';
  const isFounding = Boolean(snapshot?.founding?.spot || user?.founding_spot);

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
              'Your tier cards & The Vault'
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
          <p className={`text-[10px] uppercase tracking-widest mb-3 ${muted}`}>
            {tierInfo.name.toUpperCase()} · {snapshot?.earn_rate ?? 1}× earn
          </p>
          <WalletCardDeck activeTier={activeTier} isFounding={isFounding} />
        </div>

        <div className="md:grid md:grid-cols-2 md:gap-8">
          <TheVault
            points={snapshot?.points ?? user?.loyalty_points ?? 0}
            milestones={snapshot?.milestones}
            onMilestonePress={handleMilestonePress}
          />
          <div
            className="hidden md:block rounded-2xl p-6 border mt-0"
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
        onClose={() => setUnboxingCode(null)}
        redemptionCode={unboxingCode || ''}
        rewardLabel={unboxingLabel}
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
