import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LOYALTY_REWARDS, fetchLoyaltyHistory, formatTransactionType } from '@nail-couture/shared/utils/loyaltyTransactions.js';
import { getTierInfo } from '@nail-couture/shared/utils/loyaltyTier.js';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { useAuth } from '../../contexts/AuthContext';
import { CustomerScreenLayout } from '../../components/customer/CustomerScreenLayout';
import { MembershipCard } from '../../components/customer/MembershipCard';
import { useThemeStyles } from '../../theme/useThemeStyles';

type ProfileRecord = {
  full_name?: string;
  loyalty_points?: number;
  referral_code?: string;
};

export function CustomerLoyaltyScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [loyaltyHistory, setLoyaltyHistory] = useState<{ rows: Array<Record<string, unknown>>; available: boolean }>({
    rows: [],
    available: false,
  });

  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    Promise.all([
      getSupabase().from('profiles').select('*').eq('id', userId).single(),
      fetchLoyaltyHistory(userId),
    ])
      .then(([{ data }, history]) => {
        if (data) setProfile(data);
        setLoyaltyHistory(history);
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleCopyReferral = async () => {
    if (!profile?.referral_code) return;
    await Clipboard.setStringAsync(profile.referral_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return (
      <CustomerScreenLayout>
        <ActivityIndicator color={styles.tokens.goldStrong} style={{ marginTop: 40 }} />
      </CustomerScreenLayout>
    );
  }

  if (!profile) {
    return <CustomerScreenLayout title="Loyalty Rewards" subtitle="Unable to load profile" />;
  }

  const points = profile.loyalty_points || 0;

  return (
    <CustomerScreenLayout title="Loyalty Rewards" subtitle="Your perks and how to unlock more">
      <MembershipCard profile={profile} onCopyReferral={handleCopyReferral} copiedCode={copiedCode} />

      <View style={[styles.card, { padding: 16, marginTop: 16, gap: 12 }]}>
        <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 2 }]}>HOW TO EARN</Text>
        <Text style={styles.textSecondary}>
          Earn 1 point per $1 spent. Share your referral code for bonus points when friends join.
        </Text>
        {profile.referral_code ? (
          <Pressable
            onPress={() =>
              Linking.openURL(
                `https://wa.me/?text=Use%20code%20${profile.referral_code}%20at%20Nail%20Couture!`,
              )
            }
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: 'rgba(37,211,102,0.4)',
            }}
          >
            <Text style={{ color: '#25D366' }}>Share via WhatsApp</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.card, { padding: 16, marginTop: 16 }]}>
        <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 2, marginBottom: 12 }]}>
          AVAILABLE REWARDS
        </Text>
        <Text style={[styles.textSecondary, { marginBottom: 12 }]}>
          Redeem one reward per visit at the check-in kiosk.
        </Text>
        <View style={{ gap: 10 }}>
          {LOYALTY_REWARDS.map((reward) => {
            const canAfford = points >= reward.points;
            return (
              <View
                key={reward.id}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: canAfford ? styles.tokens.goldStrong : styles.tokens.borderLight,
                  opacity: canAfford ? 1 : 0.6,
                }}
              >
                <Text style={[styles.textPrimary, { fontWeight: '600' }]}>{reward.name}</Text>
                <Text style={styles.textSecondary}>{reward.description}</Text>
                <Text style={[styles.textGold, { marginTop: 6 }]}>{reward.points} points</Text>
              </View>
            );
          })}
        </View>
      </View>

      {loyaltyHistory.available && loyaltyHistory.rows.length > 0 ? (
        <View style={[styles.card, { padding: 16, marginTop: 16 }]}>
          <Text style={[styles.textPrimary, { fontWeight: '600', marginBottom: 12 }]}>Points History</Text>
          {loyaltyHistory.rows.map((tx) => (
            <View
              key={String(tx.id)}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: styles.tokens.borderLight,
              }}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.textPrimary}>
                  {String(tx.description || formatTransactionType(String(tx.transaction_type)))}
                </Text>
                <Text style={[styles.textSecondary, { fontSize: 11 }]}>
                  {tx.created_at ? new Date(String(tx.created_at)).toLocaleDateString() : ''}
                </Text>
              </View>
              <Text style={{ color: Number(tx.points) >= 0 ? '#22c55e' : '#f87171', fontWeight: '600' }}>
                {Number(tx.points) >= 0 ? '+' : ''}
                {String(tx.points)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </CustomerScreenLayout>
  );
}
