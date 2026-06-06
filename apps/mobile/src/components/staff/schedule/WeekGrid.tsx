import { Pressable, Text, View } from 'react-native';
import { DAY_LABELS, toDateStr } from '@nail-couture/shared/utils/scheduleUtils.js';
import { useThemeStyles } from '../../../theme/useThemeStyles';
import { APPOINTMENT_STATUS_COLORS } from './constants';
import { ShiftChip, type ShiftRecord } from './ShiftChip';
import { TimeOffChip } from './TimeOffChip';

export type AppointmentRecord = {
  id: string;
  customer_name?: string;
  service_name?: string;
  appointment_time?: string;
  status?: string;
};

type WeekGridProps = {
  weekDates: Date[];
  mode?: 'employee' | 'manager';
  shiftsByDate?: Record<string, ShiftRecord[]>;
  selectedStaffId?: string | null;
  timeOffByDate?: Record<string, string>;
  appointments?: AppointmentRecord[];
  selectedDay?: string | null;
  onDayClick: (dateObj: Date, dateIso: string) => void;
  todayStr: string;
};

export function WeekGrid({
  weekDates,
  mode = 'employee',
  shiftsByDate = {},
  selectedStaffId = null,
  timeOffByDate = {},
  appointments = [],
  selectedDay = null,
  onDayClick,
  todayStr,
}: WeekGridProps) {
  const { tokens } = useThemeStyles();

  return (
    <View style={{ gap: 12 }}>
      {weekDates.map((dateObj) => {
        const dateIso = toDateStr(dateObj);
        const isToday = dateIso === todayStr;
        const dayShifts =
          mode === 'manager' && selectedStaffId
            ? (shiftsByDate[dateIso] || []).filter((s) => (s as ShiftRecord & { employee_id?: string }).employee_id === selectedStaffId)
            : shiftsByDate[dateIso] || [];
        const timeOffStatus = timeOffByDate[dateIso];
        const isTimeOff = Boolean(timeOffStatus);
        const isWorking = dayShifts.length > 0;
        const dayAppts = appointments.filter((a) => a.appointment_time?.split('T')[0] === dateIso);
        const isSelected = selectedDay === dateIso;

        return (
          <Pressable
            key={dateIso}
            onPress={() => onDayClick(dateObj, dateIso)}
            style={{
              minHeight: 120,
              backgroundColor: isToday || isSelected ? `${tokens.goldStrong}0A` : tokens.bgSecondary,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: isToday
                ? `${tokens.goldStrong}66`
                : isSelected
                  ? tokens.goldStrong
                  : tokens.borderLight,
              padding: 12,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottomWidth: 1,
                borderBottomColor: tokens.borderLight,
                paddingBottom: 8,
                marginBottom: 8,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    letterSpacing: 1,
                    color: isToday ? tokens.goldStrong : tokens.textSecondary,
                  }}
                >
                  {DAY_LABELS[dateObj.getDay()]}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: isToday ? tokens.goldStrong : tokens.textPrimary,
                  }}
                >
                  {dateObj.getDate()}
                </Text>
              </View>
              {mode === 'employee' ? (
                <View
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    borderWidth: 1,
                    backgroundColor: isTimeOff
                      ? 'rgba(255,255,255,0.1)'
                      : isWorking
                        ? 'rgba(34, 197, 94, 0.1)'
                        : 'rgba(239, 68, 68, 0.1)',
                    borderColor: isTimeOff
                      ? 'rgba(255,255,255,0.15)'
                      : isWorking
                        ? 'rgba(34, 197, 94, 0.2)'
                        : 'rgba(239, 68, 68, 0.2)',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      color: isTimeOff ? tokens.textMuted : isWorking ? '#4ade80' : '#f87171',
                    }}
                  >
                    {isTimeOff ? 'OFF' : isWorking ? 'ON' : 'OFF'}
                  </Text>
                </View>
              ) : null}
            </View>

            {isTimeOff ? (
              <View style={{ marginBottom: 8 }}>
                <TimeOffChip status={timeOffStatus} />
              </View>
            ) : null}

            {dayShifts.length > 0 ? (
              <View style={{ gap: 6, marginBottom: 8 }}>
                {dayShifts.map((shift) => (
                  <ShiftChip key={shift.id} shift={shift} size="sm" />
                ))}
              </View>
            ) : null}

            {mode === 'employee' ? (
              <View style={{ gap: 6 }}>
                {dayAppts.slice(0, 3).map((appt) => (
                  <View
                    key={appt.id}
                    style={{
                      padding: 6,
                      borderRadius: 6,
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      borderWidth: 1,
                      borderColor: tokens.borderLight,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                      <Text numberOfLines={1} style={{ flex: 1, fontSize: 10, fontWeight: '500', color: tokens.textPrimary }}>
                        {appt.customer_name}
                      </Text>
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: APPOINTMENT_STATUS_COLORS[appt.status || ''] || '#9ca3af',
                        }}
                      />
                    </View>
                    <Text numberOfLines={1} style={{ fontSize: 10, color: tokens.goldStrong, opacity: 0.8 }}>
                      {appt.service_name}
                    </Text>
                  </View>
                ))}
                {dayAppts.length > 3 ? (
                  <Text style={{ fontSize: 9, color: tokens.goldStrong, opacity: 0.6, textAlign: 'center' }}>
                    + {dayAppts.length - 3} more
                  </Text>
                ) : null}
                {dayAppts.length === 0 && isWorking && !isTimeOff ? (
                  <Text style={{ fontSize: 10, color: tokens.textMuted, fontStyle: 'italic', textAlign: 'center' }}>
                    No assignments
                  </Text>
                ) : null}
              </View>
            ) : null}

            {mode === 'manager' && dayShifts.length === 0 && !isTimeOff ? (
              <Text style={{ fontSize: 10, color: tokens.textMuted, fontStyle: 'italic', textAlign: 'center' }}>
                No shifts
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
