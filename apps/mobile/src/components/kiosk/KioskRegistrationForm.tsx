import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import {
  getAvailableRefreshments,
  isRefreshmentAvailable,
} from '@nail-couture/shared/services/inventoryService.js';
import {
  completeCustomerRegistration,
  generateCustomerReferralCode,
  isRegistrationComplete,
  needsRegistrationCompletion,
  updateKioskAppointmentServices,
} from '@nail-couture/shared/auth/registration.js';
import { DAYS, MONTHS, NAIL_GOALS } from '../../constants/birthdayOptions';
import { RefreshmentSelect } from '../forms/RefreshmentSelect';
import { ScrollSelect } from '../forms/ScrollSelect';
import {
  KioskServiceSelection,
  type ServiceRecord,
  type ServiceSelectionPayload,
} from './KioskServiceSelection';
import { Icon } from '../icons/Icon';
import { useThemeStyles } from '../../theme/useThemeStyles';

type KioskRegistrationFormProps = {
  phone: string;
  existingProfile?: Record<string, unknown> | null;
  existingAppointmentId?: string;
  onClose: () => void;
  onCompleteWaiverTrigger: (profileData: {
    id: string;
    full_name: string;
    phone: string;
    refreshmentPref?: string | null;
    appointmentId?: string;
  }) => void;
};

