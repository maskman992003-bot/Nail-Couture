import { Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useThemeStyles } from '../../theme/useThemeStyles';

type BarChartProps = {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
};

export function SimpleBarChart({ data, height = 160, color }: BarChartProps) {
  const styles = useThemeStyles();
  const barColor = color || styles.tokens.goldStrong;
  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.min(48, Math.floor(280 / Math.max(data.length, 1)));

  return (
    <View>
      <Svg width="100%" height={height}>
        {data.map((item, i) => {
          const barHeight = (item.value / max) * (height - 24);
          const x = i * (barWidth + 12) + 8;
          const y = height - barHeight - 8;
          return (
            <Rect
              key={item.label}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={barColor}
              rx={4}
            />
          );
        })}
      </Svg>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {data.map((item) => (
          <View key={item.label} style={{ alignItems: 'center', minWidth: barWidth }}>
            <Text style={[styles.textSecondary, { fontSize: 10 }]} numberOfLines={1}>
              {item.label}
            </Text>
            <Text style={[styles.textPrimary, { fontSize: 11, fontWeight: '600' }]}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
