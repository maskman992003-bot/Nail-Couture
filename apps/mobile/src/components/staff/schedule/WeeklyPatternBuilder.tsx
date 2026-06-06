import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  DAY_LABELS,
  PATTERN_PRESETS,
  SHIFT_TYPES,
  createSlot,
  emptyWeekPattern,
  formatTime,
  getSlotShiftType,
  normalizeSlot,
} from '@nail-couture/shared/utils/scheduleUtils.js';
import { useThemeStyles } from '../../../theme/useThemeStyles';
import { getShiftChipStyle } from './constants';
import { CustomShiftTimeModal } from './CustomShiftTimeModal';

type PatternSlot = string | { shift_type: string; start_time: string; end_time: string } | null;

const CHIP_OPTIONS = [
  { key: 'off', value: null as PatternSlot, label: 'Off' },
  ...SHIFT_TYPES.map((t) => ({ key: t.value, value: t.value as PatternSlot, label: t.short })),
];

type PatternDayColumnProps = {
  dayIdx: number;
  value: PatternSlot;
  onChange: (val: PatternSlot) => void;
};

function PatternDayColumn({ dayIdx, value, onChange }: PatternDayColumnProps) {
  const styles = useThemeStyles();
  const [showCustomModal, setShowCustomModal] = useState(false);
  const activeType = getSlotShiftType(value);
  const normalized = normalizeSlot(value);

  const handleChipClick = (opt: (typeof CHIP_OPTIONS)[number]) => {
    if (opt.value === null) {
      onChange(null);
      return;
    }
    if (opt.value === 'custom') {
      onChange(createSlot('custom'));
      setShowCustomModal(true);
      return;
    }
    onChange(createSlot(opt.value as string));
  };

  return (
    <View style={{ gap: 8, minWidth: 80, flex: 1 }}>
      <Text
        style={[
          styles.textSecondary,
          { fontSize: 10, fontWeight: '700', textAlign: 'center', letterSpacing: 1 },
        ]}
      >
        {DAY_LABELS[dayIdx]}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4 }}>
        {CHIP_OPTIONS.map((opt) => {
          const isActive = opt.value === null ? !activeType : activeType === opt.value;
          const chipStyle =
            opt.value && isActive ? getShiftChipStyle(opt.value as string) : null;

          return (
            <Pressable
              key={opt.key}
              onPress={() => handleChipClick(opt)}
              style={{
                paddingHorizontal: 6,
                paddingVertical: 4,
                borderRadius: 8,
                borderWidth: 1,
                backgroundColor: chipStyle?.backgroundColor ?? (isActive && opt.value === null ? 'rgba(255,255,255,0.1)' : styles.tokens.bgSecondary),
                borderColor: chipStyle?.borderColor ?? (isActive ? styles.tokens.borderLight : styles.tokens.borderLight),
              }}
            >
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: '600',
                  color: chipStyle?.color ?? (isActive ? styles.tokens.textSecondary : styles.tokens.textMuted),
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {activeType && normalized ? (
        <Text style={[styles.textSecondary, { fontSize: 9, textAlign: 'center' }]}>
          {formatTime(normalized.start_time)}–{formatTime(normalized.end_time)}
        </Text>
      ) : null}
      <CustomShiftTimeModal
        open={showCustomModal}
        title={`${DAY_LABELS[dayIdx]} · Custom shift`}
        startTime={normalized?.start_time || '09:00'}
        endTime={normalized?.end_time || '17:00'}
        onSave={(startTime, endTime) => {
          onChange({ shift_type: 'custom', start_time: startTime, end_time: endTime });
          setShowCustomModal(false);
        }}
        onClose={() => setShowCustomModal(false)}
      />
    </View>
  );
}

type WeeklyPatternBuilderProps = {
  pattern: PatternSlot[];
  onChange: (pattern: PatternSlot[]) => void;
  onLoadRoleDefault?: () => void;
  roleLabel?: string;
};

export function WeeklyPatternBuilder({
  pattern,
  onChange,
  onLoadRoleDefault,
  roleLabel,
}: WeeklyPatternBuilderProps) {
  const styles = useThemeStyles();

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
        <Text style={[styles.textSecondary, { fontSize: 12, flex: 1 }]}>
          Draft only — shifts are saved when you click Apply to month.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {onLoadRoleDefault && roleLabel ? (
            <Pressable
              onPress={onLoadRoleDefault}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: styles.tokens.borderLight,
              }}
            >
              <Text style={[styles.textSecondary, { fontSize: 12 }]}>Load {roleLabel} default</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => onChange(emptyWeekPattern())}>
            <Text style={{ fontSize: 12, color: '#f87171' }}>Clear all</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {PATTERN_PRESETS.map((preset) => (
            <Pressable
              key={preset.id}
              onPress={() => onChange([...preset.pattern])}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: styles.tokens.borderLight,
              }}
            >
              <Text style={[styles.textSecondary, { fontSize: 12 }]}>{preset.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {DAY_LABELS.map((_, dayIdx) => (
          <PatternDayColumn
            key={dayIdx}
            dayIdx={dayIdx}
            value={pattern[dayIdx]}
            onChange={(val) => {
              const next = [...pattern];
              next[dayIdx] = val;
              onChange(next);
            }}
          />
        ))}
      </View>
    </View>
  );
}
