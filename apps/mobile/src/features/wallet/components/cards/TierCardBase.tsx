import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTiltSensor } from '../../hooks/useTiltSensor';

type TierCardBaseProps = {
  width: number;
  height: number;
  gradientStops: Array<{ offset: string; color: string }>;
  borderColors?: [string, string];
  children?: ReactNode;
  glowFounding?: boolean;
  onConciergePress?: () => void;
  title: string;
  subtitle?: string;
  titleColor?: string;
};

export function TierCardBase({
  width,
  height,
  gradientStops,
  borderColors = ['#C5A059', '#8B6914'],
  children,
  glowFounding = false,
  onConciergePress,
  title,
  subtitle,
  titleColor = '#2A2A2A',
}: TierCardBaseProps) {
  const { tiltX, tiltY } = useTiltSensor(true);
  const shiftX = tiltX * 12;
  const shiftY = tiltY * 8;

  return (
    <View
      style={[
        styles.wrap,
        {
          width,
          height,
          borderColor: glowFounding ? '#C5A059' : `${borderColors[0]}66`,
          shadowColor: glowFounding ? '#C5A059' : '#000',
          shadowOpacity: glowFounding ? 0.55 : 0.25,
          shadowRadius: glowFounding ? 12 : 6,
        },
      ]}
    >
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="cardGrad" x1={`${50 + shiftX}%`} y1={`${30 + shiftY}%`} x2={`${70 + shiftX}%`} y2={`${90 + shiftY}%`}>
            {gradientStops.map((s) => (
              <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
            ))}
          </LinearGradient>
          <LinearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={borderColors[0]} />
            <Stop offset="100%" stopColor={borderColors[1]} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} rx={16} fill="url(#cardGrad)" />
        <Rect x={1} y={1} width={width - 2} height={height - 2} rx={15} stroke="url(#edgeGrad)" strokeWidth={2} fill="none" />
      </Svg>

      <View style={styles.content}>
        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: titleColor, opacity: 0.75 }]}>{subtitle}</Text> : null}
        {children}
        {onConciergePress ? (
          <Pressable onPress={onConciergePress} style={styles.conciergeBtn}>
            <Text style={styles.conciergeText}>Concierge</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  conciergeBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(197,160,89,0.35)',
    borderWidth: 1,
    borderColor: '#C5A059',
  },
  conciergeText: {
    color: '#F5E6C8',
    fontWeight: '700',
    letterSpacing: 2,
    fontSize: 11,
  },
});
