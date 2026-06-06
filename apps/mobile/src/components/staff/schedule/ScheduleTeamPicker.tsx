import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ROLE_LABELS, getInitials } from '@nail-couture/shared/utils/scheduleUtils.js';
import { useThemeStyles } from '../../../theme/useThemeStyles';

export type StaffMember = {
  id: string;
  full_name: string;
  role: string;
};

const ROLE_FILTERS = ['all', 'technician', 'cashier', 'admin'] as const;

type ScheduleTeamPickerProps = {
  filteredStaff: StaffMember[];
  selectedStaffId: string | null;
  roleFilter: string;
  shiftCountsByMember: Record<string, number>;
  onSelectStaff: (memberId: string) => void;
  onRoleFilterChange: (role: string) => void;
};

function StaffMemberButton({
  member,
  isActive,
  count,
  onSelect,
}: {
  member: StaffMember;
  isActive: boolean;
  count: number;
  onSelect: (id: string) => void;
}) {
  const styles = useThemeStyles();

  return (
    <Pressable
      onPress={() => onSelect(member.id)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minWidth: 200,
        backgroundColor: isActive ? `${styles.tokens.goldStrong}22` : styles.tokens.bgSecondary,
        borderColor: isActive ? `${styles.tokens.goldStrong}44` : styles.tokens.borderLight,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isActive ? styles.tokens.goldStrong : `${styles.tokens.goldStrong}22`,
          borderWidth: isActive ? 0 : 1,
          borderColor: `${styles.tokens.goldStrong}33`,
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: '600', color: isActive ? '#121212' : styles.tokens.goldStrong }}>
          {getInitials(member.full_name)}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: isActive ? styles.tokens.goldStrong : styles.tokens.textPrimary,
          }}
        >
          {member.full_name}
        </Text>
        <Text style={[styles.textSecondary, { fontSize: 10, textTransform: 'uppercase' }]}>
          {ROLE_LABELS[member.role as keyof typeof ROLE_LABELS] || member.role}
        </Text>
      </View>
      <Text style={[styles.textSecondary, { fontSize: 10 }]}>{count}</Text>
    </Pressable>
  );
}

export function ScheduleTeamPicker({
  filteredStaff,
  selectedStaffId,
  roleFilter,
  shiftCountsByMember,
  onSelectStaff,
  onRoleFilterChange,
}: ScheduleTeamPickerProps) {
  const styles = useThemeStyles();
  const [searchQuery, setSearchQuery] = useState('');

  const visibleStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredStaff;
    return filteredStaff.filter((member) => member.full_name?.toLowerCase().includes(q));
  }, [filteredStaff, searchQuery]);

  return (
    <View style={{ gap: 12, marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {ROLE_FILTERS.map((r) => {
          const active = roleFilter === r;
          return (
            <Pressable
              key={r}
              onPress={() => onRoleFilterChange(r)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: active ? `${styles.tokens.goldStrong}44` : 'transparent',
                backgroundColor: active ? `${styles.tokens.goldStrong}22` : 'transparent',
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  color: active ? styles.tokens.goldStrong : styles.tokens.textSecondary,
                }}
              >
                {r === 'all' ? 'All' : ROLE_LABELS[r as keyof typeof ROLE_LABELS]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search by name…"
        placeholderTextColor={styles.tokens.textMuted}
        style={styles.input}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {visibleStaff.map((member) => (
          <StaffMemberButton
            key={member.id}
            member={member}
            isActive={member.id === selectedStaffId}
            count={shiftCountsByMember[member.id] || 0}
            onSelect={onSelectStaff}
          />
        ))}
        {visibleStaff.length === 0 ? (
          <Text style={[styles.textSecondary, { paddingVertical: 8 }]}>
            {searchQuery.trim() ? 'No matching team members' : 'No team members'}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
