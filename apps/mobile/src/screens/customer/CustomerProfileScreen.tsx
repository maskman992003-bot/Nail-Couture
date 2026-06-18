import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import * as Clipboard from 'expo-clipboard';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { isRefreshmentAvailable } from '@nail-couture/shared/services/inventoryService.js';
import { fetchCustomerStats } from '@nail-couture/shared/utils/customerStats.js';
import { generateReferralCode, getTierInfo } from '@nail-couture/shared/utils/loyaltyTier.js';
import { getProfileInitials } from '@nail-couture/shared/utils/avatarUpload.js';
import { useAuth } from '../../contexts/AuthContext';
import { FITNESS_ASSESSMENT } from '@nail-couture/shared/constants/featureFlags.js';
import { DAYS, MONTHS, NAIL_GOALS } from '../../constants/birthdayOptions';
import { CustomerScreenLayout } from '../../components/customer/CustomerScreenLayout';
import { MembershipCard } from '../../components/customer/MembershipCard';
import { ScrollSelect } from '../../components/forms/ScrollSelect';
import { RefreshmentSelect } from '../../components/forms/RefreshmentSelect';
import { AppModal, ModalButton } from '../../components/AppModal';
import { NotificationPreferencesSection } from '../../components/NotificationPreferencesSection';
import { NotificationHistorySection } from '../../components/NotificationHistorySection';
import { useThemeStyles } from '../../theme/useThemeStyles';
import { useAvailableRefreshments } from '../../hooks/useAvailableRefreshments';
import { FitnessProfileSection } from '../../components/fitness/FitnessProfileSection';
import { CustomerReviewsSection } from '../../components/reviews/CustomerReviewsSection';
import type { AppScreenName } from '../../navigation/screenRegistry';

type ProfileRecord = Record<string, unknown> & {
  id: string;
  full_name?: string;
  phone?: string;
  email?: string;
  birthday?: string;
  loyalty_points?: number;
  referral_code?: string;
  refreshment_pref?: string;
  nail_goal?: string;
  pin?: string;
};

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'preferences', label: 'Preferences' },
  ...(FITNESS_ASSESSMENT ? [{ id: 'fitness' as const, label: 'Fitness' }] : []),
  { id: 'reviews', label: 'Reviews' },
  { id: 'security', label: 'Security' },
] as const;

function isValidDate(month: string, day: string) {
  if (!month || !day) return false;
  const date = new Date(2000, parseInt(month, 10) - 1, parseInt(day, 10));
  return date.getMonth() === parseInt(month, 10) - 1 && date.getDate() === parseInt(day, 10);
}

