import { Text, View } from 'react-native';

type TimeOffChipProps = {
  status?: 'approved' | 'pending' | 'rejected' | string;
  size?: 'sm' | 'md';
};

export function TimeOffChip({ status = 'approved', size = 'sm' }: TimeOffChipProps) {
  const isPending = status === 'pending';
  const compact = size === 'sm';

  return (
    <View
      style={{
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: compact ? 6 : 8,
        paddingVertical: compact ? 3 : 4,
        backgroundColor: isPending ? 'rgba(234, 179, 8, 0.1)' : 'rgba(255, 255, 255, 0.04)',
        borderColor: isPending ? 'rgba(234, 179, 8, 0.25)' : 'rgba(255, 255, 255, 0.15)',
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontSize: compact ? 9 : 10,
          fontWeight: '500',
          color: isPending ? 'rgba(250, 204, 21, 0.9)' : 'rgba(249, 249, 249, 0.5)',
        }}
      >
        {isPending ? 'Pending off' : 'Time off'}
      </Text>
    </View>
  );
}
