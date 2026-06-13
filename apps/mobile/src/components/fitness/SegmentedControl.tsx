import { Pressable, Text, View, type ViewStyle } from 'react-native';
import { useThemeStyles } from '../../theme/useThemeStyles';

type Tab = { id: string; label: string };

type SegmentedControlProps = {
  tabs: Tab[];
  value: string;
  onChange: (id: string) => void;
  style?: ViewStyle;
};

export function SegmentedControl({ tabs, value, onChange, style }: SegmentedControlProps) {
  const styles = useThemeStyles();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          gap: 4,
          backgroundColor: styles.tokens.bgSecondary,
          borderRadius: 12,
          padding: 4,
          borderWidth: 1,
          borderColor: styles.tokens.borderLight,
        },
        style,
      ]}
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={{
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 8,
              backgroundColor: active ? styles.tokens.goldStrong : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: active ? '#121212' : styles.tokens.textSecondary,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
