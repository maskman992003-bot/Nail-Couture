import { Pressable, Switch, Text, View } from 'react-native';
import { getMonthLabel, ROLE_LABELS } from '@nail-couture/shared/utils/scheduleUtils.js';
import { ScrollSelect } from '../../forms/ScrollSelect';
import { Icon } from '../../icons/Icon';
import { useThemeStyles } from '../../../theme/useThemeStyles';
import type { StaffMember } from './ScheduleTeamPicker';

type BulkApplyPanelProps = {
  viewYear: number;
  viewMonth: number;
  isCurrentMonth: boolean;
  previewCount: number;
  bulkTarget: string;
  replaceExisting: boolean;
  selectedMember: StaffMember;
  applying: boolean;
  applyMessage: string;
  applyError: string;
  monthShiftCount: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onBulkTargetChange: (target: string) => void;
  onReplaceExistingChange: (replace: boolean) => void;
  onApply: () => void;
  onClear: () => void;
};

export function BulkApplyPanel({
  viewYear,
  viewMonth,
  isCurrentMonth,
  previewCount,
  bulkTarget,
  replaceExisting,
  selectedMember,
  applying,
  applyMessage,
  applyError,
  monthShiftCount,
  onPrevMonth,
  onNextMonth,
  onToday,
  onBulkTargetChange,
  onReplaceExistingChange,
  onApply,
  onClear,
}: BulkApplyPanelProps) {
  const styles = useThemeStyles();

  const bulkOptions = [
    { value: 'selected', label: `Only ${selectedMember.full_name}` },
    {
      value: 'role',
      label: `All ${ROLE_LABELS[selectedMember.role as keyof typeof ROLE_LABELS] || selectedMember.role}s`,
    },
    { value: 'all', label: 'Entire team' },
  ];

  return (
    <View
      style={{
        gap: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: `${styles.tokens.goldStrong}33`,
        borderStyle: 'dashed',
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Pressable
          onPress={onPrevMonth}
          style={{
            padding: 8,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: styles.tokens.borderLight,
          }}
        >
          <Icon name="chevronLeft" size={20} color={styles.tokens.textSecondary} />
        </Pressable>
        <Text style={[styles.textPrimary, { fontSize: 16, fontWeight: '600', minWidth: 140, textAlign: 'center' }]}>
          {getMonthLabel(viewYear, viewMonth)}
        </Text>
        <Pressable
          onPress={onNextMonth}
          style={{
            padding: 8,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: styles.tokens.borderLight,
          }}
        >
          <Icon name="chevronRight" size={20} color={styles.tokens.textSecondary} />
        </Pressable>
        {!isCurrentMonth ? (
          <Pressable
            onPress={onToday}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: `${styles.tokens.goldStrong}33`,
            }}
          >
            <Text style={[styles.textGold, { fontSize: 12 }]}>Today</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.textSecondary}>
        Pattern fills <Text style={styles.textGold}>{previewCount}</Text> days in this month
      </Text>

      <View style={{ gap: 12 }}>
        <View>
          <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, marginBottom: 6 }]}>
            APPLY TO
          </Text>
          <ScrollSelect
            value={bulkTarget}
            onChange={onBulkTargetChange}
            options={bulkOptions}
            placeholder="Apply to"
          />
        </View>
        <View
          style={[
            styles.card,
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 12,
            },
          ]}
        >
          <Switch
            value={replaceExisting}
            onValueChange={onReplaceExistingChange}
            trackColor={{ true: styles.tokens.goldStrong }}
          />
          <Text style={[styles.textPrimary, { flex: 1, fontSize: 14 }]}>
            Replace existing shifts in range
          </Text>
        </View>
      </View>

      {applyMessage || applyError ? (
        <Text style={{ fontSize: 14, color: applyError ? '#f87171' : '#4ade80' }}>
          {applyError || applyMessage}
        </Text>
      ) : null}

      <View style={{ gap: 12 }}>
        <Pressable
          onPress={onApply}
          disabled={applying || previewCount === 0}
          style={[styles.buttonPrimary, { opacity: applying || previewCount === 0 ? 0.5 : 1 }]}
        >
          <Text style={[styles.buttonPrimaryText, { fontSize: 12, letterSpacing: 0 }]}>
            {applying ? 'Applying…' : `Apply to ${getMonthLabel(viewYear, viewMonth)}`}
          </Text>
        </Pressable>
        <Pressable
          onPress={onClear}
          disabled={applying || monthShiftCount === 0}
          style={{
            paddingVertical: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(239, 68, 68, 0.3)',
            alignItems: 'center',
            opacity: applying || monthShiftCount === 0 ? 0.4 : 1,
          }}
        >
          <Text style={{ color: '#f87171', fontSize: 14, fontWeight: '500' }}>Clear month</Text>
        </Pressable>
      </View>
    </View>
  );
}
