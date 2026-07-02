import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { formatTimeShort } from '@nail-couture/shared/utils/coutureTimeline.js';
import { lookupCustomerByPhone, createBookingCanvasCustomer } from '@nail-couture/shared/utils/bookingCanvasData.js';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { Icon } from '../../icons/Icon';
import { ScrollSelect } from '../../forms/ScrollSelect';
import { ConfirmBookingButton } from './ConfirmBookingButton';
import { COUTURE_COLORS, COUTURE_RADIUS, DURATION_OPTIONS, HEADING_FONT } from './constants';
import { StaffAvatarRow } from './StaffAvatarRow';
import { TimeWheelPicker } from './TimeWheelPicker';
import { MonthDatePickerModal } from './MonthDatePickerModal';
import { formatSelectedDateLabel } from './WeekDateStrip';
import type { BookingDraft, CanvasService, CanvasStaffMember } from './types';

type BookingBottomSheetProps = {
  open: boolean;
  draft: BookingDraft;
  staff: CanvasStaffMember[];
  services: CanvasService[];
  onClose: () => void;
  onChange: (patch: Partial<BookingDraft>) => void;
  onConfirm: () => void;
  onCancelAppointment?: () => void;
  submitting?: boolean;
  searchCustomers: (term: string) => Promise<{ id: string; full_name?: string; phone?: string }[]>;
};

