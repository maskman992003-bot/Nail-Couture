import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { ROLE_COLORS, ROLE_LABELS, normalizeStaffPhone } from '@nail-couture/shared/utils/roleLabels.js';
import { useAuth } from '../../contexts/AuthContext';
import { StaffScreenLayout } from '../../components/staff/StaffScreenLayout';
import { AppModal, ModalButton } from '../../components/AppModal';
import { ScrollSelect } from '../../components/forms/ScrollSelect';
import { useThemeStyles } from '../../theme/useThemeStyles';
import type { StaffStackParamList } from '../../navigation/staffTypes';

type StaffMember = {
  id: string;
  full_name?: string;
  phone?: string;
  role?: string;
  created_at?: string;
};

const ROLE_OPTIONS = [
  { value: 'technician', label: 'Technician' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'admin', label: 'Admin' },
];

export function StaffManagementScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ phone: '', full_name: '', role: 'technician' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    const { data } = await getSupabase()
      .from('profiles')
      .select('*')
      .in('role', ['admin', 'cashier', 'technician', 'owner', 'partner'])
      .order('full_name');
    setStaff((data as StaffMember[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleAddStaff = async () => {
    setAddError('');
    if (!addForm.phone || !addForm.full_name) {
      setAddError('Please fill out all fields');
      return;
    }
    const formattedPhone = normalizeStaffPhone(addForm.phone);
    if (!formattedPhone) {
      setAddError('Please enter a valid 10 or 11 digit US phone number');
      return;
    }

    setAddLoading(true);
    try {
      const { error } = await getSupabase().rpc('add_staff_member', {
        p_phone: formattedPhone,
        p_full_name: addForm.full_name,
        p_role: addForm.role,
        p_admin_phone: user?.phone,
      });
      if (error) throw error;
      setShowAddModal(false);
      setAddForm({ phone: '', full_name: '', role: 'technician' });
      fetchStaff();
    } catch (err) {
      setAddError((err as Error).message || 'Failed to add staff member');
    }
    setAddLoading(false);
  };

  const filteredStaff = staff.filter((member) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      (member.full_name || '').toLowerCase().includes(term) ||
      (member.phone || '').toLowerCase().includes(term) ||
      (ROLE_LABELS[member.role as keyof typeof ROLE_LABELS] || '').toLowerCase().includes(term)
    );
  });

  const inputStyle = {
    backgroundColor: styles.tokens.inputBg,
    borderColor: styles.tokens.borderLight,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: styles.tokens.textPrimary,
    marginBottom: 12,
  };

  return (
    <StaffScreenLayout
      title="Staff Management"
      subtitle="Register salon team members"
      headerRight={
        <Pressable
          onPress={() => setShowAddModal(true)}
          style={{ backgroundColor: styles.tokens.goldStrong, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}
        >
          <Text style={{ color: '#121212', fontWeight: '600', fontSize: 13 }}>+ Add</Text>
        </Pressable>
      }
    >
      <TextInput
        value={searchTerm}
        onChangeText={setSearchTerm}
        placeholder="Search by name, phone, or role..."
        placeholderTextColor={styles.tokens.textMuted}
        style={[inputStyle, { marginBottom: 16 }]}
      />

      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <ActivityIndicator color={styles.tokens.goldStrong} />
        </View>
      ) : filteredStaff.length === 0 ? (
        <View style={[styles.card, { padding: 32, alignItems: 'center' }]}>
          <Text style={styles.textSecondary}>No matching team members</Text>
        </View>
      ) : (
        filteredStaff.map((member) => {
          const roleColor = ROLE_COLORS[member.role as keyof typeof ROLE_COLORS] || ROLE_COLORS.customer;
          const initials = (member.full_name || '??')
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
          return (
            <Pressable
              key={member.id}
              onPress={() => navigation.navigate('StaffProfile', { staffId: member.id })}
              style={[styles.card, { padding: 16, marginBottom: 10 }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: 'rgba(197,160,89,0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={styles.textGold}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.textPrimary, { fontWeight: '600' }]}>{member.full_name}</Text>
                  <Text style={styles.textSecondary}>{member.phone}</Text>
                </View>
                <View style={{ backgroundColor: roleColor.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ color: roleColor.text, fontSize: 10, fontWeight: '700' }}>
                    {ROLE_LABELS[member.role as keyof typeof ROLE_LABELS] || member.role}
                  </Text>
                </View>
              </View>
              {member.created_at && (
                <Text style={[styles.textSecondary, { fontSize: 11, marginTop: 8 }]}>
                  Registered {new Date(member.created_at).toLocaleDateString()}
                </Text>
              )}
            </Pressable>
          );
        })
      )}

      <AppModal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setAddError(''); }}
        title="Add Staff Member"
        subtitle="Create authorization for a team role"
        footer={
          <>
            <ModalButton label="Cancel" onPress={() => { setShowAddModal(false); setAddError(''); }} />
            <ModalButton label={addLoading ? 'Adding...' : 'Add Staff'} onPress={handleAddStaff} disabled={addLoading} />
          </>
        }
      >
        <Text style={[styles.textSecondary, { marginBottom: 4 }]}>Full Name</Text>
        <TextInput value={addForm.full_name} onChangeText={(v) => setAddForm({ ...addForm, full_name: v })} style={inputStyle} placeholder="e.g. Jane Doe" placeholderTextColor={styles.tokens.textMuted} />
        <Text style={[styles.textSecondary, { marginBottom: 4 }]}>Mobile Phone</Text>
        <TextInput value={addForm.phone} onChangeText={(v) => setAddForm({ ...addForm, phone: v })} keyboardType="phone-pad" style={inputStyle} placeholder="(555) 000-0000" placeholderTextColor={styles.tokens.textMuted} />
        <Text style={[styles.textSecondary, { marginBottom: 4 }]}>Role</Text>
        <ScrollSelect options={ROLE_OPTIONS} value={addForm.role} onChange={(v) => setAddForm({ ...addForm, role: v })} />
        {addError ? <Text style={{ color: '#f87171', fontSize: 13, marginTop: 8 }}>{addError}</Text> : null}
      </AppModal>
    </StaffScreenLayout>
  );
}
