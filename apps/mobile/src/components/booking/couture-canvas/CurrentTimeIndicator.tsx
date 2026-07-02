import { Text, View } from 'react-native';
import {
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  formatTimeLabel,
  minutesFromMidnight,
  timeToOffset,
  TIMELINE_AXIS_WIDTH,
} from '@nail-couture/shared/utils/coutureTimeline.js';
import { COUTURE_COLORS } from './constants';

type CurrentTimeIndicatorProps = {
  dayStartMinutes?: number;
  dayEndMinutes?: number;
  now?: Date;
};

export function CurrentTimeIndicator({
  dayStartMinutes = DAY_START_MINUTES,
  dayEndMinutes = DAY_END_MINUTES,
  now = new Date(),
}: CurrentTimeIndicatorProps) {
  const nowMinutes = minutesFromMidnight(now);
  const top = timeToOffset(nowMinutes, dayStartMinutes);

  if (nowMinutes < dayStartMinutes || nowMinutes > dayEndMinutes) {
    return null;
  }

  return (
    <View
      style={{
        position: 'absolute',
        left: TIMELINE_AXIS_WIDTH,
        right: 16,
        top,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
      }}
      pointerEvents="none"
    >
      <View
        style={{
          backgroundColor: COUTURE_COLORS.gold,
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 999,
          marginRight: 4,
        }}
      >
        <Text style={{ fontSize: 9, color: '#121212', fontWeight: '700' }}>{formatTimeLabel(nowMinutes)}</Text>
      </View>
      <View style={{ flex: 1, height: 1.5, backgroundColor: COUTURE_COLORS.gold, opacity: 0.85 }} />
    </View>
  );
}
