import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing } from '@nail-couture/shared/theme/layout.js';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { useAuth } from '../contexts/AuthContext';
import { DAYS, MONTHS } from '../constants/birthdayOptions';
import { ScrollSelect } from '../components/forms/ScrollSelect';
import { Icon } from '../components/icons/Icon';
import { layout } from '../theme/layoutStyles';
import { useLayout } from '../theme/useLayout';
import { useThemeStyles } from '../theme/useThemeStyles';
import {
  claimPendingGiftCards,
  getGiftCardClaimPreview,
  maskPhoneForDisplay,
} from '@nail-couture/shared/utils/giftCards.js';
import type { RootStackParamList } from '../navigation/publicTypes';

function generateReferralCode(name: string) {
  const cleanName = name.replace(/\s+/g, '').toUpperCase().slice(0, 4);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${cleanName}${random}`;
}

export function RegisterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Register'>>();
  const { login } = useAuth();
  const styles = useThemeStyles();
  const pageLayout = useLayout();

  const giftToken = route.params?.gift || '';

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    birthday_month: '',
    birthday_day: '',
    referral_code: route.params?.ref || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successProfile, setSuccessProfile] = useState<Record<string, unknown> | null>(null);
  const [giftPreview, setGiftPreview] = useState<Record<string, unknown> | null>(null);
  const [giftClaimCount, setGiftClaimCount] = useState(0);
  const [phoneLocked, setPhoneLocked] = useState(false);

  useEffect(() => {
    if (!giftToken) return;
    let cancelled = false;
    (async () => {
      const preview = await getGiftCardClaimPreview(giftToken);
      if (cancelled) return;
      if (preview?.success && preview.phone_for_registration) {
        setGiftPreview(preview as Record<string, unknown>);
        setFormData((prev) => ({
          ...prev,
          phone: String(preview.phone_for_registration),
          full_name: prev.full_name || String(preview.recipient_name || ''),
        }));
        setPhoneLocked(true);
      } else if (preview?.error === 'account_exists') {
        setError(String(preview.message || 'Please log in to receive your gift.'));
      }
    })();
    return () => { cancelled = true; };
  }, [giftToken]);

  const handleSubmit = async () => {
    if (
      !formData.full_name ||
      !formData.phone ||
      !formData.email ||
      !formData.birthday_month ||
      !formData.birthday_day
    ) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.phone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cleanPhone = formData.phone.replace(/\D/g, '');
      const { data: existing } = await getSupabase()
        .from('profiles')
        .select('id')
        .eq('phone', cleanPhone)
        .single();

      if (existing) {
        setError('An account with this phone number already exists. Please login instead.');
        setLoading(false);
        return;
      }

      const referralCode = formData.referral_code.trim().toUpperCase();
      let initialPoints = 0;
      let referredById: string | null = null;

      if (referralCode) {
        const { data: referrer } = await getSupabase()
          .from('profiles')
          .select('id, loyalty_points')
          .eq('referral_code', referralCode)
          .single();

        if (referrer) {
          referredById = referrer.id;
          initialPoints = 50;
          const { error: rpcError } = await getSupabase().rpc('award_loyalty_points', {
            p_profile_id: referrer.id,
            p_points: 50,
            p_description: 'Referral bonus — friend signed up',
            p_type: 'referral_bonus',
          });
          if (rpcError) {
            await getSupabase()
              .from('profiles')
              .update({ loyalty_points: (referrer.loyalty_points || 0) + 50 })
              .eq('id', referrer.id);
          }
        }
      }

      const birthday =
        formData.birthday_month && formData.birthday_day
          ? `${formData.birthday_month}-${formData.birthday_day}`
          : null;

      const { data, error: insertError } = await getSupabase()
        .from('profiles')
        .insert({
          full_name: formData.full_name,
          phone: cleanPhone,
          email: formData.email,
          birthday,
          role: 'customer',
          referral_code: generateReferralCode(formData.full_name),
          referral_by: referredById,
          loyalty_points: initialPoints,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const claimResult = await claimPendingGiftCards(data.id);
      if (claimResult?.count > 0) {
        setGiftClaimCount(claimResult.count);
      }

      setSuccessProfile(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (successProfile) {
    return (
      <SafeAreaView style={[styles.screen, layout.authScreen]}>
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: `${styles.tokens.goldStrong}33`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <Text style={[styles.textGold, { fontSize: 40 }]}>🎁</Text>
          </View>
          <Text style={[styles.textGold, { fontSize: 32, fontWeight: '600', textAlign: 'center' }]}>
            Welcome to the Club
          </Text>
          <Text style={[styles.textPrimary, { fontSize: 22, marginTop: 12, textAlign: 'center' }]}>
            {formData.full_name}
          </Text>
          {giftClaimCount > 0 ? (
            <Text style={[styles.textSecondary, { marginTop: 12, textAlign: 'center' }]}>
              Your <Text style={styles.textGold}>gift card{giftClaimCount > 1 ? 's are' : ' is'}</Text> in your wallet.
            </Text>
          ) : null}
          {formData.referral_code ? (
            <Text style={[styles.textSecondary, { marginTop: 12, textAlign: 'center' }]}>
              Your <Text style={styles.textGold}>50 loyalty points</Text> are being added
            </Text>
          ) : null}
          <Pressable
            onPress={() => login(successProfile)}
            style={[styles.buttonPrimary, { marginTop: 32, paddingHorizontal: 32 }]}
          >
            <Text style={styles.buttonPrimaryText}>Go to Portal</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          layout.authScreen,
          { paddingBottom: pageLayout.contentBottomPadding },
        ]}
      >
        {navigation.canGoBack() ? (
          <Pressable onPress={() => navigation.goBack()} style={{ marginBottom: spacing[3], alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="chevronLeft" size={18} color={styles.tokens.goldStrong} />
            <Text style={styles.textGold}>Back</Text>
          </Pressable>
        ) : null}

        <View style={[layout.authCardWrap, styles.card, { padding: spacing[8] }]}>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Image
              source={require('../../assets/NC.jpg')}
              style={{ height: 96, width: 160, marginBottom: 12 }}
              resizeMode="contain"
            />
            <Text style={styles.textSecondary}>Create Your Account</Text>
            {giftPreview?.success ? (
              <Text style={[styles.textGold, { marginTop: 8, textAlign: 'center', fontSize: 13 }]}>
                {giftPreview.buyer_first_name
                  ? `${String(giftPreview.buyer_first_name)} sent you a $${Number(giftPreview.amount || 0).toFixed(0)} gift card!`
                  : `Claim your $${Number(giftPreview.amount || 0).toFixed(0)} gift card`}
                {' '}Register with {maskPhoneForDisplay(String(giftPreview.phone_for_registration || ''))}.
              </Text>
            ) : null}
            {formData.referral_code ? (
              <Text style={{ color: '#4ade80', marginTop: 8, textAlign: 'center', fontSize: 13 }}>
                You have a referral code! You'll earn 50 loyalty points after signup.
              </Text>
            ) : null}
          </View>

          <View style={{ gap: spacing[4] }}>
            <FormField label="Full Name">
              <TextInput
                value={formData.full_name}
                onChangeText={(full_name) => {
                  setFormData((current) => ({ ...current, full_name }));
                  setError('');
                }}
                placeholder="Enter your full name"
                placeholderTextColor={styles.tokens.textMuted}
                style={styles.input}
              />
            </FormField>

            <FormField label="Phone Number">
              <TextInput
                value={formData.phone}
                onChangeText={(phone) => {
                  if (phoneLocked) return;
                  setFormData((current) => ({ ...current, phone }));
                  setError('');
                }}
                placeholder="Enter your phone number"
                placeholderTextColor={styles.tokens.textMuted}
                keyboardType="phone-pad"
                editable={!phoneLocked}
                style={[styles.input, phoneLocked && { opacity: 0.75 }]}
              />
              {phoneLocked ? (
                <Text style={[styles.textSecondary, { fontSize: 11, marginTop: 4 }]}>
                  Phone is locked to match your gift card.
                </Text>
              ) : null}
            </FormField>

            <FormField label="Email">
              <TextInput
                value={formData.email}
                onChangeText={(email) => {
                  setFormData((current) => ({ ...current, email }));
                  setError('');
                }}
                placeholder="Enter your email"
                placeholderTextColor={styles.tokens.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
            </FormField>

            <FormField label="Birthday">
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <ScrollSelect
                    value={formData.birthday_month}
                    onChange={(birthday_month) => setFormData((current) => ({ ...current, birthday_month }))}
                    options={MONTHS}
                    placeholder="Month"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ScrollSelect
                    value={formData.birthday_day}
                    onChange={(birthday_day) => setFormData((current) => ({ ...current, birthday_day }))}
                    options={DAYS}
                    placeholder="Day"
                  />
                </View>
              </View>
            </FormField>

            <FormField label="Referral Code (Optional)">
              <TextInput
                value={formData.referral_code}
                onChangeText={(referral_code) =>
                  setFormData((current) => ({ ...current, referral_code: referral_code.toUpperCase() }))
                }
                placeholder="Enter friend's referral code"
                placeholderTextColor={styles.tokens.textMuted}
                autoCapitalize="characters"
                style={styles.input}
              />
            </FormField>

            {error ? <Text style={{ color: '#f87171' }}>{error}</Text> : null}

            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={[styles.buttonPrimary, { opacity: loading ? 0.6 : 1 }]}
            >
              {loading ? (
                <ActivityIndicator color="#121212" />
              ) : (
                <Text style={styles.buttonPrimaryText}>Create Account</Text>
              )}
            </Pressable>
          </View>

          <Pressable onPress={() => navigation.navigate('Login')} style={{ marginTop: spacing[6], alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            <Icon name="chevronLeft" size={16} color={styles.tokens.goldStrong} />
            <Text style={styles.textGold}>Back to Login</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  const styles = useThemeStyles();
  return (
    <View>
      <Text style={[styles.textSecondary, { fontSize: 11, letterSpacing: 1, marginBottom: 8 }]}>
        {label.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}
