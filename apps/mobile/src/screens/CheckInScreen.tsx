import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { processCheckIn } from '@nail-couture/shared/services/kioskService.js';
import { getServices } from '@nail-couture/shared/services/services.js';
import {
  getAvailableRefreshments,
  isRefreshmentAvailable,
} from '@nail-couture/shared/services/inventoryService.js';
import { buildAppointmentServicePayload } from '@nail-couture/shared/utils/appointmentServices.js';
import {
  LOYALTY_REWARDS,
  reserveLoyaltyRewardForVisit,
} from '@nail-couture/shared/utils/loyaltyTransactions.js';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { KioskRegistrationForm } from '../components/kiosk/KioskRegistrationForm';
import {
  KioskServiceSelection,
  type ServiceRecord,
  type ServiceSelectionPayload,
} from '../components/kiosk/KioskServiceSelection';
import { WaiverModal } from '../components/kiosk/WaiverModal';
import { Icon } from '../components/icons/Icon';
import { useThemeStyles } from '../theme/useThemeStyles';
import type { RootStackParamList } from '../navigation/publicTypes';

const PHONE_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['del', '0', 'clear'],
] as const;

type CheckInResult = {
  isNew: boolean;
  name?: string;
  profile?: Record<string, unknown>;
  appointment?: Record<string, unknown> & {
    id?: string;
    customer_id?: string;
    refreshment_pref?: string;
    loyalty_reward_id?: string;
    loyalty_reward_name?: string;
    loyalty_points_cost?: number;
    loyalty_redemption_code?: string;
  };
};

function formatDisplay(num: string) {
  if (num.length === 0) return 'Enter phone number';
  if (num.length <= 3) return `(${num}) `;
  if (num.length <= 6) return `(${num.slice(0, 3)}) ${num.slice(3)}`;
  return `(${num.slice(0, 3)}) ${num.slice(3, 6)}-${num.slice(6)}`;
}

