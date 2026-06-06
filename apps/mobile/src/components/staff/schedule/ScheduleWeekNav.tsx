import { Pressable, Text, View } from 'react-native';
import { Icon } from '../../icons/Icon';
import { useThemeStyles } from '../../../theme/useThemeStyles';

type ScheduleWeekNavProps = {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday?: () => void;
  showToday?: boolean;
};

export function ScheduleWeekNav({
  label,
  onPrev,
  onNext,
  onToday,
  showToday = true,
}: ScheduleWeekNavProps) {
  const { tokens } = useThemeStyles();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      {showToday && onToday ? (
        <Pressable
          onPress={onToday}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: tokens.borderLight,
            backgroundColor: tokens.bgSecondary,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '500', color: tokens.goldStrong }}>Today</Text>
        </Pressable>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: tokens.bgSecondary,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: tokens.borderLight,
          padding: 2,
        }}
      >
        <Pressable onPress={onPrev} style={{ padding: 8 }} accessibilityLabel="Previous week">
          <Icon name="chevronLeft" size={20} color={tokens.textSecondary} />
        </Pressable>
        <Text
          style={{
            paddingHorizontal: 12,
            fontSize: 12,
            fontWeight: '500',
            color: tokens.textPrimary,
            minWidth: 120,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
        <Pressable onPress={onNext} style={{ padding: 8 }} accessibilityLabel="Next week">
          <Icon name="chevronRight" size={20} color={tokens.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}
