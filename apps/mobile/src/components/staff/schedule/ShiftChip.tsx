import { Pressable, Text, View } from 'react-native';
import { Icon } from '../../icons/Icon';
import { formatTime } from '@nail-couture/shared/utils/scheduleUtils.js';
import { getShiftChipStyle } from './constants';

export type ShiftRecord = {
  id: string;
  shift_type: string;
  start_time: string;
  end_time: string;
};

type ShiftChipProps = {
  shift: ShiftRecord;
  size?: 'sm' | 'md';
  onDelete?: (shiftId: string) => void;
};

export function ShiftChip({ shift, size = 'sm', onDelete }: ShiftChipProps) {
  const chipStyle = getShiftChipStyle(shift.shift_type);
  const compact = size === 'sm';

  return (
    <View
      style={{
        borderRadius: compact ? 8 : 12,
        borderWidth: 1,
        paddingHorizontal: compact ? 8 : 12,
        paddingVertical: compact ? 6 : 10,
        backgroundColor: chipStyle.backgroundColor,
        borderColor: chipStyle.borderColor,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Text
          style={{
            color: chipStyle.color,
            fontWeight: '600',
            fontSize: compact ? 10 : 14,
            textTransform: 'capitalize',
          }}
        >
          {shift.shift_type}
        </Text>
        {onDelete ? (
          <Pressable onPress={() => onDelete(shift.id)} hitSlop={8} accessibilityLabel="Remove shift">
            <Icon name="close" size={16} color={chipStyle.color} />
          </Pressable>
        ) : null}
      </View>
      <Text style={{ color: chipStyle.color, opacity: 0.7, fontSize: compact ? 10 : 12, marginTop: 2 }}>
        {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
      </Text>
    </View>
  );
}
