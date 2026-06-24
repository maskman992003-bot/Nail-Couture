import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { redeemVaultMilestone } from '@nail-couture/shared/utils/loyaltyWallet.js';
import { getTierInfo, getTierBenefitsList } from '@nail-couture/shared/utils/loyaltyTier.js';
import { getActiveVaultCodes, resolveMilestonePress } from '@nail-couture/shared/utils/vaultMilestones.js';
import {
  formatFmFloorUntil,
  formatPointsExpiryDate,
  getTierProgressSummary,
} from '@nail-couture/shared/utils/tierProgress.js';
import { useAuth } from '../../../contexts/AuthContext';
import { CustomerScreenLayout } from '../../../components/customer/CustomerScreenLayout';
import { TierProgressBanner } from '../../../components/customer/home/TierProgressBanner';
import { useThemeStyles } from '../../../theme/useThemeStyles';
import { useWalletState } from '../hooks/useWalletState';
import { useFoundingMemberRealtime } from '../hooks/useFoundingMemberRealtime';
import { WalletCardDeck } from '../components/cards/WalletCardDeck';
import { TheVault } from '../components/vault/TheVault';
import { VaultActiveCodes } from '../components/vault/VaultActiveCodes';
import { VaultUnboxingModal } from '../components/vault/VaultUnboxingModal';
import { FoundingRevealOverlay } from '../components/animations/FoundingRevealOverlay';
import { WaxSealBadge } from '../components/WaxSealBadge';
import LoyaltyTermsSummary from '../components/LoyaltyTermsSummary';

export function DigitalWalletScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const { snapshot, loading, isStale, refresh } = useWalletState(user?.id);
  const { revealPayload, dismissReveal } = useFoundingMemberRealtime(user?.id);
  const [unboxingCode, setUnboxingCode] = useState<string | null>(null);
  const [unboxingLabel, setUnboxingLabel] = useState<string | undefined>();
  const [unboxingReview, setUnboxingReview] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  const walletPoints = snapshot?.points ?? user?.loyalty_points ?? 0;
  const activeCodes = getActiveVaultCodes(snapshot?.milestones, walletPoints);

  const openUnboxing = (code: string, label?: string, reviewMode = false) => {
    setUnboxingCode(code);
    setUnboxingLabel(label);
    setUnboxingReview(reviewMode);
  };

  const closeUnboxing = () => {
    setUnboxingCode(null);
    setUnboxingReview(false);
  };

  const walletProfile = {
    loyalty_tier: snapshot?.tier || user?.loyalty_tier,
    loyalty_tier_earned: snapshot?.tier_earned,
    rolling_spend_12m:
      snapshot?.rolling_spend_12m
      ?? snapshot?.calendar_spend_ytd
      ?? user?.rolling_spend_12m
      ?? user?.calendar_spend_ytd,
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

  const handleMilestonePress = async (milestonePoints: number) => {
    if (!user?.id || redeeming) return;
    const ms = snapshot?.milestones?.find((m) => m.points === milestonePoints);
    const decision = resolveMilestonePress(milestonePoints, walletPoints, ms);

    if (decision.action === 'show') {
      openUnboxing(decision.code!, decision.label, true);
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

  if (!user) {
    return (
      <CustomerScreenLayout title="Digital Wallet" subtitle="Sign in to view your wallet">
        <Text style={styles.textSecondary}>Please sign in to access your loyalty wallet.</Text>
      </CustomerScreenLayout>
    );
  }

  const showLoader = loading && !snapshot;
  const showMembershipCard = tierInfo.id !== 'regular_customer';
  const pointsExpiringSoon = snapshot?.points_expiring_soon ?? 0;
  const nextPointsExpiry = formatPointsExpiryDate(snapshot?.next_points_expiry ?? undefined);

  return (
    <CustomerScreenLayout
      title="Digital Wallet"
      subtitle={
        isStale
          ? 'Showing cached wallet · syncing…'
          : showMembershipCard
            ? 'Your tier cards & The Vault'
            : 'Your tier progress & The Vault'
      }
      headerRight={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isStale ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b' }} /> : null}
          <WaxSealBadge
            foundingType={snapshot?.founding?.type || user.founding_type}
            foundingSpot={snapshot?.founding?.spot ?? user.founding_spot}
            pending={!snapshot?.founding?.spot && !user.founding_spot}
            size={32}
          />
        </View>
      }
      showUserActions={false}
    >
      {showLoader ? (
        <ActivityIndicator color={styles.tokens.goldStrong} style={{ marginTop: 40 }} />
      ) : (
        <View style={{ gap: 20 }}>
          <View>
            {pointsExpiringSoon > 0 && nextPointsExpiry ? (
              <Text style={{ fontSize: 12, marginBottom: 8, color: '#d97706' }}>
                {pointsExpiringSoon} vault points expiring by {nextPointsExpiry}
              </Text>
            ) : null}

            {showMembershipCard ? (
              <View>
                <WalletCardDeck
                  activeTier={snapshot?.tier || user.loyalty_tier || 'regular_customer'}
                  isFounding={Boolean(snapshot?.founding || user.founding_spot)}
                />
                {tierInfo.fmFloorActive && tierInfo.fmFloorUntil ? (
                  <Text style={[styles.textSecondary, { fontSize: 12, textAlign: 'center', marginTop: 12 }]}>
                    Valid until {formatFmFloorUntil(tierInfo.fmFloorUntil ?? undefined)}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <TierProgressBanner profile={walletProfile} snapshot={snapshot} />
                <Text style={[styles.textSecondary, { fontSize: 12, textAlign: 'center' }]}>
                  {progress.progressDetail} — unlock your Pearl membership card at $
                  {progress.nextThreshold ?? 500} rolling spend.
                </Text>
              </View>
            )}
          </View>

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

          <View style={[styles.card, { padding: 16, gap: 8 }]}>
            <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 2 }]}>TIER BENEFITS</Text>
            {tierBenefits.map((b: string) => (
              <Text key={b} style={styles.textSecondary}>· {b}</Text>
            ))}
          </View>
        </View>
      )}

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
    </CustomerScreenLayout>
  );
}
