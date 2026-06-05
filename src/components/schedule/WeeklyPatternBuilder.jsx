import { useState } from 'react';
import {
  DAY_LABELS,
  SHIFT_TYPES,
  SHIFT_COLORS,
  PATTERN_PRESETS,
  emptyWeekPattern,
  getSlotShiftType,
  normalizeSlot,
  createSlot,
  formatTime,
} from '../../utils/scheduleUtils';
import CustomShiftTimeModal from './CustomShiftTimeModal';

const CHIP_OPTIONS = [
  { key: 'off', value: null, label: 'Off' },
  ...SHIFT_TYPES.map((t) => ({ key: t.value, value: t.value, label: t.short })),
];

function PatternDayColumn({ dayIdx, value, onChange }) {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const activeType = getSlotShiftType(value);
  const normalized = normalizeSlot(value);

  const handleChipClick = (opt) => {
    if (opt.value === null) {
      onChange(null);
      return;
    }
    if (opt.value === 'custom') {
      onChange(createSlot('custom'));
      setShowCustomModal(true);
      return;
    }
    onChange(createSlot(opt.value));
  };

  const handleCustomSave = (startTime, endTime) => {
    onChange({ shift_type: 'custom', start_time: startTime, end_time: endTime });
    setShowCustomModal(false);
  };

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-secondary text-center">
        {DAY_LABELS[dayIdx]}
      </span>
      <div className="flex flex-wrap justify-center gap-1">
        {CHIP_OPTIONS.map((opt) => {
          const isActive = opt.value === null ? !activeType : activeType === opt.value;
          const colorClass = opt.value && isActive
            ? SHIFT_COLORS[opt.value] || SHIFT_COLORS.custom
            : isActive && opt.value === null
              ? 'bg-white/10 text-secondary border-light'
              : 'border-light bg-secondary text-muted hover:border-white/20 hover:text-secondary';

          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => handleChipClick(opt)}
              className={`px-1.5 py-1 rounded-lg border text-[9px] sm:text-[10px] font-semibold transition-all ${colorClass}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {activeType && normalized && (
        <p className="text-[9px] text-muted text-center leading-tight">
          {formatTime(normalized.start_time)}–{formatTime(normalized.end_time)}
        </p>
      )}
      <CustomShiftTimeModal
        open={showCustomModal}
        title={`${DAY_LABELS[dayIdx]} · Custom shift`}
        startTime={normalized?.start_time || '09:00'}
        endTime={normalized?.end_time || '17:00'}
        onSave={handleCustomSave}
        onClose={() => setShowCustomModal(false)}
      />
    </div>
  );
}

export default function WeeklyPatternBuilder({
  pattern,
  onChange,
  onLoadRoleDefault,
  roleLabel,
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-secondary">
          Draft only — shifts are saved when you click Apply to month.
        </p>
        <div className="flex flex-wrap gap-2">
          {onLoadRoleDefault && (
            <button
              type="button"
              onClick={onLoadRoleDefault}
              className="text-xs px-3 py-1.5 rounded-lg border border-light text-secondary hover:text-gold hover:border-gold/30 transition-colors"
            >
              Load {roleLabel} default
            </button>
          )}
          <button
            type="button"
            onClick={() => onChange(emptyWeekPattern())}
            className="text-xs text-secondary hover:text-red-400 transition-colors"
          >
            Clear all
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {PATTERN_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange([...preset.pattern])}
            className="px-3 py-1.5 rounded-full text-xs border border-light text-secondary hover:border-gold/30 hover:text-gold transition-all"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2 sm:gap-3">
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
      </div>
    </div>
  );
}
