import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { redeemVaultMilestone } from '@nail-couture/shared/utils/loyaltyWallet.js';
import { getTierInfo } from '@nail-couture/shared/utils/loyaltyTier.js';
import { getActiveVaultCodes, resolveMilestonePress } from '@nail-couture/shared/utils/vaultMilestones.js';
import { useAuth } from '../../../contexts/AuthContext';
import { CustomerScreenLayout } from '../../../components/customer/CustomerScreenLayout';
import { useThemeStyles } from '../../../theme/useThemeStyles';
import { useLayout } from '../../../theme/useLayout';
import { useWalletState } from '../hooks/useWalletState';
import { useFoundingMemberRealtime } from '../hooks/useFoundingMemberRealtime';
import { WalletCardDeck } from '../components/cards/WalletCardDeck';
import { TheVault } from '../components/vault/TheVault';
import { VaultActiveCodes } from '../components/vault/VaultActiveCodes';
import { VaultUnboxingModal } from '../components/vault/VaultUnboxingModal';
import { FoundingRevealOverlay } from '../components/animations/FoundingRevealOverlay';
import { WaxSealBadge } from '../components/WaxSealBadge';

export function DigitalWalletScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const layout = useLayout({ withBottomTabBar: true });
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

  return (
    <CustomerScreenLayout
      title="Digital Wallet"
      subtitle={isStale ? 'Showing cached wallet · syncing…' : 'Your tier cards & The Vault'}
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
            <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 2, marginBottom: 8 }]}>
              {tierInfo.name.toUpperCase()} · {snapshot?.earn_rate ?? 1}× earn
            </Text>
            <WalletCardDeck
              activeTier={snapshot?.tier || user.loyalty_tier || 'pearl'}
              isFounding={Boolean(snapshot?.founding || user.founding_spot)}
            />
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

          {layout.isMdUp ? (
            <View style={[styles.card, { padding: 16, gap: 8 }]}>
              <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 2 }]}>TIER BENEFITS</Text>
              {tierBenefits.map((b: string) => (
                <Text key={b} style={styles.textSecondary}>· {b}</Text>
              ))}
            </View>
          ) : null}
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
