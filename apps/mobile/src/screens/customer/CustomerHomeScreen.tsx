import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import * as Clipboard from 'expo-clipboard';
import { CUSTOMER_ONLINE_BOOKING } from '@nail-couture/shared/constants/featureFlags.js';
import { getTierInfo, generateReferralCode, tierDetails } from '@nail-couture/shared/utils/loyaltyTier.js';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { useAuth } from '../../contexts/AuthContext';
import { CustomerScreenLayout } from '../../components/customer/CustomerScreenLayout';
import { MembershipCard } from '../../components/customer/MembershipCard';
import { AppointmentStatusBadge } from '../../components/customer/AppointmentStatusBadge';
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
};

export function CustomerHomeScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const navigation = useNavigation<BottomTabNavigationProp<Record<AppScreenName, undefined>>>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [showEarningModal, setShowEarningModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<AppointmentRecord | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

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
      <CustomerScreenLayout>
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

  const tier = getTierInfo(profile.loyalty_points || 0);
  const firstName = profile.full_name?.split(' ')[0] || 'back';

  return (
    <CustomerScreenLayout
      title={`Welcome, ${firstName}`}
      subtitle="We're glad to have you here"
    >
      <MembershipCard
        profile={profile}
        onPress={() => setShowEarningModal(true)}
        onCopyReferral={handleCopyReferral}
        copiedCode={copiedCode}
      />

      {appointments.length > 0 ? (
        <View style={[styles.card, { padding: 16, marginTop: 16, gap: 12 }]}>
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
      ) : (
        <View style={[styles.card, { padding: 24, marginTop: 16, alignItems: 'center' }]}>
          <Text style={{ fontSize: 40, marginBottom: 8 }}>💅</Text>
          <Text style={[styles.textPrimary, { fontSize: 22, fontWeight: '600', textAlign: 'center' }]}>
            Book Your Experience
          </Text>
          <Text style={[styles.textSecondary, { textAlign: 'center', marginTop: 8, marginBottom: 16 }]}>
            Treat yourself to our premium nail services. We can't wait to see you.
          </Text>
          {CUSTOMER_ONLINE_BOOKING ? (
            <Pressable onPress={() => navigation.navigate('Book')} style={styles.buttonPrimary}>
              <Text style={styles.buttonPrimaryText}>Book Now</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => Linking.openURL('https://wa.me/15044817879')}
              style={styles.buttonPrimary}
            >
              <Text style={styles.buttonPrimaryText}>Contact Support</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
        <Pressable
          onPress={() => navigation.navigate('Profile')}
          style={[styles.card, { flex: 1, padding: 16 }]}
        >
          <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1 }]}>ACCOUNT</Text>
          <Text style={[styles.textGold, { fontSize: 16, fontWeight: '600', marginTop: 6 }]}>
            My Profile →
          </Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate('Loyalty')}
          style={[styles.card, { flex: 1, padding: 16 }]}
        >
          <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1 }]}>REWARDS</Text>
          <Text style={[styles.textGold, { fontSize: 16, fontWeight: '600', marginTop: 6 }]}>
            Redeem Points →
          </Text>
        </Pressable>
      </View>

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
                YOUR PATH TO {tier.nextTier.toUpperCase()}
              </Text>
              <Text style={[styles.textPrimary, { marginTop: 6 }]}>
                {tierDetails[tier.name as keyof typeof tierDetails]?.reward}
              </Text>
            </View>
          ) : null}
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
  );
}
