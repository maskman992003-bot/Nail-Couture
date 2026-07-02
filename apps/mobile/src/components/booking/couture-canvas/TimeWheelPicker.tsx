import { useCallback, useEffect, useRef } from 'react';
import { FlatList, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { formatTimeShort } from '@nail-couture/shared/utils/coutureTimeline.js';
import { COUTURE_COLORS } from './constants';

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const PERIODS = ['AM', 'PM'];

type WheelColumnProps = {
  data: (string | number)[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  formatItem?: (item: string | number) => string;
};

function WheelColumn({ data, selectedIndex, onSelect, formatItem }: WheelColumnProps) {
  const listRef = useRef<FlatList>(null);
  const paddingVertical = (PICKER_HEIGHT - ITEM_HEIGHT) / 2;

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: selectedIndex * ITEM_HEIGHT, animated: false });
  }, [selectedIndex]);

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(data.length - 1, index));
      onSelect(clamped);
      listRef.current?.scrollToOffset({ offset: clamped * ITEM_HEIGHT, animated: true });
    },
    [data.length, onSelect],
  );

  return (
    <View style={{ height: PICKER_HEIGHT, flex: 1 }}>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(item, index) => `${item}-${index}`}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={{ paddingVertical }}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        renderItem={({ item, index }) => {
          const isSelected = index === selectedIndex;
          const label = formatItem ? formatItem(item) : String(item).padStart(2, '0');
          return (
            <View style={{ height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
              <Text
                style={{
                  fontSize: isSelected ? 20 : 16,
                  fontWeight: isSelected ? '600' : '400',
                  color: isSelected ? '#F9F9F9' : COUTURE_COLORS.textMuted,
                }}
              >
                {label}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

type TimeWheelPickerProps = {
  timeMinutes: number;
  onChange: (timeMinutes: number) => void;
};

function parseTimeMinutes(totalMinutes: number) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  const minuteIndex = Math.round(minutes / 5) % 12;
  return {
    hourIndex: HOURS.indexOf(hours12),
    minuteIndex: minuteIndex >= 0 ? minuteIndex : 0,
    periodIndex: period === 'PM' ? 1 : 0,
  };
}

function buildTimeMinutes(hourIndex: number, minuteIndex: number, periodIndex: number) {
  let hours12 = HOURS[hourIndex] ?? 12;
  const minutes = MINUTES[minuteIndex] ?? 0;
  const period = PERIODS[periodIndex] ?? 'AM';
  if (period === 'PM' && hours12 !== 12) hours12 += 12;
  if (period === 'AM' && hours12 === 12) hours12 = 0;
  return hours12 * 60 + minutes;
}

export function TimeWheelPicker({ timeMinutes, onChange }: TimeWheelPickerProps) {
  const parsed = parseTimeMinutes(timeMinutes);

  const update = (hourIndex: number, minuteIndex: number, periodIndex: number) => {
    onChange(buildTimeMinutes(hourIndex, minuteIndex, periodIndex));
  };

  return (
    <View style={{ position: 'relative' }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: (PICKER_HEIGHT - ITEM_HEIGHT) / 2,
          left: 8,
          right: 8,
          height: ITEM_HEIGHT,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: COUTURE_COLORS.glassBorder,
          backgroundColor: 'rgba(255,255,255,0.04)',
          zIndex: 1,
        }}
      />
      <View style={{ flexDirection: 'row', height: PICKER_HEIGHT }}>
        <WheelColumn
          data={HOURS}
          selectedIndex={parsed.hourIndex >= 0 ? parsed.hourIndex : 0}
          onSelect={(index) => update(index, parsed.minuteIndex, parsed.periodIndex)}
        />
        <WheelColumn
          data={MINUTES}
          selectedIndex={parsed.minuteIndex}
          onSelect={(index) => update(parsed.hourIndex >= 0 ? parsed.hourIndex : 0, index, parsed.periodIndex)}
          formatItem={(m) => String(m).padStart(2, '0')}
        />
        <WheelColumn
          data={PERIODS}
          selectedIndex={parsed.periodIndex}
          onSelect={(index) => update(parsed.hourIndex >= 0 ? parsed.hourIndex : 0, parsed.minuteIndex, index)}
        />
      </View>
      <Text style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: COUTURE_COLORS.textSecondary }}>
        Selected: {formatTimeShort(timeMinutes)}
      </Text>
    </View>
  );
}
