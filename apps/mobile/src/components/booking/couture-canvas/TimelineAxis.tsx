import { Pressable, Text, View } from 'react-native';
import {
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  formatTimeLabelParts,
  getHourBandCenterTop,
  getHourLabels,
  timeToOffset,
  TIMELINE_AXIS_WIDTH,
} from '@nail-couture/shared/utils/coutureTimeline.js';
import { COUTURE_COLORS } from './constants';
import { HourSlotSeparators, TimelineHourBands } from './HourSlotSeparators';

type TimelineAxisProps = {
  dayStartMinutes?: number;
  dayEndMinutes?: number;
  slotCountByStart?: Record<number, number>;
  hourSlots?: Array<{ startMinutes: number }>;
  onHourSlotPress?: (startMinutes: number, durationMinutes: number) => void;
};

function formatVisitCount(count: number) {
  return `${count} ${count === 1 ? 'visit' : 'visits'}`;
}

export function TimelineAxis({
  dayStartMinutes = DAY_START_MINUTES,
  dayEndMinutes = DAY_END_MINUTES,
  slotCountByStart = {},
  hourSlots = [],
  onHourSlotPress,
}: TimelineAxisProps) {
  const labels = getHourLabels(dayStartMinutes, dayEndMinutes);
  const closeTimeLabel = formatTimeLabelParts(dayEndMinutes);

  return (
    <View style={{ width: TIMELINE_AXIS_WIDTH, position: 'relative' }}>
      <TimelineHourBands slots={hourSlots} dayStartMinutes={dayStartMinutes} />
      <HourSlotSeparators slots={hourSlots} dayStartMinutes={dayStartMinutes} />
      {labels.map(({ minutes, durationMinutes, label }) => {
        const bookingCount = slotCountByStart[minutes] ?? 0;
        return (
          <Pressable
            key={minutes}
            onPress={() => onHourSlotPress?.(minutes, durationMinutes)}
            accessibilityRole="button"
            accessibilityLabel={`New appointment at ${label}`}
            hitSlop={8}
            style={({ pressed }) => ({
              position: 'absolute',
              top: getHourBandCenterTop(minutes, dayStartMinutes, durationMinutes),
              right: 4,
              alignItems: 'flex-end',
              transform: [{ translateY: -12 }],
              gap: 2,
              paddingHorizontal: 4,
              paddingVertical: 4,
              borderRadius: 6,
              backgroundColor: pressed ? 'rgba(255,255,255,0.06)' : 'transparent',
            })}
          >
            <Text style={{ fontSize: 10, color: COUTURE_COLORS.textMuted, fontWeight: '500' }}>
              {label}
            </Text>
            {bookingCount > 0 ? (
              <View
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: 'rgba(197,160,89,0.3)',
                  backgroundColor: 'rgba(197,160,89,0.1)',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: '600', color: COUTURE_COLORS.gold }}>
                  {formatVisitCount(bookingCount)}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
      <View
        style={{
          position: 'absolute',
          top: timeToOffset(dayEndMinutes, dayStartMinutes),
          right: 4,
          alignItems: 'flex-end',
          gap: 2,
          transform: [{ translateY: -12 }],
        }}
      >
        <Text style={{ fontSize: 9, fontWeight: '500', color: 'rgba(249,249,249,0.35)' }}>
          Closes
        </Text>
        <Text style={{ fontSize: 9, fontWeight: '500', color: 'rgba(249,249,249,0.35)' }}>
          {closeTimeLabel.time}
        </Text>
        <Text style={{ fontSize: 9, fontWeight: '500', color: 'rgba(249,249,249,0.35)' }}>
          {closeTimeLabel.period}
        </Text>
      </View>
    </View>
  );
}