export function CheckInScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const styles = useThemeStyles();

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showServiceSelection, setShowServiceSelection] = useState(false);
  const [selectedServices, setSelectedServices] = useState<ServiceRecord[]>([]);
  const [selectedAddOns, setSelectedAddOns] = useState<ServiceRecord[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [showWaiver, setShowWaiver] = useState(false);
  const [waiverCustomerName, setWaiverCustomerName] = useState('');
  const [waiverCustomerPhone, setWaiverCustomerPhone] = useState('');
  const [newUserSuccess, setNewUserSuccess] = useState(false);
  const [newUserDetails, setNewUserDetails] = useState({ fullName: '', refreshmentPref: '' });
  const [customerPoints, setCustomerPoints] = useState(0);
  const [reservedReward, setReservedReward] = useState<{
    id: string;
    name: string;
    points: number;
    code?: string;
  } | null>(null);
  const [rewardError, setRewardError] = useState('');
  const [rewardSaving, setRewardSaving] = useState(false);

  useEffect(() => {
    getServices()
      .then((data) => setServices(data as ServiceRecord[]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!result?.profile?.id && !result?.appointment?.customer_id) return;
    const profileId = (result.profile?.id || result.appointment?.customer_id) as string;
    getSupabase()
      .from('profiles')
      .select('loyalty_points')
      .eq('id', profileId)
      .maybeSingle()
      .then(({ data }: { data: { loyalty_points?: number } | null }) =>
        setCustomerPoints(data?.loyalty_points || 0),
      )
      .catch(() => setCustomerPoints(0));
  }, [result?.profile?.id, result?.appointment?.customer_id]);

  useEffect(() => {
    const appointment = result?.appointment;
    if (appointment?.loyalty_reward_id) {
      setReservedReward({
        id: appointment.loyalty_reward_id,
        name: appointment.loyalty_reward_name || '',
        points: appointment.loyalty_points_cost || 0,
        code: appointment.loyalty_redemption_code,
      });
    } else {
      setReservedReward(null);
    }
  }, [result?.appointment?.id, result?.appointment?.loyalty_reward_id]);

  useEffect(() => {
    if (!newUserSuccess) return;
    const timer = setTimeout(resetFlow, 7000);
    return () => clearTimeout(timer);
  }, [newUserSuccess]);

  const resetFlow = () => {
    setNewUserSuccess(false);
    setPhone('');
    setResult(null);
    setSelectedServices([]);
    setSelectedAddOns([]);
    setShowServiceSelection(false);
    setError(null);
  };

  const handleKeyPress = (key: string) => {
    if (key === 'del') {
      setPhone((prev) => prev.slice(0, -1));
      setResult(null);
    } else if (key === 'clear') {
      setPhone('');
      setResult(null);
    } else if (phone.length < 10) {
      setPhone((prev) => prev + key);
    }
  };

  const handleSubmit = async () => {
    if (phone.length !== 10) return;
    setLoading(true);
    setError(null);

    try {
      const response = (await processCheckIn(phone)) as CheckInResult;
      setResult(response);
      const cleanPhone = phone.replace(/\D/g, '');
      setWaiverCustomerPhone(cleanPhone);

      if (response.isNew) {
        setShowWaiver(false);
      } else {
        setWaiverCustomerName(response.name || '');
        setShowWaiver(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteWaiverTrigger = (profileData: {
    id: string;
    full_name: string;
    phone: string;
    refreshmentPref?: string | null;
  }) => {
    setResult((prev) => ({
      ...prev,
      isNew: true,
      profile: profileData,
      name: profileData.full_name,
    }));
    setWaiverCustomerName(profileData.full_name);
    setWaiverCustomerPhone(profileData.phone);
    setNewUserDetails({
      fullName: profileData.full_name,
      refreshmentPref: profileData.refreshmentPref || '',
    });
    setShowWaiver(true);
  };

  const handleExistingUserServiceSelect = async (payload: ServiceSelectionPayload) => {
    if (!result?.appointment?.id) return;
    setLoading(true);
    try {
      const { services: chosenServices, addOns, refreshmentPref } = payload;
      const { add_ons: addOnsValue, selected_service_names: selectedServiceNames } =
        buildAppointmentServicePayload(chosenServices, addOns);
      const totalPrice =
        chosenServices.reduce((sum, service) => sum + (service.price || 0), 0) +
        addOns.reduce((sum, addOn) => sum + (addOn.price || 0), 0);
      const availableRefreshments = await getAvailableRefreshments();
      const safeRefreshmentPref = isRefreshmentAvailable(refreshmentPref, availableRefreshments)
        ? refreshmentPref || null
        : null;

      const { error: updateError } = await getSupabase().rpc('update_my_appointment', {
        caller_phone: phone,
        appointment_id: result.appointment.id,
        p_service_id: chosenServices[0]?.id || null,
        p_add_ons: addOnsValue,
        p_selected_service_names: selectedServiceNames,
        p_final_price: totalPrice,
        p_refreshment_pref: safeRefreshmentPref,
      });
      if (updateError) throw updateError;
      setSelectedServices(chosenServices);
      setSelectedAddOns(addOns);
      setShowServiceSelection(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save services';
      setError(message);
    }
    setLoading(false);
  };

  const handleSaveWaiver = async (waiverData: { signature_image: string }) => {
    setLoading(true);
    setError(null);
    try {
      const profileId = (result?.profile?.id || result?.appointment?.customer_id || null) as string | null;
      const profileName =
        (result?.profile?.full_name as string) || result?.name || waiverCustomerName || 'Walk-In Customer';
      const profilePhone = (result?.profile?.phone as string) || waiverCustomerPhone;

      const { error: insertError } = await getSupabase().from('customer_waivers').insert([
        {
          profile_id: profileId,
          customer_phone: profilePhone,
          customer_name: profileName,
          agreed_to_terms: true,
          signature_image: waiverData.signature_image,
        },
      ]);

      if (insertError) throw insertError;

      if (result?.isNew) {
        setNewUserSuccess(true);
      }
      setShowWaiver(false);
    } catch {
      setError('Failed to save waiver securely. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReserveReward = async (reward: (typeof LOYALTY_REWARDS)[number]) => {
    if (!result?.appointment?.id || rewardSaving) return;
    setRewardSaving(true);
    setRewardError('');
    const reserveResult = await reserveLoyaltyRewardForVisit(phone, result.appointment.id, reward);
    setRewardSaving(false);
    if (!reserveResult.success) {
      setRewardError(reserveResult.error || 'Could not reserve reward');
      return;
    }
    setReservedReward({
      id: reward.id,
      name: reward.name,
      points: reward.points,
      code: reserveResult.redemption_code,
    });
    setResult((prev) =>
      prev
        ? {
            ...prev,
            appointment: {
              ...prev.appointment,
              loyalty_reward_id: reward.id,
              loyalty_reward_name: reward.name,
              loyalty_points_cost: reward.points,
              loyalty_redemption_code: reserveResult.redemption_code,
            },
          }
        : prev,
    );
  };

  if (showWaiver) {
    return (
      <WaiverModal
        visible={showWaiver}
        customerName={waiverCustomerName}
        customerPhone={waiverCustomerPhone}
        onConfirm={handleSaveWaiver}
        onCancel={() => {
          setShowWaiver(false);
          resetFlow();
          navigation.navigate('Public');
        }}
      />
    );
  }

  if (newUserSuccess) {
    return (
      <SafeAreaView style={[styles.screen, { justifyContent: 'center', padding: 24 }]}>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.textGold, { fontSize: 36, fontWeight: '600', textAlign: 'center' }]}>
            Welcome to the Club
          </Text>
          <Text style={[styles.textPrimary, { fontSize: 22, marginTop: 12 }]}>{newUserDetails.fullName}</Text>
          {newUserDetails.refreshmentPref ? (
            <Text style={[styles.textSecondary, { marginTop: 12, textAlign: 'center' }]}>
              Your <Text style={styles.textGold}>{newUserDetails.refreshmentPref}</Text> is being prepared
            </Text>
          ) : null}
          <Pressable
            onPress={() => {
              resetFlow();
              navigation.navigate('Public');
            }}
            style={[styles.buttonPrimary, { marginTop: 32, paddingHorizontal: 32 }]}
          >
            <Text style={styles.buttonPrimaryText}>Return Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (showServiceSelection) {
    return (
      <KioskServiceSelection
        onSelect={(payload) => {
          if (result && !result.isNew && result.appointment) {
            handleExistingUserServiceSelect(payload);
          } else {
            setSelectedServices(payload.services);
            setSelectedAddOns(payload.addOns);
            setShowServiceSelection(false);
          }
        }}
        onBack={() => setShowServiceSelection(false)}
        initialServices={selectedServices}
        initialAddOnIds={selectedAddOns.map((addOn) => addOn.id)}
      />
    );
  }

  if (result?.isNew) {
    return (
      <KioskRegistrationForm
        phone={phone}
        onClose={() => {
          setPhone('');
          setResult(null);
        }}
        onCompleteWaiverTrigger={handleCompleteWaiverTrigger}
      />
    );
  }

  if (result && !result.isNew && result.appointment) {
    const addOnCatalog = services.filter((service) => service.is_addon);
    const totalPrice =
      selectedServices.reduce((sum, service) => sum + (service.price || 0), 0) +
      selectedAddOns.reduce((sum, addOn) => sum + (addOn.price || 0), 0);

    return (
      <SafeAreaView style={[styles.screen, { justifyContent: 'center', padding: 20 }]}>
        <ScrollableContent>
          <View style={{ alignItems: 'center', maxWidth: 420, alignSelf: 'center', width: '100%' }}>
            <Text style={[styles.textPrimary, { fontSize: 28, fontWeight: '600' }]}>Welcome Back</Text>
            <Text style={[styles.textGold, { fontSize: 20, marginVertical: 12 }]}>{result.name}</Text>

            <Pressable
              onPress={() => setShowServiceSelection(true)}
              style={{
                width: '100%',
                borderWidth: 1,
                borderColor: styles.tokens.borderColor,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Text style={styles.textGold}>
                {selectedServices.length > 0 ? 'Change Services' : 'Select Services'}
              </Text>
            </Pressable>

            {selectedServices.length > 0 ? (
              <View style={[styles.card, { width: '100%', padding: 16, marginBottom: 16 }]}>
                {selectedServices.map((service) => (
                  <Text key={service.id} style={styles.textPrimary}>
                    {service.name} — ${service.price}
                  </Text>
                ))}
                {selectedAddOns.length > 0 ? (
                  <Text style={[styles.textSecondary, { marginTop: 4 }]}>
                    Add-ons: {selectedAddOns.map((addOn) => addOn.name).join(', ')}
                  </Text>
                ) : null}
                <Text style={[styles.textGold, { fontSize: 22, fontWeight: '600', marginTop: 8 }]}>
                  ${totalPrice.toFixed(2)}
                </Text>
              </View>
            ) : null}

            {addOnCatalog.length > 0 && selectedServices.length > 0 ? (
              <View style={{ width: '100%', marginBottom: 16, gap: 8 }}>
                <Text style={styles.textSecondary}>Add-Ons (Optional)</Text>
                {addOnCatalog.map((addOn) => {
                  const isSelected = selectedAddOns.some((item) => item.id === addOn.id);
                  return (
                    <Pressable
                      key={addOn.id}
                      onPress={() =>
                        setSelectedAddOns((prev) =>
                          isSelected ? prev.filter((item) => item.id !== addOn.id) : [...prev, addOn],
                        )
                      }
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        borderWidth: 1,
                        borderColor: isSelected ? styles.tokens.goldStrong : styles.tokens.borderLight,
                        borderRadius: 12,
                        padding: 12,
                      }}
                    >
                      <Text style={[styles.textPrimary, { flex: 1 }]}>{addOn.name}</Text>
                      <Text style={styles.textGold}>+${addOn.price}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {selectedServices.length > 0 && customerPoints > 0 ? (
              <View style={[styles.card, { width: '100%', padding: 16, marginBottom: 16 }]}>
                <Text style={styles.textSecondary}>Redeem a reward (one per visit)</Text>
                <Text style={[styles.textSecondary, { fontSize: 12, marginBottom: 8 }]}>
                  Balance: {customerPoints} pts
                </Text>
                {rewardError ? <Text style={{ color: '#f87171', marginBottom: 8 }}>{rewardError}</Text> : null}
                {reservedReward ? (
                  <View style={{ borderWidth: 1, borderColor: styles.tokens.borderColor, borderRadius: 8, padding: 12 }}>
                    <Text style={styles.textGold}>{reservedReward.name}</Text>
                    <Text style={styles.textSecondary}>
                      {reservedReward.points} pts · Code {reservedReward.code}
                    </Text>
                  </View>
                ) : (
                  LOYALTY_REWARDS.filter((reward) => customerPoints >= reward.points).map((reward) => (
                    <Pressable
                      key={reward.id}
                      disabled={rewardSaving}
                      onPress={() => handleReserveReward(reward)}
                      style={{
                        borderWidth: 1,
                        borderColor: styles.tokens.borderLight,
                        borderRadius: 8,
                        padding: 10,
                        marginTop: 8,
                      }}
                    >
                      <Text style={styles.textPrimary}>{reward.name}</Text>
                      <Text style={styles.textSecondary}>
                        {reward.points} pts · {reward.description}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <Pressable
                onPress={() => {
                  resetFlow();
                  navigation.navigate('Public');
                }}
                style={{
                  flex: 1,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: styles.tokens.borderColor,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={styles.textSecondary}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setNewUserDetails({
                    fullName: result?.name || 'Guest',
                    refreshmentPref: (result?.appointment?.refreshment_pref as string) || '',
                  });
                  setNewUserSuccess(true);
                }}
                style={[styles.buttonPrimary, { flex: 1 }]}
              >
                <Text style={styles.buttonPrimaryText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </ScrollableContent>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={{ padding: 20 }}>
        <Pressable onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="close" size={20} color={styles.tokens.goldStrong} />
          <Text style={styles.textGold}>Close</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text style={styles.kioskTitle}>CHECK IN</Text>
        <Text style={[styles.textSecondary, { marginTop: 8, marginBottom: 24 }]}>
          Enter your phone number to begin
        </Text>

        <Text
          style={[
            styles.textPrimary,
            { fontSize: 28, fontWeight: '600', marginBottom: 12, opacity: phone.length > 0 ? 1 : 0.5 },
          ]}
        >
          {formatDisplay(phone)}
        </Text>

        <View
          style={{
            height: 4,
            width: 192,
            backgroundColor: styles.tokens.bgSecondary,
            borderRadius: 2,
            overflow: 'hidden',
            marginBottom: 24,
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${(phone.length / 10) * 100}%`,
              backgroundColor: styles.tokens.goldStrong,
            }}
          />
        </View>

        {PHONE_KEYS.map((row, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            {row.map((key, keyIndex) => {
              const disabled = loading || (key !== 'del' && key !== 'clear' && phone.length >= 10);
              return (
                <Pressable
                  key={`${key}-${keyIndex}`}
                  onPress={() => handleKeyPress(key)}
                  disabled={disabled}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: styles.tokens.inputBg,
                    opacity: disabled && key !== 'del' && key !== 'clear' ? 0.5 : 1,
                  }}
                >
                  {key === 'del' ? (
                    <Icon name="backspace" size={24} color={styles.tokens.textPrimary} />
                  ) : (
                    <Text style={[styles.textPrimary, { fontSize: key === 'clear' ? 11 : 22, letterSpacing: 1 }]}>
                      {key === 'clear' ? 'CLEAR' : key}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}

        {phone.length === 10 && !loading ? (
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <Pressable
              onPress={() => {
                resetFlow();
                navigation.navigate('Public');
              }}
              style={{
                flex: 1,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: styles.tokens.borderColor,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={styles.textSecondary}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSubmit} style={[styles.buttonPrimary, { flex: 1 }]}>
              <Text style={styles.buttonPrimaryText}>Check In</Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? <ActivityIndicator color={styles.tokens.goldStrong} style={{ marginTop: 16 }} /> : null}
        {error ? <Text style={{ color: '#f87171', marginTop: 12, textAlign: 'center' }}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

function ScrollableContent({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1, justifyContent: 'center' }}>{children}</View>;
}
