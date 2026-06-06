import { FlatList, View } from 'react-native';
import { useThemeStyles } from '../../theme/useThemeStyles';
import { TimelineEventRow, type TimelineEvent } from './TimelineEventRow';

type VirtualizedTimelineListProps = {
  events: TimelineEvent[];
  profile?: { full_name?: string; email?: string; phone?: string } | null;
};

const ESTIMATED_ROW_HEIGHT = 132;

export function VirtualizedTimelineList({ events, profile = null }: VirtualizedTimelineListProps) {
  const styles = useThemeStyles();

  if (!events.length) return null;

  return (
    <View
      style={{
        maxHeight: 640,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: styles.tokens.borderLight,
        overflow: 'hidden',
      }}
    >
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 4, paddingBottom: 12 }}>
            <TimelineEventRow event={item} profile={profile} />
          </View>
        )}
        getItemLayout={(_, index) => ({
          length: ESTIMATED_ROW_HEIGHT,
          offset: ESTIMATED_ROW_HEIGHT * index,
          index,
        })}
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        windowSize={8}
        removeClippedSubviews
        showsVerticalScrollIndicator
        contentContainerStyle={{ padding: 4, paddingTop: 8 }}
      />
    </View>
  );
}
