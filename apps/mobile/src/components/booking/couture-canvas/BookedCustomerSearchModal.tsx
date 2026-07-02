import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { dateToMinutes, formatTimeShort } from '@nail-couture/shared/utils/coutureTimeline.js';
import { AppModal } from '../../AppModal';
import { useThemeStyles } from '../../../theme/useThemeStyles';
import type { BookedCustomerSearchResult, BookedCustomerSelection } from './useBookingCanvasData';

type BookedCustomerSearchModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (result: BookedCustomerSelection) => void;
  searchBookedByPhone: (term: string) => Promise<BookedCustomerSearchResult[]>;
};

const APPOINTMENT_ROW_HEIGHT = 39;
const VISIBLE_APPOINTMENT_ROWS = 3;

function formatPhoneDisplay(phone: string) {
  const digits = phone.replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) return phone;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function formatAppointmentLabel(scheduledAt: Date) {
  return `${scheduledAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })} · ${formatTimeShort(dateToMinutes(scheduledAt))}`;
}

function CustomerAppointmentScrollList({
  customer,
  onSelect,
}: {
  customer: BookedCustomerSearchResult;
  onSelect: (result: BookedCustomerSelection) => void;
}) {
  const { tokens } = useThemeStyles();
  const scrollRef = useRef<ScrollView>(null);
  const appointments = customer.appointments ?? [];
  const firstUpcomingIndex = appointments.findIndex((appointment) => !appointment.isPast);
  const listHeight = APPOINTMENT_ROW_HEIGHT * VISIBLE_APPOINTMENT_ROWS;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const anchorIndex = firstUpcomingIndex >= 0
        ? firstUpcomingIndex
        : customer.appointments.length - 1;
      if (anchorIndex < 0) return;

      scrollRef.current?.scrollTo({
        y: Math.max(0, anchorIndex * APPOINTMENT_ROW_HEIGHT - listHeight / 2 + APPOINTMENT_ROW_HEIGHT / 2),
        animated: false,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [appointments, firstUpcomingIndex, listHeight]);

  if (!appointments.length) return null;

  return (
    <ScrollView
      ref={scrollRef}
      style={{ maxHeight: listHeight, backgroundColor: tokens.cardBg }}
      nestedScrollEnabled
      showsVerticalScrollIndicator
    >
      {appointments.map((appointment, index) => (
        <Pressable
          key={appointment.appointmentId}
          onPress={() => onSelect({
            customerId: customer.id,
            appointmentId: appointment.appointmentId,
            scheduledAt: appointment.scheduledAt,
          })}
          style={{
            height: APPOINTMENT_ROW_HEIGHT,
            justifyContent: 'center',
            paddingHorizontal: 12,
            borderBottomWidth: index < appointments.length - 1 ? 1 : 0,
            borderBottomColor: tokens.borderLight,
            backgroundColor: tokens.cardBg,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              color: appointment.isPast ? tokens.textMuted : tokens.goldStrong,
            }}
          >
            {appointment.isPast ? 'Previous · ' : 'Upcoming · '}
            {formatAppointmentLabel(appointment.scheduledAt)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function BookedCustomerSearchModal({
  open,
  onClose,
  onSelect,
  searchBookedByPhone,
}: BookedCustomerSearchModalProps) {
  const { tokens } = useThemeStyles();
  const [phoneQuery, setPhoneQuery] = useState('');
  const [results, setResults] = useState<BookedCustomerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setPhoneQuery('');
      setResults([]);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const digits = phoneQuery.replace(/\D/g, '');
    if (digits.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const rows = await searchBookedByPhone(digits);
        setResults(rows);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [phoneQuery, searchBookedByPhone]);

  const digitCount = phoneQuery.replace(/\D/g, '').length;

  return (
    <AppModal open={open} onClose={onClose} title="Find Booked Customer" maxPanelWidth={360} centerTitle>
      <Text style={{ fontSize: 11, color: tokens.textMuted, marginBottom: 6 }}>Phone Number</Text>
      <TextInput
        value={phoneQuery}
        onChangeText={(value) => setPhoneQuery(value.replace(/\D/g, '').slice(0, 10))}
        placeholder="Enter phone digits"
        placeholderTextColor={tokens.textMuted}
        keyboardType="phone-pad"
        autoFocus
        style={{
          borderWidth: 1,
          borderColor: tokens.inputBorder,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: tokens.textPrimary,
          backgroundColor: tokens.inputBg,
          marginBottom: 12,
        }}
      />
      {loading ? (
        <Text style={{ fontSize: 11, color: tokens.textMuted }}>Searching booked customers…</Text>
      ) : null}
      {!loading && digitCount >= 3 && results.length === 0 ? (
        <Text style={{ fontSize: 11, color: tokens.textMuted }}>
          No booked customers match that phone number.
        </Text>
      ) : null}
      {results.length > 0 ? (
        <View style={{ gap: 12 }}>
          {results.map((customer) => (
            <View
              key={customer.id}
              style={{
                borderWidth: 1,
                borderColor: tokens.cardBorder,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: tokens.cardBg,
              }}
            >
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: tokens.borderLight,
                  backgroundColor: tokens.inputBg,
                }}
              >
                <Text style={{ fontSize: 14, color: tokens.textPrimary, fontWeight: '600' }}>
                  {customer.full_name}
                </Text>
                <Text style={{ fontSize: 11, color: tokens.textMuted, marginTop: 2 }}>
                  {formatPhoneDisplay(customer.phone)}
                </Text>
              </View>
              <CustomerAppointmentScrollList customer={customer} onSelect={onSelect} />
            </View>
          ))}
        </View>
      ) : null}
    </AppModal>
  );
}