export function CustomerProfileScreen() {
  const { user, login } = useAuth();
  const styles = useThemeStyles();
  const navigation = useNavigation<BottomTabNavigationProp<Record<AppScreenName, undefined>>>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchCustomerStats>> | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('overview');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', refreshment_pref: '', nail_goal: '' });
  const [birthdayMonth, setBirthdayMonth] = useState('');
  const [birthdayDay, setBirthdayDay] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinForm, setPinForm] = useState({ current_pin: '', new_pin: '', confirm_pin: '' });
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const { refreshments, loading: refreshmentsLoading } = useAvailableRefreshments();

  const loadProfile = useCallback(async () => {
    const userId = user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await getSupabase().from('profiles').select('*').eq('id', userId).single();
      if (!data) {
        setLoading(false);
        return;
      }

      let profileData = data as ProfileRecord;
      if (!profileData.referral_code) {
        const newCode = generateReferralCode(profileData.full_name || 'USER');
        await getSupabase().from('profiles').update({ referral_code: newCode }).eq('id', userId);
        profileData = { ...profileData, referral_code: newCode };
      }

      setProfile(profileData);
      const bd = profileData.birthday || '';
      setBirthdayMonth(bd ? bd.split('-')[0] : '');
      setBirthdayDay(bd ? bd.split('-')[1] : '');
      setForm({
        full_name: profileData.full_name || '',
        email: profileData.email || '',
        refreshment_pref: profileData.refreshment_pref || '',
        nail_goal: profileData.nail_goal || '',
      });

      const statsData = await fetchCustomerStats(userId, user?.phone as string | undefined);
      setStats(statsData);
    } catch (err) {
      console.error('Profile load error:', err);
    }
    setLoading(false);
  }, [user?.id, user?.phone]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setError('');

    const refreshmentPref = isRefreshmentAvailable(form.refreshment_pref, refreshments)
      ? form.refreshment_pref || null
      : null;

    let birthday = profile.birthday || null;
    if (birthdayMonth && birthdayDay) {
      if (!isValidDate(birthdayMonth, birthdayDay)) {
        setError('Please select a valid birthday');
        setSaving(false);
        return;
      }
      birthday = `${birthdayMonth}-${birthdayDay}`;
    }

    const { data, error: updateErr } = await getSupabase()
      .from('profiles')
      .update({
        full_name: form.full_name,
        email: form.email.trim() || null,
        refreshment_pref: refreshmentPref,
        nail_goal: form.nail_goal || null,
        birthday,
      })
      .eq('id', profile.id)
      .select()
      .single();

    if (updateErr) {
      setError('Failed to save preferences');
    } else if (data) {
      setProfile(data as ProfileRecord);
      if (user) login({ ...user, ...data });
      setEditing(false);
    }
    setSaving(false);
  };

  const handlePinSave = async () => {
    if (!profile) return;
    setPinError('');

    if (profile.pin && !pinForm.current_pin) {
      setPinError('Please enter your current PIN');
      return;
    }
    if (pinForm.new_pin.length !== 4) {
      setPinError('New PIN must be exactly 4 digits');
      return;
    }
    if (pinForm.new_pin !== pinForm.confirm_pin) {
      setPinError('PIN confirmation does not match');
      return;
    }

    setPinLoading(true);
    try {
      if (profile.pin) {
        const { data: verify } = await getSupabase()
          .from('profiles')
          .select('pin')
          .eq('id', profile.id)
          .single();
        if (verify?.pin !== pinForm.current_pin) {
          setPinError('Incorrect current PIN');
          setPinLoading(false);
          return;
        }
      }

      const { error: pinUpdateErr } = await getSupabase()
        .from('profiles')
        .update({ pin: pinForm.new_pin })
        .eq('id', profile.id);

      if (pinUpdateErr) throw pinUpdateErr;
      setProfile({ ...profile, pin: pinForm.new_pin });
      setShowPinModal(false);
      setPinForm({ current_pin: '', new_pin: '', confirm_pin: '' });
    } catch {
      setPinError('Failed to save PIN');
    }
    setPinLoading(false);
  };

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
    return <CustomerScreenLayout title="My Account" subtitle="Unable to load profile" />;
  }

  const tier = getTierInfo(profile.loyalty_points || 0);

  return (
    <CustomerScreenLayout title="My Account" subtitle="Profile, preferences, and security">
      <View style={[styles.card, { padding: 16, marginBottom: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: `${styles.tokens.goldStrong}26`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={[styles.textGold, { fontSize: 20, fontWeight: '700' }]}>
              {getProfileInitials(profile.full_name)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.textPrimary, { fontSize: 20, fontWeight: '600' }]}>{profile.full_name}</Text>
            <Text style={styles.textSecondary}>{profile.phone}</Text>
            <Text style={[styles.textGold, { fontSize: 12, marginTop: 4 }]}>
              {tier.name} · {profile.loyalty_points ?? 0} pts
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => {
              setActiveTab(tab.id);
              if (tab.id !== 'preferences') setEditing(false);
            }}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: activeTab === tab.id ? styles.tokens.goldStrong : 'transparent',
              borderWidth: activeTab === tab.id ? 0 : 1,
              borderColor: styles.tokens.borderColor,
            }}
          >
            <Text
              style={{
                color: activeTab === tab.id ? '#121212' : styles.tokens.textSecondary,
                fontSize: 12,
                fontWeight: '600',
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'overview' && stats ? (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[
              { label: 'Total visits', value: String(stats.totalVisits) },
              { label: 'Total spent', value: `$${stats.totalSpent.toFixed(2)}` },
              {
                label: 'Last visit',
                value: stats.lastVisit ? new Date(stats.lastVisit).toLocaleDateString() : '—',
              },
              { label: 'Favorite service', value: stats.favoriteService || '—' },
            ].map((item) => (
              <View key={item.label} style={[styles.card, { padding: 12, minWidth: '46%', flex: 1 }]}>
                <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1 }]}>
                  {item.label.toUpperCase()}
                </Text>
                <Text style={[styles.textPrimary, { marginTop: 4, fontWeight: '600' }]} numberOfLines={2}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
          <MembershipCard
            profile={profile}
            onCopyReferral={handleCopyReferral}
            copiedCode={copiedCode}
            showReferral
          />
          <NotificationHistorySection />
        </View>
      ) : null}

      {activeTab === 'fitness' && FITNESS_ASSESSMENT ? (
        <FitnessProfileSection
          profileId={profile.id}
          callerPhone={profile.phone}
          onOpenAssessment={() => navigation.navigate('FitnessAssessment')}
        />
      ) : null}

      {activeTab === 'reviews' ? (
        <CustomerReviewsSection
          callerPhone={profile.phone}
          onOpenHistory={() => navigation.navigate('History')}
        />
      ) : null}

      {activeTab === 'preferences' ? (
        <>
          <View style={[styles.card, { padding: 16, gap: 14 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.textPrimary, { fontWeight: '600' }]}>Salon Preferences</Text>
            {!editing ? (
              <Pressable onPress={() => setEditing(true)}>
                <Text style={styles.textGold}>Edit</Text>
              </Pressable>
            ) : null}
          </View>

          {editing ? (
            <View style={{ gap: 14 }}>
              <Field label="Full Name">
                <TextInput
                  value={form.full_name}
                  onChangeText={(full_name) => setForm((current) => ({ ...current, full_name }))}
                  style={styles.input}
                />
              </Field>
              <Field label="Email">
                <TextInput
                  value={form.email}
                  onChangeText={(email) => setForm((current) => ({ ...current, email }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </Field>
              <RefreshmentSelect
                label="Complementary Drink"
                value={form.refreshment_pref}
                onChange={(refreshment_pref) => setForm((current) => ({ ...current, refreshment_pref }))}
                refreshments={refreshments}
                loading={refreshmentsLoading}
                showUnavailableNote
              />
              <Field label="Nail Goal">
                <ScrollSelect
                  value={form.nail_goal}
                  onChange={(nail_goal) => setForm((current) => ({ ...current, nail_goal }))}
                  options={NAIL_GOALS}
                  placeholder="Nail goal"
                />
              </Field>
              <Field label="Birthday">
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <ScrollSelect value={birthdayMonth} onChange={setBirthdayMonth} options={MONTHS} placeholder="Month" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ScrollSelect value={birthdayDay} onChange={setBirthdayDay} options={DAYS} placeholder="Day" />
                  </View>
                </View>
              </Field>
              {error ? <Text style={{ color: '#f87171' }}>{error}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <ModalButton label="Cancel" onPress={() => setEditing(false)} />
                <Pressable
                  onPress={handleSave}
                  disabled={saving}
                  style={[styles.buttonPrimary, { flex: 1, opacity: saving ? 0.6 : 1 }]}
                >
                  <Text style={styles.buttonPrimaryText}>{saving ? 'Saving...' : 'Save'}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {[
                { label: 'Email', value: profile.email || 'Not set' },
                { label: 'Birthday', value: profile.birthday || 'Not set' },
                { label: 'Refreshment', value: profile.refreshment_pref || 'None' },
                { label: 'Nail goal', value: profile.nail_goal || 'Not specified' },
              ].map((row) => (
                <View key={row.label}>
                  <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1 }]}>{row.label.toUpperCase()}</Text>
                  <Text style={styles.textPrimary}>{row.value}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <NotificationPreferencesSection
          userPhone={user?.phone || profile?.phone}
          role="customer"
        />
        </>
      ) : null}

      {activeTab === 'security' ? (
        <View style={[styles.card, { padding: 16 }]}>
          <Text style={[styles.textPrimary, { fontWeight: '600' }]}>Nail Couture Self-Service PIN</Text>
          <Text style={[styles.textSecondary, { marginTop: 6 }]}>
            Use a 4-digit code for quick check-in at salon kiosks.
          </Text>
          <Text style={[styles.textSecondary, { marginTop: 8 }]}>
            Status: {profile.pin ? 'PIN is set' : 'No PIN configured'}
          </Text>
          <Pressable onPress={() => setShowPinModal(true)} style={[styles.buttonPrimary, { marginTop: 16 }]}>
            <Text style={styles.buttonPrimaryText}>{profile.pin ? 'Update PIN' : 'Setup PIN'}</Text>
          </Pressable>
        </View>
      ) : null}

      <AppModal
        open={showPinModal}
        onClose={() => setShowPinModal(false)}
        title={profile.pin ? 'Change Kiosk PIN' : 'Set Kiosk PIN'}
        subtitle="4-digit numeric passcode"
        footer={
          <>
            <ModalButton label="Cancel" onPress={() => setShowPinModal(false)} />
            <ModalButton label="Save" variant="primary" onPress={handlePinSave} disabled={pinLoading} />
          </>
        }
      >
        {profile.pin ? (
          <Field label="Current PIN">
            <TextInput
              value={pinForm.current_pin}
              onChangeText={(current_pin) =>
                setPinForm((current) => ({ ...current, current_pin: current_pin.replace(/\D/g, '').slice(0, 4) }))
              }
              keyboardType="number-pad"
              secureTextEntry
              style={[styles.input, { textAlign: 'center', letterSpacing: 8 }]}
            />
          </Field>
        ) : null}
        <Field label="New PIN">
          <TextInput
            value={pinForm.new_pin}
            onChangeText={(new_pin) =>
              setPinForm((current) => ({ ...current, new_pin: new_pin.replace(/\D/g, '').slice(0, 4) }))
            }
            keyboardType="number-pad"
            secureTextEntry
            style={[styles.input, { textAlign: 'center', letterSpacing: 8 }]}
          />
        </Field>
        <Field label="Confirm PIN">
          <TextInput
            value={pinForm.confirm_pin}
            onChangeText={(confirm_pin) =>
              setPinForm((current) => ({ ...current, confirm_pin: confirm_pin.replace(/\D/g, '').slice(0, 4) }))
            }
            keyboardType="number-pad"
            secureTextEntry
            style={[styles.input, { textAlign: 'center', letterSpacing: 8 }]}
          />
        </Field>
        {pinError ? <Text style={{ color: '#f87171', textAlign: 'center' }}>{pinError}</Text> : null}
      </AppModal>
    </CustomerScreenLayout>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const styles = useThemeStyles();
  return (
    <View>
      <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, marginBottom: 6 }]}>
        {label.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}
