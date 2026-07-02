import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { ScrollView, View } from 'react-native';
import { getSalonDayBounds } from '@nail-couture/shared/constants/salonHours.js';
import { toDateStr } from '@nail-couture/shared/utils/scheduleUtils.js';
import {
  computeHourSlotCounts,
  getHourSlotCountMap,
  dateToMinutes,
  getAppointmentTimelineRange,
  getCanvasHeight,
  getTimelineColumnsWidth,
  layoutTimelineAppointments,
  minutesFromMidnight,
} from '@nail-couture/shared/utils/coutureTimeline.js';
import { BookingCard } from './BookingCard';
import { CurrentTimeIndicator } from './CurrentTimeIndicator';
import { ColumnSeparators, HourSlotSeparators, TimelineHourBands } from './HourSlotSeparators';
import { TimelineAxis } from './TimelineAxis';
import type { CanvasAppointment } from './types';

type ProportionalTimelineProps = {
  selectedDate: Date;
  appointments: CanvasAppointment[];
  onHourSlotPress: (startMinutes: number, durationMinutes: number) => void;
  onAppointmentPress?: (appointment: CanvasAppointment) => void;
  scrollRef?: RefObject<ScrollView | null>;
};

export function ProportionalTimeline({
  selectedDate,
  appointments,
  onHourSlotPress,
  onAppointmentPress,
  scrollRef,
}: ProportionalTimelineProps) {
  const internalRef = useRef<ScrollView>(null);
  const hasAutoScrolledRef = useRef(false);
  const resolvedRef = scrollRef ?? internalRef;

  const { dayStartMinutes, dayEndMinutes } = useMemo(
    () => getSalonDayBounds(selectedDate),
    [selectedDate],
  );

  const canvasHeight = getCanvasHeight(dayStartMinutes, dayEndMinutes);

  const appointmentRanges = useMemo(
    () =>
      appointments
        .map((a) => {
          const start = dateToMinutes(a.startAt);
          return getAppointmentTimelineRange(start, a.durationMinutes, dayStartMinutes, dayEndMinutes);
        })
        .filter(Boolean),
    [appointments, dayStartMinutes, dayEndMinutes],
  );

  const laidOutAppointments = useMemo(
    () =>
      layoutTimelineAppointments(
        appointments,
        (a) => dateToMinutes(a.startAt),
        (a) => a.durationMinutes,
        dayStartMinutes,
        dayEndMinutes,
      ),
    [appointments, dayStartMinutes, dayEndMinutes],
  );

  const hourSlotCounts = useMemo(
    () => computeHourSlotCounts(appointmentRanges, dayStartMinutes, dayEndMinutes),
    [appointmentRanges, dayStartMinutes, dayEndMinutes],
  );

  const slotCountByStart = useMemo(
    () => getHourSlotCountMap(hourSlotCounts),
    [hourSlotCounts],
  );

  const appointmentColumns = useMemo(
    () => (laidOutAppointments.length
      ? Math.max(...laidOutAppointments.map((item) => item.columnCount))
      : 1),
    [laidOutAppointments],
  );
  const columnsWidth = getTimelineColumnsWidth(appointmentColumns);

  const isToday = toDateStr(selectedDate) === toDateStr(new Date());

  useEffect(() => {
    hasAutoScrolledRef.current = false;
  }, [selectedDate]);

  useEffect(() => {
    if (!isToday || hasAutoScrolledRef.current) return;
    const nowMinutes = minutesFromMidnight(new Date());
    const offset = (nowMinutes - dayStartMinutes) * 2.5 - 120;
    if (offset > 0) {
      setTimeout(() => {
        resolvedRef.current?.scrollTo({ y: Math.max(0, offset), animated: false });
        hasAutoScrolledRef.current = true;
      }, 100);
    }
  }, [isToday, selectedDate, resolvedRef, dayStartMinutes]);

  return (
    <ScrollView
      ref={resolvedRef}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: 'row', minHeight: canvasHeight + 40 }}>
        <TimelineAxis
          dayStartMinutes={dayStartMinutes}
          dayEndMinutes={dayEndMinutes}
          slotCountByStart={slotCountByStart}
          hourSlots={hourSlotCounts}
          onHourSlotPress={onHourSlotPress}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 8 }}
        >
          <View style={{ width: columnsWidth, height: canvasHeight, position: 'relative' }}>
            <TimelineHourBands slots={hourSlotCounts} dayStartMinutes={dayStartMinutes} />
            <HourSlotSeparators slots={hourSlotCounts} dayStartMinutes={dayStartMinutes} />
            <ColumnSeparators columnCount={appointmentColumns} canvasHeight={canvasHeight} />
            {isToday ? (
              <CurrentTimeIndicator dayStartMinutes={dayStartMinutes} dayEndMinutes={dayEndMinutes} />
            ) : null}
            {laidOutAppointments.map((item) => (
              <BookingCard
                key={item.appointment.id}
                appointment={item.appointment}
                columnIndex={item.columnIndex}
                dayStartMinutes={dayStartMinutes}
                dayEndMinutes={dayEndMinutes}
                onPress={onAppointmentPress}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );
}
