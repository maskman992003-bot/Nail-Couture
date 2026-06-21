import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import * as Clipboard from 'expo-clipboard';
import { getTierInfo, generateReferralCode } from '@nail-couture/shared/utils/loyaltyTier.js';
import { computeVaultRewardsAvailable } from '@nail-couture/shared/utils/vaultRewards.js';
import { getNextTierUpsellBenefit, getTierProgressSummary } from '@nail-couture/shared/utils/tierProgress.js';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { useAuth } from '../../contexts/AuthContext';
import { CustomerScreenLayout } from '../../components/customer/CustomerScreenLayout';
import { AppointmentStatusBadge } from '../../components/customer/AppointmentStatusBadge';
import { MembershipHeroCard } from '../../components/customer/home/MembershipHeroCard';
import { WalletStatsRow, PointsBalanceBar } from '../../components/customer/home/WalletStatsRow';
import { TierProgressBanner } from '../../components/customer/home/TierProgressBanner';
import { QuickActionGrid } from '../../components/customer/home/QuickActionGrid';
import { ReferFriendModal } from '../../components/customer/home/ReferFriendModal';
import { PromoSlideIn } from '../../components/marketing/PromoSlideIn';
import { PromoDetailModal } from '../../components/marketing/PromoDetailModal';
import { useCustomerHomePromotions } from '../../hooks/useCustomerHomePromotions';
import { useWalletState } from '../../features/wallet/hooks/useWalletState';
import { AppModal, ModalButton } from '../../components/AppModal';
import { useThemeStyles } from '../../theme/useThemeStyles';
import type { AppScreenName } from '../../navigation/screenRegistry';

type AppointmentRecord = {
  id: string;
  status: string;
  checked_in_at?: string;
  add_ons?: string;
  final_price?: number;
  services?: { name?: string; price?: number };
  technician?: { name?: string };
  cancellation_reason?: string;
};

type ProfileRecord = {
  id: string;
  full_name?: string;
  loyalty_points?: number;
  referral_code?: string;
  loyalty_tier?: string;
  calendar_spend_ytd?: number;
  founding_spot?: number | null;
  founding_type?: string | null;
};