export function BookingBottomSheet({
  open,
  draft,
  staff,
  services,
  onClose,
  onChange,
  onConfirm,
  onCancelAppointment,
  submitting,
  searchCustomers,
}: BookingBottomSheetProps) {
  const isEditing = Boolean(draft.appointmentId);
  const { height: windowHeight } = useWindowDimensions();
  const sheetHeight = windowHeight * 0.68;
  const translateY = useSharedValue(sheetHeight);
  const [visible, setVisible] = useState(open);
  const [customerResults, setCustomerResults] = useState<{ id: string; full_name?: string; phone?: string }[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [phoneLookupError, setPhoneLookupError] = useState('');
  const [isUnregisteredPhone, setIsUnregisteredPhone] = useState(false);
  const [registeringCustomer, setRegisteringCustomer] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(true);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phoneLookupRef = useRef(0);
  const clientName = (draft.clientName ?? '').trim();

  useEffect(() => {
    if (!open) {
      setCustomerResults([]);
      setPhoneLookupError('');
      setIsUnregisteredPhone(false);
      setRegisteringCustomer(false);
      setShowCancelConfirm(false);
      setDatePickerOpen(false);
      setTimePickerOpen(true);
    }
  }, [open]);

  const runCustomerSearch = useCallback((term: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const trimmed = term.trim();
    if (trimmed.length < 2) {
      setCustomerResults([]);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      setCustomerSearchLoading(true);
      try {
        const results = await searchCustomers(trimmed);
        setCustomerResults(results);
      } catch {
        setCustomerResults([]);
      } finally {
        setCustomerSearchLoading(false);
      }
    }, 250);
  }, [searchCustomers]);

  const selectCustomer = useCallback((customer: { id: string; full_name?: string; phone?: string }) => {
    onChange({
      clientName: customer.full_name || '',
      phone: customer.phone || '',
      customerId: customer.id,
    });
    setCustomerResults([]);
    setPhoneLookupError('');
    setIsUnregisteredPhone(false);
  }, [onChange]);

  const handleClientNameChange = (clientName: string) => {
    onChange({ clientName, customerId: '' });
    runCustomerSearch(clientName);
  };

  const handlePhoneChange = (phone: string) => {
    const digits = phone.replace(/\D/g, '').slice(0, 10);
    const lookupId = phoneLookupRef.current + 1;
    phoneLookupRef.current = lookupId;

    onChange({ phone: digits, customerId: '' });
    setPhoneLookupError('');
    setIsUnregisteredPhone(false);
    if (digits.length < 10) return;

    void (async () => {
      try {
        const customer = await lookupCustomerByPhone(getSupabase(), digits);
        if (phoneLookupRef.current !== lookupId) return;
        if (!customer) {
          setPhoneLookupError('This phone number is not registered.');
          setIsUnregisteredPhone(true);
          return;
        }
        onChange({
          phone: (customer.phone || digits).replace(/\D/g, '').slice(0, 10),
          clientName: (customer.full_name || clientName).trim(),
          customerId: customer.id,
        });
        setCustomerResults([]);
      } catch {
        if (phoneLookupRef.current !== lookupId) return;
        setPhoneLookupError('Could not look up customer.');
      }
    })();
  };

  const handleRegisterCustomer = async () => {
    if (!clientName) return;
    setRegisteringCustomer(true);
    setPhoneLookupError('');
    try {
      const customer = await createBookingCanvasCustomer(getSupabase(), {
        phone: draft.phone,
        fullName: clientName,
      });
      onChange({
        phone: (customer.phone || draft.phone).replace(/\D/g, '').slice(0, 10),
        clientName: (customer.full_name || clientName).trim(),
        customerId: customer.id,
      });
      setIsUnregisteredPhone(false);
      setCustomerResults([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not register customer.';
      setPhoneLookupError(message);
    } finally {
      setRegisteringCustomer(false);
    }
  };

  useEffect(() => {
    if (open) {
      setVisible(true);
      translateY.value = withSpring(0, { damping: 22, stiffness: 220 });
      return;
    }
    translateY.value = withSpring(sheetHeight, { damping: 24, stiffness: 260 }, (finished) => {
      if (finished) runOnJS(setVisible)(false);
    });
  }, [open, sheetHeight, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const serviceOptions = services.map((s) => ({ value: s.id, label: s.name }));

  const fieldTriggerStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${COUTURE_COLORS.gold}66`,
    backgroundColor: 'rgba(255,255,255,0.04)',
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              {
                height: sheetHeight,
                borderTopLeftRadius: COUTURE_RADIUS.sheet,
                borderTopRightRadius: COUTURE_RADIUS.sheet,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: COUTURE_COLORS.glassBorder,
                borderBottomWidth: 0,
              },
              animatedStyle,
            ]}
          >
            <Pressable style={{ flex: 1 }} onPress={(e) => e.stopPropagation()}>
              <BlurView intensity={24} tint="dark" style={{ flex: 1 }}>
                <View style={{ flex: 1, backgroundColor: 'rgba(10,10,10,0.75)' }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 20,
                      paddingTop: 20,
                      paddingBottom: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: COUTURE_COLORS.glassBorder,
                    }}
                  >
                    <Text style={{ fontFamily: HEADING_FONT, fontSize: 24, color: '#F9F9F9' }}>
                      {isEditing ? 'Edit Appointment' : 'New Appointment'}
                    </Text>
                    <Pressable onPress={onClose} hitSlop={12}>
                      <Icon name="close" size={24} color={COUTURE_COLORS.textSecondary} />
                    </Pressable>
                  </View>

                  <ScrollView
                    contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 32 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                      <View style={{ flex: 1, minWidth: 120 }}>
                        <Text style={{ fontSize: 11, color: COUTURE_COLORS.textMuted, marginBottom: 4 }}>Date</Text>
                        <Pressable onPress={() => setDatePickerOpen(true)} style={fieldTriggerStyle}>
                          <Text style={{ fontSize: 14, color: '#F9F9F9', flex: 1 }} numberOfLines={1}>
                            {formatSelectedDateLabel(draft.date)}
                          </Text>
                          <Icon name="chevronDown" size={14} color={COUTURE_COLORS.textMuted} />
                        </Pressable>
                      </View>
                      <View style={{ flex: 1, minWidth: 100 }}>
                        <Text style={{ fontSize: 11, color: COUTURE_COLORS.textMuted, marginBottom: 4 }}>Time</Text>
                        <Pressable onPress={() => setTimePickerOpen((prev) => !prev)} style={fieldTriggerStyle}>
                          <Text style={{ fontSize: 14, color: '#F9F9F9' }}>{formatTimeShort(draft.timeMinutes)}</Text>
                          <Icon
                            name="chevronDown"
                            size={14}
                            color={COUTURE_COLORS.textMuted}
                            style={{ transform: [{ rotate: timePickerOpen ? '180deg' : '0deg' }] }}
                          />
                        </Pressable>
                      </View>
                      <View style={{ flex: 1, minWidth: 100 }}>
                        <Text style={{ fontSize: 11, color: COUTURE_COLORS.textMuted, marginBottom: 6 }}>Duration</Text>
                        <ScrollSelect
                          options={DURATION_OPTIONS}
                          value={String(draft.durationMinutes)}
                          onChange={(v) => onChange({ durationMinutes: Number(v) })}
                          placeholder="Duration"
                        />
                      </View>
                    </View>

                    {timePickerOpen ? (
                      <TimeWheelPicker
                        timeMinutes={draft.timeMinutes}
                        onChange={(timeMinutes) => onChange({ timeMinutes })}
                      />
                    ) : null}

                    <MonthDatePickerModal
                      open={datePickerOpen}
                      onClose={() => setDatePickerOpen(false)}
                      selectedDate={draft.date}
                      onSelectDate={(date) => onChange({ date })}
                    />

                    <View style={{ gap: 4 }}>
                      <Text style={{ fontSize: 11, color: COUTURE_COLORS.textMuted }}>Phone</Text>
                      <TextInput
                        value={draft.phone}
                        onChangeText={handlePhoneChange}
                        placeholder="(555) 000-0000"
                        placeholderTextColor={COUTURE_COLORS.textMuted}
                        keyboardType="phone-pad"
                        maxLength={10}
                        style={{
                          fontSize: 15,
                          color: '#F9F9F9',
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: `${COUTURE_COLORS.gold}66`,
                          backgroundColor: 'rgba(255,255,255,0.04)',
                        }}
                      />
                      {phoneLookupError ? (
                        <View style={{ gap: 4 }}>
                          <Text style={{ fontSize: 11, color: '#f87171' }}>{phoneLookupError}</Text>
                          {isUnregisteredPhone ? (
                            <Pressable
                              onPress={handleRegisterCustomer}
                              disabled={registeringCustomer || !clientName}
                              style={{ opacity: registeringCustomer || !clientName ? 0.5 : 1 }}
                            >
                              <Text style={{ fontSize: 11, color: COUTURE_COLORS.gold, textDecorationLine: 'underline' }}>
                                {registeringCustomer
                                  ? 'Creating customer account…'
                                  : clientName
                                    ? `Register ${clientName} as a new customer`
                                    : 'Enter client name below to register as a new customer'}
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                      ) : null}
                    </View>

                    <View style={{ gap: 4 }}>
                      <Text style={{ fontSize: 11, color: COUTURE_COLORS.textMuted }}>Client Name</Text>
                      <TextInput
                        value={draft.clientName}
                        onChangeText={handleClientNameChange}
                        placeholder="Search customer by name"
                        placeholderTextColor={COUTURE_COLORS.textMuted}
                        style={{
                          fontSize: 15,
                          color: '#F9F9F9',
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: `${COUTURE_COLORS.gold}66`,
                          backgroundColor: 'rgba(255,255,255,0.04)',
                        }}
                      />
                      {customerSearchLoading ? (
                        <Text style={{ fontSize: 11, color: COUTURE_COLORS.textMuted }}>Searching customers…</Text>
                      ) : null}
                      {customerResults.length > 0 ? (
                        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: COUTURE_COLORS.glassBorder, overflow: 'hidden' }}>
                          {customerResults.map((customer) => (
                            <Pressable
                              key={customer.id}
                              onPress={() => selectCustomer(customer)}
                              style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COUTURE_COLORS.glassBorder }}
                            >
                              <Text style={{ color: '#F9F9F9', fontSize: 14 }}>{customer.full_name}</Text>
                              {customer.phone ? (
                                <Text style={{ color: COUTURE_COLORS.textMuted, fontSize: 11, marginTop: 2 }}>{customer.phone}</Text>
                              ) : null}
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                    </View>

                    <View style={{ gap: 6 }}>
                      <Text style={{ fontSize: 11, color: COUTURE_COLORS.textMuted }}>Service</Text>
                      <ScrollSelect
                        options={serviceOptions}
                        value={draft.serviceId}
                        onChange={(serviceId) => onChange({ serviceId })}
                        placeholder="Select service"
                      />
                    </View>

                    <StaffAvatarRow
                      staff={staff}
                      selectedStaffId={draft.technicianId}
                      onSelect={(technicianId) => onChange({ technicianId })}
                    />

                    <View style={{ gap: 4 }}>
                      <Text style={{ fontSize: 11, color: COUTURE_COLORS.textMuted }}>Notes</Text>
                      <TextInput
                        value={draft.notes}
                        onChangeText={(notes) => onChange({ notes })}
                        placeholder="Optional notes"
                        placeholderTextColor={COUTURE_COLORS.textMuted}
                        multiline
                        numberOfLines={3}
                        style={{
                          fontSize: 14,
                          color: '#F9F9F9',
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: COUTURE_COLORS.glassBorder,
                          backgroundColor: 'rgba(255,255,255,0.03)',
                          minHeight: 72,
                          textAlignVertical: 'top',
                        }}
                      />
                    </View>

                    <ConfirmBookingButton
                      onPress={onConfirm}
                      loading={submitting}
                      disabled={!clientName || !draft.customerId || registeringCustomer}
                      label={isEditing ? 'Save Changes' : 'Confirm Booking'}
                    />

                    {isEditing ? (
                      showCancelConfirm ? (
                        <View
                          style={{
                            gap: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: 'rgba(248,113,113,0.3)',
                            backgroundColor: 'rgba(248,113,113,0.08)',
                            padding: 16,
                          }}
                        >
                          <Text style={{ fontSize: 14, color: '#F9F9F9' }}>
                            Cancel this appointment for {draft.clientName}?
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Pressable
                              onPress={() => setShowCancelConfirm(false)}
                              style={{
                                flex: 1,
                                alignItems: 'center',
                                paddingVertical: 10,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: COUTURE_COLORS.glassBorder,
                              }}
                            >
                              <Text style={{ color: COUTURE_COLORS.textSecondary }}>Keep</Text>
                            </Pressable>
                            <Pressable
                              onPress={onCancelAppointment}
                              disabled={submitting}
                              style={{
                                flex: 1,
                                alignItems: 'center',
                                paddingVertical: 10,
                                borderRadius: 12,
                                backgroundColor: '#ef4444',
                                opacity: submitting ? 0.5 : 1,
                              }}
                            >
                              <Text style={{ color: '#fff', fontWeight: '600' }}>
                                {submitting ? 'Cancelling…' : 'Confirm Cancel'}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => setShowCancelConfirm(true)}
                          disabled={submitting}
                          style={{
                            alignItems: 'center',
                            paddingVertical: 14,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: 'rgba(248,113,113,0.4)',
                            opacity: submitting ? 0.5 : 1,
                          }}
                        >
                          <Text style={{ color: '#f87171', fontSize: 14, fontWeight: '500' }}>Cancel Appointment</Text>
                        </Pressable>
                      )
                    ) : null}
                  </ScrollView>
                </View>
              </BlurView>
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
