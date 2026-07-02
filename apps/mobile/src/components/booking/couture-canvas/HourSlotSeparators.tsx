import { View } from 'react-native';
import {
  BOOKING_COLUMN_GAP,
  DAY_START_MINUTES,
  durationToHeight,
  getBookingColumnLeft,
  timeToOffset,
} from '@nail-couture/shared/utils/coutureTimeline.js';
import { useThemeStyles } from '../../../theme/useThemeStyles';

type HourSlot = {
  startMinutes: number;
  durationMinutes?: number;
};

type TimelineGridProps = {
  slots: HourSlot[];
  dayStartMinutes?: number;
};

function withAlpha(color: string, alpha: number) {
  const hexMatch = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    const [, r, g, b, existingAlpha = '1'] = rgbaMatch;
    const nextAlpha = Number(existingAlpha) * alpha;
    return `rgba(${r}, ${g}, ${b}, ${Math.min(1, nextAlpha).toFixed(3)})`;
  }

  return color;
}

function mixBorderAccent(borderColor: string, borderLight: string) {
  const accentMatch = borderColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  const lightMatch = borderLight.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!accentMatch || !lightMatch) return borderLight;

  const accentWeight = 0.55;
  const lightWeight = 1 - accentWeight;
  const ar = Number(accentMatch[1]);
  const ag = Number(accentMatch[2]);
  const ab = Number(accentMatch[3]);
  const aa = Number(accentMatch[4] ?? 1);
  const lr = Number(lightMatch[1]);
  const lg = Number(lightMatch[2]);
  const lb = Number(lightMatch[3]);
  const la = Number(lightMatch[4] ?? 1);

  const r = Math.round(ar * accentWeight + lr * lightWeight);
  const g = Math.round(ag * accentWeight + lg * lightWeight);
  const b = Math.round(ab * accentWeight + lb * lightWeight);
  const a = aa * accentWeight + la * lightWeight;

  return `rgba(${r}, ${g}, ${b}, ${Math.min(1, a).toFixed(3)})`;
}

export function TimelineHourBands({
  slots,
  dayStartMinutes = DAY_START_MINUTES,
}: TimelineGridProps) {
  const { tokens } = useThemeStyles();
  if (!slots.length) return null;

  return (
    <>
      {slots.map((slot, index) => (
        <View
          key={`hour-band-${slot.startMinutes}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: timeToOffset(slot.startMinutes, dayStartMinutes),
            height: durationToHeight(slot.durationMinutes ?? 60),
            backgroundColor: index % 2 === 0 ? withAlpha(tokens.bgSecondary, 0.42) : 'transparent',
            zIndex: 0,
          }}
        />
      ))}
    </>
  );
}

export function HourSlotSeparators({
  slots,
  dayStartMinutes = DAY_START_MINUTES,
}: TimelineGridProps) {
  const { tokens } = useThemeStyles();
  if (slots.length < 2) return null;

  return (
    <>
      {slots.slice(1).map((slot) => {
        const hourIndex = Math.round((slot.startMinutes - dayStartMinutes) / 60);
        const isAccent = hourIndex % 2 === 1;

        return (
          <View
            key={`slot-sep-${slot.startMinutes}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: timeToOffset(slot.startMinutes, dayStartMinutes),
              borderTopWidth: 1,
              borderTopColor: isAccent
                ? mixBorderAccent(tokens.borderColor, tokens.borderLight)
                : withAlpha(tokens.borderLight, 0.85),
              zIndex: 5,
            }}
          />
        );
      })}
    </>
  );
}

type ColumnSeparatorsProps = {
  columnCount: number;
  canvasHeight: number;
};

export function ColumnSeparators({ columnCount, canvasHeight }: ColumnSeparatorsProps) {
  const { tokens } = useThemeStyles();
  if (columnCount < 2) return null;

  return (
    <>
      {Array.from({ length: columnCount - 1 }, (_, index) => (
        <View
          key={`col-sep-${index}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: getBookingColumnLeft(index + 1) - BOOKING_COLUMN_GAP / 2,
            width: 1,
            height: canvasHeight,
            backgroundColor: withAlpha(tokens.borderLight, 0.65),
            zIndex: 4,
          }}
        />
      ))}
    </>
  );
}
