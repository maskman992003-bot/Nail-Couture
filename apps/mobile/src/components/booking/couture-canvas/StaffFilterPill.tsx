import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Icon } from '../../icons/Icon';
import { COUTURE_COLORS, COUTURE_RADIUS } from './constants';
import type { CanvasStaffMember } from './types';

type StaffFilterPillProps = {
  staff: CanvasStaffMember[];
  selectedStaffId: string | null;
  onSelectStaff: (staffId: string | null) => void;
};

export function StaffFilterPill({ staff, selectedStaffId, onSelectStaff }: StaffFilterPillProps) {
  const [open, setOpen] = useState(false);

  const selectedLabel =
    selectedStaffId === null
      ? 'All Staff'
      : staff.find((s) => s.id === selectedStaffId)?.fullName || 'All Staff';

  const options = [{ id: null as string | null, label: 'All Staff' }, ...staff.map((s) => ({ id: s.id, label: s.fullName }))];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: COUTURE_RADIUS.pill,
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderWidth: 1,
          borderColor: COUTURE_COLORS.glassBorder,
        }}
      >
        <Text style={{ fontSize: 12, color: '#F9F9F9', fontWeight: '500' }}>{selectedLabel}</Text>
        <Icon name="chevronDown" size={14} color={COUTURE_COLORS.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} onPress={() => setOpen(false)}>
          <Pressable
            style={{
              backgroundColor: '#1a1a1a',
              borderTopLeftRadius: COUTURE_RADIUS.sheet,
              borderTopRightRadius: COUTURE_RADIUS.sheet,
              maxHeight: '40%',
              paddingBottom: 24,
              borderWidth: 1,
              borderColor: COUTURE_COLORS.glassBorder,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: COUTURE_COLORS.glassBorder }}>
              <Text style={{ color: COUTURE_COLORS.gold, fontSize: 16, fontWeight: '600' }}>Filter by Staff</Text>
            </View>
            <ScrollView>
              {options.map((option) => {
                const active = selectedStaffId === option.id;
                return (
                  <Pressable
                    key={option.id ?? 'all'}
                    onPress={() => {
                      onSelectStaff(option.id);
                      setOpen(false);
                    }}
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                      backgroundColor: active ? 'rgba(197,160,89,0.12)' : 'transparent',
                    }}
                  >
                    <Text style={{ color: active ? COUTURE_COLORS.gold : '#F9F9F9', fontSize: 15 }}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
