import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { formatWeekRange, getWeekDates, isToday, toDateStr } from '@nail-couture/shared/utils/scheduleUtils.js';
import { COUTURE_COLORS } from './constants';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type WeekDateStripProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
};

function WeekNavButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: COUTURE_COLORS.glassBorder,
      }}
    >
      <Text style={{ color: COUTURE_COLORS.textSecondary, fontSize: 18, lineHeight: 20 }}>{label}</Text>
    </Pressable>
  );
}

export function WeekDateStrip({
  selectedDate,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
  onToday,
}: WeekDateStripProps) {
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const selectedStr = toDateStr(selectedDate);

  return (
    <View style={{ paddingHorizontal: 16, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <WeekNavButton label="‹" onPress={onPrevWeek} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
        >
          {weekDates.map((dateObj) => {
            const dateStr = toDateStr(dateObj);
            const isSelected = dateStr === selectedStr;
            const isTodayDate = isToday(dateStr);
            const dayLetter = DAY_LETTERS[dateObj.getDay()];

            return (
              <Pressable key={dateStr} onPress={() => onSelectDate(dateObj)} style={{ alignItems: 'center' }}>
                {isSelected ? (
                  <View style={{ padding: 2, borderRadius: 14, width: 52, height: 64 }}>
                    <Svg width={52} height={64} style={{ position: 'absolute', top: 0, left: 0 }}>
                      <Defs>
                        <LinearGradient id={`selGrad-${dateStr}`} x1="0%" y1="0%" x2="100%" y2="100%">
                          <Stop offset="0%" stopColor={COUTURE_COLORS.gold} />
                          <Stop offset="100%" stopColor="#9B7FD4" />
                        </LinearGradient>
                      </Defs>
                      <Rect x={1} y={1} width={50} height={62} rx={13} fill="none" stroke={`url(#selGrad-${dateStr})`} strokeWidth={1.5} />
                    </Svg>
                    <View
                      style={{
                        width: 48,
                        height: 60,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(197,160,89,0.08)',
                      }}
                    >
                      <Text style={{ fontSize: 11, color: COUTURE_COLORS.gold, fontWeight: '600' }}>{dayLetter}</Text>
                      <Text style={{ fontSize: 18, color: '#F9F9F9', fontWeight: '700', marginTop: 2 }}>{dateObj.getDate()}</Text>
                    </View>
                  </View>
                ) : (
                  <View
                    style={{
                      width: 48,
                      height: 60,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 11, color: COUTURE_COLORS.textSecondary, fontWeight: '500' }}>{dayLetter}</Text>
                    <Text
                      style={{
                        fontSize: 18,
                        color: isTodayDate ? COUTURE_COLORS.gold : COUTURE_COLORS.textSecondary,
                        fontWeight: isTodayDate ? '700' : '500',
                        marginTop: 2,
                      }}
                    >
                      {dateObj.getDate()}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
        <WeekNavButton label="›" onPress={onNextWeek} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
        <Pressable
          onPress={onToday}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: COUTURE_COLORS.glassBorder,
            backgroundColor: 'rgba(255,255,255,0.04)',
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '600', color: COUTURE_COLORS.textSecondary }}>Today</Text>
        </Pressable>
        <Text style={{ fontSize: 10, fontWeight: '600', color: COUTURE_COLORS.textSecondary, letterSpacing: 0.3 }}>
          {formatWeekRange(weekDates)}
        </Text>
      </View>
    </View>
  );
}

export function formatSelectedDateLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
