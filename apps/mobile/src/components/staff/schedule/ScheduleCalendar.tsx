import { Pressable, Text, View } from 'react-native';
import {
  DAY_LABELS,
  SHIFT_TYPES,
  isToday,
  shiftConfig,
  toDateStr,
} from '@nail-couture/shared/utils/scheduleUtils.js';
import { useThemeStyles } from '../../../theme/useThemeStyles';
import { getShiftChipStyle, SHIFT_DOT_COLORS } from './constants';
import { TimeOffChip } from './TimeOffChip';
import type { ShiftRecord } from './ShiftChip';

type ScheduleCalendarProps = {
  monthGrid: (Date | null)[];
  shiftsByDate: Record<string, (ShiftRecord & { employee_id?: string })[]>;
  selectedStaffId: string | null;
  selectedDay: string | null;
  onDayClick: (dateStr: string) => void;
  ghostShiftsByDate?: Record<string, ShiftRecord[]>;
  timeOffByDate?: Record<string, string>;
  emptyMessage?: string;
};

function CellShiftChip({ shift, ghost = false }: { shift: ShiftRecord; ghost?: boolean }) {
  const typeCfg = shiftConfig(shift.shift_type);
  const chipStyle = getShiftChipStyle(shift.shift_type);

  return (
    <View
      style={{
        borderRadius: 4,
        borderWidth: 1,
        paddingHorizontal: 2,
        paddingVertical: 1,
        backgroundColor: ghost ? `${chipStyle.backgroundColor}66` : chipStyle.backgroundColor,
        borderColor: ghost ? `${chipStyle.borderColor}88` : chipStyle.borderColor,
        borderStyle: ghost ? 'dashed' : 'solid',
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontSize: 7,
          fontWeight: '700',
          color: ghost ? `${chipStyle.color}AA` : chipStyle.color,
          textAlign: 'center',
        }}
      >
        {typeCfg.short}
      </Text>
    </View>
  );
}

export function ScheduleCalendar({
  monthGrid,
  shiftsByDate,
  selectedStaffId,
  selectedDay,
  onDayClick,
  ghostShiftsByDate = {},
  timeOffByDate = {},
  emptyMessage,
}: ScheduleCalendarProps) {
  const styles = useThemeStyles();

  const hasAnyShifts = monthGrid.some((date) => {
    if (!date) return false;
    const dateStr = toDateStr(date);
    const saved = (shiftsByDate[dateStr] || []).filter((s) => s.employee_id === selectedStaffId);
    const ghost = ghostShiftsByDate[dateStr] || [];
    return saved.length > 0 || ghost.length > 0 || timeOffByDate[dateStr];
  });

  return (
    <View style={[styles.card, { padding: 12 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={[styles.textPrimary, { fontWeight: '500' }]}>Month overview</Text>
        {Object.keys(ghostShiftsByDate).length > 0 ? (
          <View
            style={{
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: `${styles.tokens.goldStrong}44`,
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text style={[styles.textGold, { fontSize: 10, letterSpacing: 1 }]}>PREVIEW</Text>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {DAY_LABELS.map((d) => (
          <View key={d} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
            <Text style={[styles.textSecondary, { fontSize: 9, fontWeight: '700' }]}>{d.slice(0, 1)}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {monthGrid.map((date, idx) => {
          if (!date) {
            return <View key={`pad-${idx}`} style={{ width: `${100 / 7}%`, minHeight: 44 }} />;
          }

          const dateStr = toDateStr(date);
          const dayShifts = (shiftsByDate[dateStr] || []).filter((s) => s.employee_id === selectedStaffId);
          const ghostShifts = ghostShiftsByDate[dateStr] || [];
          const timeOffStatus = timeOffByDate[dateStr];
          const today = isToday(dateStr);
          const hasShift = dayShifts.length > 0 || ghostShifts.length > 0 || timeOffStatus;
          const maxChips = timeOffStatus ? 1 : 2;

          return (
            <Pressable
              key={dateStr}
              onPress={() => onDayClick(dateStr)}
              style={{
                width: `${100 / 7}%`,
                minHeight: 44,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: today
                  ? `${styles.tokens.goldStrong}66`
                  : selectedDay === dateStr
                    ? styles.tokens.goldStrong
                    : hasShift
                      ? styles.tokens.borderLight
                      : styles.tokens.borderLight,
                backgroundColor:
                  today || selectedDay === dateStr ? `${styles.tokens.goldStrong}0A` : 'transparent',
                padding: 2,
                marginBottom: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '500',
                  textAlign: 'center',
                  color: today ? styles.tokens.goldStrong : styles.tokens.textSecondary,
                }}
              >
                {date.getDate()}
              </Text>
              <View style={{ gap: 2, marginTop: 2 }}>
                {timeOffStatus ? <TimeOffChip status={timeOffStatus} size="sm" /> : null}
                {dayShifts.slice(0, maxChips).map((s) => (
                  <CellShiftChip key={s.id} shift={s} />
                ))}
                {ghostShifts
                  .slice(0, Math.max(0, maxChips - dayShifts.length))
                  .map((g, i) => (
                    <CellShiftChip key={`ghost-${i}`} shift={g} ghost />
                  ))}
                {dayShifts.length + ghostShifts.length + (timeOffStatus ? 1 : 0) > 2 ? (
                  <Text style={{ fontSize: 7, color: styles.tokens.textMuted, textAlign: 'center' }}>
                    +{dayShifts.length + ghostShifts.length + (timeOffStatus ? 1 : 0) - 2}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {!hasAnyShifts && emptyMessage ? (
        <Text
          style={[
            styles.textSecondary,
            { textAlign: 'center', paddingVertical: 16, marginTop: 12, borderTopWidth: 1, borderTopColor: styles.tokens.borderLight },
          ]}
        >
          {emptyMessage}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: styles.tokens.borderLight,
        }}
      >
        {SHIFT_TYPES.map((t) => (
          <View key={t.value} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: SHIFT_DOT_COLORS[t.value],
              }}
            />
            <Text style={[styles.textSecondary, { fontSize: 10 }]}>{t.label}</Text>
          </View>
        ))}
        {Object.keys(ghostShiftsByDate).length > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: `${styles.tokens.goldStrong}88`,
              }}
            />
            <Text style={[styles.textSecondary, { fontSize: 10 }]}>Draft preview</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
