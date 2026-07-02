import { Pressable, Text, View } from 'react-native';
import {
  dateToMinutes,
  durationToHeight,
  formatTimeRange,
  getAppointmentTimelineRange,
  getBookingCardTopInHourBand,
  getBookingColumnLeft,
  getInitialFromName,
  MIN_BOOKING_COLUMN_WIDTH,
  DAY_END_MINUTES,
  DAY_START_MINUTES,
} from '@nail-couture/shared/utils/coutureTimeline.js';
import { GlassSurface } from './GlassSurface';
import { COUTURE_COLORS } from './constants';
import type { CanvasAppointment } from './types';

type BookingCardProps = {
  appointment: CanvasAppointment;
  columnIndex: number;
  dayStartMinutes?: number;
  dayEndMinutes?: number;
  onPress?: (appointment: CanvasAppointment) => void;
};

export function BookingCard({
  appointment,
  columnIndex,
  dayStartMinutes = DAY_START_MINUTES,
  dayEndMinutes = DAY_END_MINUTES,
  onPress,
}: BookingCardProps) {
  const startMinutes = dateToMinutes(appointment.startAt);
  const range = getAppointmentTimelineRange(
    startMinutes,
    appointment.durationMinutes,
    dayStartMinutes,
    dayEndMinutes,
  );
  if (!range) return null;

  const height = Math.max(durationToHeight(range.durationMinutes), 56);
  const top = getBookingCardTopInHourBand(
    range.startMinutes,
    height,
    dayStartMinutes,
    dayEndMinutes,
  );
  const initial = getInitialFromName(appointment.technicianName);
  const left = getBookingColumnLeft(columnIndex);

  return (
    <Pressable
      onPress={() => onPress?.(appointment)}
      style={{
        position: 'absolute',
        top,
        height,
        left,
        width: MIN_BOOKING_COLUMN_WIDTH,
      }}
    >
      <GlassSurface
        accentSide="left"
        accentColor={appointment.accentColor}
        style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10 }}
      >
        <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, justifyContent: 'center', minWidth: 0 }}>
            <Text style={{ fontSize: 11, color: COUTURE_COLORS.textMuted, marginBottom: 4 }}>
              {formatTimeRange(range.startMinutes, range.endMinutes)}
            </Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#F9F9F9' }} numberOfLines={1}>
              {appointment.clientName}
            </Text>
            <Text style={{ fontSize: 12, color: COUTURE_COLORS.textSecondary, marginTop: 2 }} numberOfLines={1}>
              {appointment.serviceName}
            </Text>
            <Text style={{ fontSize: 11, color: COUTURE_COLORS.textMuted, marginTop: 1 }} numberOfLines={1}>
              {appointment.technicianName}
            </Text>
          </View>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: appointment.accentColor,
              alignSelf: 'center',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: appointment.accentColor }}>{initial.slice(0, 1)}</Text>
          </View>
        </View>
      </GlassSurface>
    </Pressable>
  );
}