export function CustomerHomeScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const navigation = useNavigation<BottomTabNavigationProp<Record<AppScreenName, undefined>>>();
  const { snapshot } = useWalletState(user?.id);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [showEarningModal, setShowEarningModal] = useState(false);
  const [showReferModal, setShowReferModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<AppointmentRecord | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const {
    enabled: promosEnabled,
    currentSlideInPromo,
    chipReady,
    detailPromo,
    copyCode,
    advanceSlideInQueue,
    openSlideInDetail,
    closeSlideInDetail,
    toast: promoToast,
  } = useCustomerHomePromotions(user?.phone);

  const fetchUserData = useCallback(async () => {
    const userId = user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data: profileData } = await getSupabase()
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!profileData) {
        setLoading(false);
        return;
      }

      let nextProfile = profileData as ProfileRecord;
      if (!nextProfile.referral_code) {
        const newCode = generateReferralCode(nextProfile.full_name || 'USER');
        await getSupabase().from('profiles').update({ referral_code: newCode }).eq('id', userId);
        nextProfile = { ...nextProfile, referral_code: newCode };
      }
      setProfile(nextProfile);

      const { data: appointmentsData } = await getSupabase().rpc('get_my_appointments', {
        customer_id: userId,
        status_filter: 'waiting,assigned_pending,serving',
      });
      setAppointments((appointmentsData as AppointmentRecord[]) || []);
    } catch {
      // ignore load errors for now
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleCopyReferral = async () => {
    if (!profile?.referral_code) return;
    await Clipboard.setStringAsync(profile.referral_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return (
      <CustomerScreenLayout showUserActions={false}>
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <ActivityIndicator color={styles.tokens.goldStrong} />
        </View>
      </CustomerScreenLayout>
    );
  }

  if (!profile) {
    return (
      <CustomerScreenLayout title="Portal" subtitle="Unable to load profile">
        <Text style={styles.textSecondary}>Please try logging in again.</Text>
      </CustomerScreenLayout>
    );
  }

  const tier = getTierInfo(profile);
  const tierProgress = getTierProgressSummary(tier, profile, snapshot);
  const firstName = profile.full_name?.split(' ')[0] || 'back';
  const points = snapshot?.points ?? profile.loyalty_points ?? 0;
  const rewardsAvailable = computeVaultRewardsAvailable(points, snapshot?.milestones);

  return (
    <View style={{ flex: 1 }}>
      <CustomerScreenLayout
        title={`Welcome back, ${firstName}`}
        subtitle=""
      >
        <View style={{ gap: 16 }}>
          <MembershipHeroCard profile={profile} />

          <WalletStatsRow
            profile={profile}
            onCardPress={() => setShowEarningModal(true)}
            rewardsAvailable={rewardsAvailable}
            onViewRewards={() => navigation.navigate('Loyalty')}
          />

          <PointsBalanceBar points={points} />

          <TierProgressBanner profile={profile} snapshot={snapshot} />

          <QuickActionGrid
            onAppointmentsPress={() => navigation.navigate('History' as AppScreenName)}
            onRewardsPress={() => navigation.navigate('Loyalty')}
            onReferPress={() => setShowReferModal(true)}
            onMembershipPress={() => navigation.navigate('Loyalty')}
          />

          {appointments.length > 0 ? (
            <View style={[styles.card, { padding: 16, gap: 12 }]}>
              <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 2 }]}>
                YOUR ACTIVE APPOINTMENT{appointments.length > 1 ? 'S' : ''}
              </Text>
              {appointments.map((booking) => (
                <Pressable
                  key={booking.id}
                  onPress={() => {
                    setSelectedBooking(booking);
                    setShowDetailModal(true);
                  }}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    gap: 12,
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: styles.tokens.borderLight,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.textPrimary, { fontSize: 18, fontWeight: '600' }]}>
                      {booking.add_ons || booking.services?.name || 'Service'}
                    </Text>
                    {booking.checked_in_at ? (
                      <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 4 }]}>
                        {new Date(booking.checked_in_at).toLocaleString()}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <AppointmentStatusBadge status={booking.status} />
                    {booking.final_price || booking.services?.price ? (
                      <Text style={styles.textGold}>
                        ${(booking.final_price || booking.services?.price || 0).toFixed(2)}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <ReferFriendModal
          open={showReferModal}
          onClose={() => setShowReferModal(false)}
          referralCode={profile.referral_code}
          copiedCode={copiedCode}
          onCopy={handleCopyReferral}
        />

        <AppModal
          open={showEarningModal}
          onClose={() => setShowEarningModal(false)}
          title="Earn More Points"
          scrollBody
          footer={<ModalButton label="Got It" variant="primary" onPress={() => setShowEarningModal(false)} />}
        >
          <View style={{ gap: 16 }}>
            <View style={[styles.card, { padding: 14, backgroundColor: `${styles.tokens.goldStrong}14` }]}>
              <Text style={[styles.textPrimary, { fontWeight: '600' }]}>Spend & Earn</Text>
              <Text style={[styles.textSecondary, { marginTop: 6 }]}>
                Earn 1 point for every $1 spent on any service.
              </Text>
            </View>
            <View style={[styles.card, { padding: 14, backgroundColor: `${styles.tokens.goldStrong}14` }]}>
              <Text style={[styles.textPrimary, { fontWeight: '600' }]}>Refer a Friend</Text>
              <Text style={[styles.textSecondary, { marginTop: 6 }]}>
                Share your referral code — you both earn bonus points when they sign up.
              </Text>
            </View>
            {tier.nextTier ? (
              <View style={[styles.card, { padding: 14 }]}>
                <Text style={[styles.textSecondary, { fontSize: 11, letterSpacing: 1 }]}>
                  {tierProgress.headline.toUpperCase()}
                </Text>
                <Text style={[styles.textPrimary, { marginTop: 6 }]}>
                  {getNextTierUpsellBenefit(tier)}
                </Text>
                <Text style={[styles.textSecondary, { marginTop: 8, fontSize: 12 }]}>
                  {tierProgress.progressDetail}. Redeeming points does not change your tier.
                </Text>
              </View>
            ) : (
              <View style={[styles.card, { padding: 14 }]}>
                <Text style={[styles.textSecondary, { fontSize: 12 }]}>{tierProgress.progressDetail}</Text>
              </View>
            )}
          </View>
        </AppModal>

        <AppModal
          open={showDetailModal && Boolean(selectedBooking)}
          onClose={() => setShowDetailModal(false)}
          title="Appointment Details"
          scrollBody
          footer={<ModalButton label="Close" variant="primary" onPress={() => setShowDetailModal(false)} />}
        >
          {selectedBooking ? (
            <View style={{ gap: 14 }}>
              <View>
                <Text style={styles.textSecondary}>Services</Text>
                <Text style={styles.textPrimary}>
                  {selectedBooking.add_ons || selectedBooking.services?.name || 'N/A'}
                </Text>
              </View>
              {(selectedBooking.final_price || selectedBooking.services?.price) ? (
                <View>
                  <Text style={styles.textSecondary}>Total Price</Text>
                  <Text style={[styles.textGold, { fontSize: 20, fontWeight: '600' }]}>
                    ${(selectedBooking.final_price || selectedBooking.services?.price || 0).toFixed(2)}
                  </Text>
                </View>
              ) : null}
              {selectedBooking.checked_in_at ? (
                <View>
                  <Text style={styles.textSecondary}>Date & Time</Text>
                  <Text style={styles.textPrimary}>
                    {new Date(selectedBooking.checked_in_at).toLocaleString()}
                  </Text>
                </View>
              ) : null}
              <View>
                <Text style={styles.textSecondary}>Status</Text>
                <View style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                  <AppointmentStatusBadge status={selectedBooking.status} />
                </View>
              </View>
              {selectedBooking.technician?.name ? (
                <View>
                  <Text style={styles.textSecondary}>Technician</Text>
                  <Text style={styles.textPrimary}>{selectedBooking.technician.name}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </AppModal>
      </CustomerScreenLayout>

      {promosEnabled ? (
        <>
          <PromoSlideIn
            promo={currentSlideInPromo}
            visible={chipReady}
            detailOpen={Boolean(detailPromo)}
            onOpenDetail={openSlideInDetail}
            onAutoHide={advanceSlideInQueue}
          />
          <PromoDetailModal
            promo={detailPromo}
            visible={Boolean(detailPromo)}
            onClose={closeSlideInDetail}
            onCopy={copyCode}
          />
        </>
      ) : null}
      {promoToast ? (
        <View
          style={{
            position: 'absolute',
            bottom: 120,
            alignSelf: 'center',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: `${styles.tokens.goldStrong}40`,
            backgroundColor: styles.tokens.cardBg,
            paddingHorizontal: 16,
            paddingVertical: 10,
          }}
        >
          <Text style={styles.textGold}>{promoToast}</Text>
        </View>
      ) : null}
    </View>
  );
}
