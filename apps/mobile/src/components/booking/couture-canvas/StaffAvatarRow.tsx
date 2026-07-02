import { Pressable, ScrollView, Text, View } from 'react-native';
import { Icon } from '../../icons/Icon';
import { COUTURE_COLORS } from './constants';
import type { CanvasStaffMember } from './types';

type StaffAvatarRowProps = {
  staff: CanvasStaffMember[];
  selectedStaffId: string;
  onSelect: (staffId: string) => void;
};

export function StaffAvatarRow({ staff, selectedStaffId, onSelect }: StaffAvatarRowProps) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 11, color: COUTURE_COLORS.textSecondary, letterSpacing: 1, textTransform: 'uppercase' }}>
        Staff Assignment
      </Text>
      <Text style={{ fontSize: 12, color: COUTURE_COLORS.textMuted, marginBottom: 4 }}>Select Staff Member</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingVertical: 4 }}>
        {staff.map((member) => {
          const isSelected = member.id === selectedStaffId;
          return (
            <Pressable key={member.id} onPress={() => onSelect(member.id)} style={{ alignItems: 'center' }}>
              <View style={{ position: 'relative' }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: member.accentColor,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: isSelected ? 2.5 : 0,
                    borderColor: '#F9F9F9',
                    shadowColor: isSelected ? member.accentColor : 'transparent',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: isSelected ? 0.8 : 0,
                    shadowRadius: isSelected ? 8 : 0,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#121212' }}>{member.initial}</Text>
                </View>
                {isSelected ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: member.accentColor,
                      borderWidth: 2,
                      borderColor: '#1a1a1a',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="check" size={10} color="#121212" />
                  </View>
                ) : null}
              </View>
              <Text
                style={{
                  fontSize: 10,
                  color: isSelected ? '#F9F9F9' : COUTURE_COLORS.textMuted,
                  marginTop: 6,
                  maxWidth: 56,
                  textAlign: 'center',
                }}
                numberOfLines={1}
              >
                {member.fullName.split(' ')[0]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
