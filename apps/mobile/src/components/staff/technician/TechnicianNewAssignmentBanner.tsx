import { Pressable, Text, View } from 'react-native';
import { useThemeStyles } from '../../../theme/useThemeStyles';
import type { NewAssignmentBannerItem } from './types';

type TechnicianNewAssignmentBannerProps = {
  assignments?: NewAssignmentBannerItem[];
  onView: () => void;
  onDismissAll: () => void;
};

export function TechnicianNewAssignmentBanner({
  assignments = [],
  onView,
  onDismissAll,
}: TechnicianNewAssignmentBannerProps) {
  const styles = useThemeStyles();

  if (assignments.length === 0) return null;

  const label =
    assignments.length === 1
      ? `New client assigned: ${assignments[0].name}`
      : `${assignments.length} new assignments`;

  return (
    <View
      style={{
        padding: 16,
        backgroundColor: styles.tokens.goldStrong,
        borderRadius: 16,
        marginBottom: 16,
        gap: 12,
      }}
    >
      <Text style={{ color: '#121212', fontWeight: '600', fontSize: 14 }} numberOfLines={2}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          onPress={onView}
          style={{
            flex: 1,
            backgroundColor: '#121212',
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: styles.tokens.goldStrong, fontWeight: '600', fontSize: 14 }}>
            View assignments
          </Text>
        </Pressable>
        <Pressable onPress={onDismissAll} hitSlop={8} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={{ color: '#121212', fontSize: 22, opacity: 0.7 }}>×</Text>
        </Pressable>
      </View>
    </View>
  );
}
