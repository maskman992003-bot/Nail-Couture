import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Icon } from '../../icons/Icon';
import { COUTURE_COLORS, HEADING_FONT } from './constants';
import { formatSelectedDateLabel, WeekDateStrip } from './WeekDateStrip';
import { StaffFilterPill } from './StaffFilterPill';
import { MonthDatePickerModal } from './MonthDatePickerModal';
import type { CanvasStaffMember } from './types';

type CoutureCanvasHeaderProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  staff: CanvasStaffMember[];
  selectedStaffId: string | null;
  onSelectStaff: (staffId: string | null) => void;
  onSearchPress?: () => void;
};

export function CoutureCanvasHeader({
  selectedDate,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
  onToday,
  staff,
  selectedStaffId,
  onSelectStaff,
  onSearchPress,
}: CoutureCanvasHeaderProps) {
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  return (
    <View style={{ paddingBottom: 8 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 12,
        }}
      >
        <Text style={{ fontFamily: HEADING_FONT, fontSize: 26, color: '#F9F9F9', letterSpacing: 0.5 }}>
          Nail Couture
        </Text>
        <Pressable
          onPress={onSearchPress}
          hitSlop={12}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderWidth: 1,
            borderColor: COUTURE_COLORS.glassBorder,
          }}
        >
          <Icon name="search" size={18} color={COUTURE_COLORS.textSecondary} />
        </Pressable>
      </View>

      <WeekDateStrip
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        onPrevWeek={onPrevWeek}
        onNextWeek={onNextWeek}
        onToday={onToday}
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          marginTop: 8,
        }}
      >
        <Pressable onPress={() => setMonthPickerOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 13, color: COUTURE_COLORS.textSecondary }}>{formatSelectedDateLabel(selectedDate)}</Text>
          <Text style={{ fontSize: 10, color: COUTURE_COLORS.textMuted }}>▼</Text>
        </Pressable>
        <StaffFilterPill staff={staff} selectedStaffId={selectedStaffId} onSelectStaff={onSelectStaff} />
      </View>

      <MonthDatePickerModal
        open={monthPickerOpen}
        onClose={() => setMonthPickerOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
      />
    </View>
  );
}
