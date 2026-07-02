import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  addMonths,
  DAY_LABELS,
  getMonthGrid,
  getMonthLabel,
  isToday,
  toDateStr,
} from '@nail-couture/shared/utils/scheduleUtils.js';
import { AppModal } from '../../AppModal';
import { COUTURE_COLORS } from './constants';

type MonthDatePickerModalProps = {
  open: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
};

export function MonthDatePickerModal({
  open,
  onClose,
  selectedDate,
  onSelectDate,
}: MonthDatePickerModalProps) {
  const [viewDate, setViewDate] = useState(selectedDate);

  useEffect(() => {
    if (open) setViewDate(selectedDate);
  }, [open, selectedDate]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const cells = getMonthGrid(viewYear, viewMonth);
  const paddedCells = [...cells];
  while (paddedCells.length < 42) paddedCells.push(null);
  const selectedStr = toDateStr(selectedDate);
  const cellSize = 40;

  return (
    <AppModal open={open} onClose={onClose} title={getMonthLabel(viewYear, viewMonth)} maxPanelWidth={340}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Pressable
          onPress={() => setViewDate(addMonths(viewDate, -1))}
          hitSlop={12}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <Text style={{ color: COUTURE_COLORS.textSecondary, fontSize: 18 }}>‹</Text>
        </Pressable>
        <Pressable
          onPress={() => setViewDate(addMonths(viewDate, 1))}
          hitSlop={12}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <Text style={{ color: COUTURE_COLORS.textSecondary, fontSize: 18 }}>›</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {DAY_LABELS.map((day) => (
          <View key={day} style={{ width: '14.28%', height: 24, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 10, color: COUTURE_COLORS.textMuted, fontWeight: '600' }}>{day}</Text>
          </View>
        ))}
        {paddedCells.map((cell, index) => {
          if (!cell) {
            return <View key={`empty-${index}`} style={{ width: '14.28%', height: cellSize }} />;
          }
          const dateStr = toDateStr(cell);
          const isSelected = dateStr === selectedStr;
          const isTodayDate = isToday(dateStr);
          return (
            <Pressable
              key={dateStr}
              onPress={() => {
                onSelectDate(cell);
                onClose();
              }}
              style={{
                width: '14.28%',
                height: cellSize,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
                backgroundColor: isSelected ? COUTURE_COLORS.gold : 'transparent',
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: isSelected || isTodayDate ? '700' : '500',
                  color: isSelected ? '#1A1A1A' : isTodayDate ? COUTURE_COLORS.gold : COUTURE_COLORS.textSecondary,
                }}
              >
                {cell.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </AppModal>
  );
}
