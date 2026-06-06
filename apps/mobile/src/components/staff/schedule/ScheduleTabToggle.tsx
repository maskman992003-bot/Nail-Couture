import { Pressable, Text, View } from 'react-native';
import { useThemeStyles } from '../../../theme/useThemeStyles';

export type ScheduleTab = {
  id: string;
  label: string;
  badge?: number;
};

type ScheduleTabToggleProps = {
  tabs: ScheduleTab[];
  activeTab: string;
  onChange: (tabId: string) => void;
};

export function ScheduleTabToggle({ tabs, activeTab, onChange }: ScheduleTabToggleProps) {
  const { tokens } = useThemeStyles();

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 4,
        backgroundColor: tokens.bgSecondary,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: tokens.borderLight,
        padding: 4,
      }}
    >
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={{
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 8,
              backgroundColor: active ? tokens.goldStrong : 'transparent',
              position: 'relative',
            }}
          >
            <Text
              style={{
                textAlign: 'center',
                fontSize: 13,
                fontWeight: '500',
                color: active ? '#121212' : tokens.textSecondary,
              }}
            >
              {tab.label}
            </Text>
            {tab.badge != null && tab.badge > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -4,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: tokens.goldStrong,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#121212' }}>{tab.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
