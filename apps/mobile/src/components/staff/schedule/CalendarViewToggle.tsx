import { Pressable, Text, View } from 'react-native';
import { useThemeStyles } from '../../../theme/useThemeStyles';

export type CalendarViewMode = 'month' | 'week';

type CalendarViewToggleProps = {
  view: CalendarViewMode;
  onChange: (view: CalendarViewMode) => void;
};

export function CalendarViewToggle({ view, onChange }: CalendarViewToggleProps) {
  const { tokens } = useThemeStyles();
  const options: { id: CalendarViewMode; label: string }[] = [
    { id: 'month', label: 'Month' },
    { id: 'week', label: 'Week' },
  ];

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: tokens.bgSecondary,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: tokens.borderLight,
        padding: 2,
      }}
    >
      {options.map((opt) => {
        const active = view === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 6,
              backgroundColor: active ? tokens.goldStrong : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '500',
                color: active ? '#121212' : tokens.textSecondary,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