export function KioskRegistrationForm({
  phone,
  existingProfile = null,
  existingAppointmentId,
  onClose,
  onCompleteWaiverTrigger,
}: KioskRegistrationFormProps) {
  const styles = useThemeStyles();
  const [fullName, setFullName] = useState(String(existingProfile?.full_name || ''));
  const [email, setEmail] = useState(String(existingProfile?.email || ''));
  const [nailGoal, setNailGoal] = useState(String(existingProfile?.nail_goal || ''));
  const [birthdayMonth, setBirthdayMonth] = useState(String((existingProfile?.birthday as string || '').split('-')[0] || ''));
  const [birthdayDay, setBirthdayDay] = useState(String((existingProfile?.birthday as string || '').split('-')[1] || ''));
  const [refreshmentList, setRefreshmentList] = useState<{ item_name: string }[]>([]);
  const [refreshmentsLoading, setRefreshmentsLoading] = useState(true);
  const [refreshmentPref, setRefreshmentPref] = useState('');
  const [selectedServices, setSelectedServices] = useState<ServiceRecord[]>([]);
  const [showServiceSelection, setShowServiceSelection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAvailableRefreshments()
      .then(setRefreshmentList)
      .catch((err) => console.error('Error fetching refreshments:', err))
      .finally(() => setRefreshmentsLoading(false));
  }, []);

  const handleServiceSelect = (payload: ServiceSelectionPayload) => {
    setSelectedServices(payload.services);
    setRefreshmentPref(payload.refreshmentPref);
    setShowServiceSelection(false);
  };

  const handleSubmit = async () => {
    if (!fullName || !email || !nailGoal || !birthdayMonth || !birthdayDay || selectedServices.length === 0) {
      setError('Please complete all required fields and select at least one service.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const safeRefreshmentPref = isRefreshmentAvailable(refreshmentPref, refreshmentList)
        ? refreshmentPref || null
        : null;

      const { data: profileRows, error: profileSearchError } = await getSupabase()
        .from('profiles')
        .select('*')
        .or(`phone.eq.${cleanPhone},phone.eq.${phone}`)
        .order('created_at', { ascending: true })
        .limit(1);

      if (profileSearchError) throw profileSearchError;

      let profileId: string;
      let finalProfile: { id: string; full_name: string; phone: string };
      const foundProfile = profileRows?.[0];

      if (foundProfile) {
        if (!isRegistrationComplete(foundProfile)) {
          const birthday = birthdayMonth && birthdayDay ? `${birthdayMonth}-${birthdayDay}` : null;
          const updatedProfile = await completeCustomerRegistration(getSupabase(), cleanPhone, {
            fullName,
            email,
            nailGoal,
            refreshmentPref: safeRefreshmentPref,
            birthday,
            referralCode: (foundProfile.referral_code as string) || generateCustomerReferralCode(fullName),
          });

          profileId = updatedProfile.id;
          finalProfile = updatedProfile;
        } else {
          profileId = foundProfile.id as string;
          finalProfile = foundProfile as { id: string; full_name: string; phone: string };
        }
      } else {
        const birthday = birthdayMonth && birthdayDay ? `${birthdayMonth}-${birthdayDay}` : null;
        const { data: profile, error: insertError } = await getSupabase()
          .from('profiles')
          .insert({
            full_name: fullName,
            email,
            phone: cleanPhone,
            nail_goal: nailGoal,
            refreshment_pref: safeRefreshmentPref,
            birthday,
            registration_complete: true,
            referral_code: generateCustomerReferralCode(fullName),
          })
          .select()
          .single();

        if (insertError) throw insertError;
        profileId = profile.id;
        finalProfile = profile;
      }

      const { add_ons: addOnsValue, selected_service_names: selectedServiceNames } =
        buildAppointmentServicePayload(selectedServices, []);
      const totalPrice = selectedServices.reduce((sum, service) => sum + (service.price || 0), 0);

      let appointment;
      if (existingAppointmentId) {
        appointment = await updateKioskAppointmentServices(
          getSupabase(),
          cleanPhone,
          existingAppointmentId,
          {
            serviceId: selectedServices[0]?.id || null,
            addOns: addOnsValue,
            selectedServiceNames,
            finalPrice: totalPrice,
            refreshmentPref: safeRefreshmentPref,
          },
        );
      } else {
        const { data: createdAppointment, error: appointmentError } = await getSupabase().from('appointments').insert({
          customer_id: profileId,
          service_id: selectedServices[0]?.id || null,
          add_ons: addOnsValue,
          selected_service_names: selectedServiceNames,
          final_price: totalPrice,
          status: 'checking_in',
          refreshment_pref: safeRefreshmentPref,
          booking_type: 'walk_in',
        }).select().single();

        if (appointmentError) throw appointmentError;
        appointment = createdAppointment;
      }

      onCompleteWaiverTrigger({
        id: profileId,
        full_name: finalProfile.full_name,
        phone: finalProfile.phone,
        refreshmentPref: safeRefreshmentPref,
        appointmentId: appointment.id,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (showServiceSelection) {
    return (
      <KioskServiceSelection
        onSelect={handleServiceSelect}
        onBack={() => setShowServiceSelection(false)}
        initialServices={selectedServices}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <Pressable onPress={onClose} style={{ alignSelf: 'flex-end', marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="close" size={20} color={styles.tokens.goldStrong} />
          <Text style={styles.textGold}>Close</Text>
        </Pressable>

        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: `${styles.tokens.goldStrong}33`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={[styles.textGold, { fontSize: 28 }]}>★</Text>
          </View>
          <Text style={[styles.textGold, { fontSize: 28, fontWeight: '600' }]}>
            {existingProfile && !isRegistrationComplete(existingProfile) ? 'Complete Your Profile' : 'Join the Couture Club'}
          </Text>
          <Text style={styles.textSecondary}>
            {existingProfile && !isRegistrationComplete(existingProfile)
              ? 'Finish setting up your account to continue check-in'
              : 'Create your profile to get started'}
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          <Field label="Full Name">
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your name"
              placeholderTextColor={styles.tokens.textMuted}
              style={styles.input}
            />
          </Field>

          <Field label="Email">
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor={styles.tokens.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
          </Field>

          <Field label="Nail Goal">
            <ScrollSelect value={nailGoal} onChange={setNailGoal} options={NAIL_GOALS} placeholder="Nail goal" />
          </Field>

          <Field label="Birthday">
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <ScrollSelect
                  value={birthdayMonth}
                  onChange={setBirthdayMonth}
                  options={MONTHS}
                  placeholder="Month"
                />
              </View>
              <View style={{ flex: 1 }}>
                <ScrollSelect value={birthdayDay} onChange={setBirthdayDay} options={DAYS} placeholder="Day" />
              </View>
            </View>
          </Field>

          <RefreshmentSelect
            label="Refreshment Preference"
            value={refreshmentPref}
            onChange={setRefreshmentPref}
            refreshments={refreshmentList}
            loading={refreshmentsLoading}
            emptyLabel="Select a refreshment (optional)"
          />

          <View style={[styles.card, { padding: 16 }]}>
            <Text style={[styles.textSecondary, { marginBottom: 8 }]}>Selected Services</Text>
            {selectedServices.length > 0 ? (
              <View style={{ gap: 8 }}>
                {selectedServices.map((service) => (
                  <View key={service.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.textPrimary}>{service.name}</Text>
                    <Text style={styles.textGold}>${service.price}</Text>
                  </View>
                ))}
                <Text style={[styles.textGold, { fontSize: 18, fontWeight: '600' }]}>
                  Total: ${selectedServices.reduce((sum, service) => sum + (service.price || 0), 0).toFixed(2)}
                </Text>
                <Pressable onPress={() => setShowServiceSelection(true)}>
                  <Text style={styles.textGold}>Change</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setShowServiceSelection(true)}
                style={{
                  borderWidth: 1,
                  borderColor: styles.tokens.borderColor,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={styles.textGold}>Select Services</Text>
              </Pressable>
            )}
          </View>

          {error ? <Text style={{ color: '#f87171' }}>{error}</Text> : null}

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={onClose}
              disabled={loading}
              style={{
                flex: 1,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: styles.tokens.borderColor,
                paddingVertical: 14,
                alignItems: 'center',
                opacity: loading ? 0.5 : 1,
              }}
            >
              <Text style={styles.textSecondary}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={[styles.buttonPrimary, { flex: 1, opacity: loading ? 0.6 : 1 }]}
            >
              {loading ? (
                <ActivityIndicator color="#121212" />
              ) : (
                <Text style={styles.buttonPrimaryText}>Join Club</Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const styles = useThemeStyles();
  return (
    <View>
      <Text style={[styles.textSecondary, { fontSize: 12, letterSpacing: 1, marginBottom: 8 }]}>
        {label.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}
