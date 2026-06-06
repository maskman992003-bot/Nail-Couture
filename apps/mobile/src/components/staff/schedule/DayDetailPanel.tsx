import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import {
  DAY_LABELS_FULL,
  SHIFT_TYPES,
} from '@nail-couture/shared/utils/scheduleUtils.js';
import { Icon } from '../../icons/Icon';
import { useThemeStyles } from '../../../theme/useThemeStyles';
import { APPOINTMENT_STATUS_LABELS, appointmentStatusBadgeStyle } from './constants';
import { ShiftChip, type ShiftRecord } from './ShiftChip';
import type { AppointmentRecord } from './WeekGrid';

type DayDetailPanelProps = {
  mode?: 'read' | 'edit';
  selectedDay: Date | string | null;
  shifts?: ShiftRecord[];
  appointments?: AppointmentRecord[];
  appointmentsLoading?: boolean;
  appointmentsError?: string;
  onClose: () => void;
  onDeleteShift?: (shiftId: string) => void;
  onAddShift?: (dateStr: string, shiftType: string, startTime?: string, endTime?: string) => void;
  onOpenCustomModal?: () => void;
};

function formatDayHeader(selectedDay: Date | string) {
  const date =
    selectedDay instanceof Date ? selectedDay : new Date(`${selectedDay}T12:00:00`);
  return {
    dayLabel: DAY_LABELS_FULL[date.getDay()],
    dateLabel: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  };
}

export function DayDetailPanel({
  mode = 'read',
  selectedDay,
  shifts = [],
  appointments = [],
  appointmentsLoading = false,
  appointmentsError = '',
  onClose,
  onDeleteShift,
  onAddShift,
  onOpenCustomModal,
}: DayDetailPanelProps) {
  const styles = useThemeStyles();

  if (!selectedDay) return null;

  const { dayLabel, dateLabel } = formatDayHeader(selectedDay);
  const isRead = mode === 'read';
  const dateStr =
    selectedDay instanceof Date
      ? `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, '0')}-${String(selectedDay.getDate()).padStart(2, '0')}`
      : selectedDay;

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 8,
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: styles.tokens.borderLight,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.textGold, { fontSize: 18, fontWeight: '600' }]}>
            {dayLabel}
            {isRead ? ' Details' : ''}
          </Text>
          <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 2 }]}>{dateLabel}</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close">
          <Icon name="close" size={28} color={styles.tokens.textSecondary} />
        </Pressable>
      </View>

      <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View>
          <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, marginBottom: 8 }]}>SHIFTS</Text>
          {shifts.length === 0 ? (
            <Text style={[styles.textSecondary, { fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 }]}>
              {isRead ? 'No shift scheduled' : 'No shifts scheduled'}
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {shifts.map((shift) => (
                <ShiftChip
                  key={shift.id}
                  shift={shift}
                  size="md"
                  onDelete={isRead ? undefined : onDeleteShift}
                />
              ))}
            </View>
          )}
        </View>

        {!isRead && onAddShift ? (
          <View style={{ borderTopWidth: 1, borderTopColor: styles.tokens.borderLight, paddingTop: 12 }}>
            <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, marginBottom: 8 }]}>
              QUICK ADD
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {SHIFT_TYPES.filter((t) => t.value !== 'custom').map((t) => (
                <Pressable
                  key={t.value}
                  onPress={() => onAddShift(dateStr, t.value)}
                  style={{
                    flexBasis: '30%',
                    flexGrow: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    alignItems: 'center',
                    backgroundColor: `${styles.tokens.goldStrong}22`,
                    borderColor: `${styles.tokens.goldStrong}44`,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '500', color: styles.tokens.goldStrong }}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {onOpenCustomModal ? (
              <Pressable
                onPress={onOpenCustomModal}
                style={{
                  paddingVertical: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: `${styles.tokens.goldStrong}44`,
                  backgroundColor: `${styles.tokens.goldStrong}22`,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '500', color: styles.tokens.goldStrong }}>
                  Custom shift
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {(isRead || appointmentsLoading || appointmentsError || appointments.length > 0) ? (
          <View style={isRead ? undefined : { borderTopWidth: 1, borderTopColor: styles.tokens.borderLight, paddingTop: 12 }}>
            <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, marginBottom: 8 }]}>
              {isRead ? `APPOINTMENTS (${appointments.length})` : `${appointments.length} appointment${appointments.length !== 1 ? 's' : ''}`}
            </Text>
            {appointmentsLoading ? (
              <ActivityIndicator color={styles.tokens.goldStrong} />
            ) : appointmentsError ? (
              <Text style={{ color: '#f87171', fontSize: 14 }}>{appointmentsError}</Text>
            ) : appointments.length === 0 ? (
              <Text style={[styles.textSecondary, { fontStyle: 'italic' }]}>
                {isRead ? 'No appointments on this day' : 'No appointments'}
              </Text>
            ) : (
              <View style={{ gap: isRead ? 12 : 8 }}>
                {appointments.map((appt) => {
                  const badge = appointmentStatusBadgeStyle(appt.status || '');
                  return (
                    <View
                      key={appt.id}
                      style={[
                        styles.card,
                        { padding: isRead ? 16 : 10 },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <Text style={[styles.textPrimary, { fontWeight: '600', flex: 1 }]} numberOfLines={1}>
                          {appt.customer_name}
                        </Text>
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 999,
                            borderWidth: 1,
                            backgroundColor: badge.backgroundColor,
                            borderColor: badge.borderColor,
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '700', color: badge.color }}>
                            {APPOINTMENT_STATUS_LABELS[appt.status || ''] || appt.status}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 4 }]}>{appt.service_name}</Text>
                      {appt.appointment_time ? (
                        <Text style={[styles.textGold, { fontSize: 12, marginTop: 4 }]}>
                          {new Date(appt.appointment_time).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
