import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { formatPhone, formatProfileDate, ROLE_COLORS, ROLE_LABELS } from '@nail-couture/shared/utils/roleLabels.js';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { StaffScreenLayout } from '../../components/staff/StaffScreenLayout';
import { AppModal, ModalButton } from '../../components/AppModal';
import { Icon } from '../../components/icons/Icon';
import { useThemeStyles } from '../../theme/useThemeStyles';

type ProfileRecord = {
  id: string;
  full_name?: string;
  phone?: string;
  email?: string;
  role?: string;
  created_at?: string;
  pin?: string;
};

export function StaffSettingsScreen() {
  const { user, logout, login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const styles = useThemeStyles();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '' });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [workStats, setWorkStats] = useState({ todayCount: 0, todayValue: 0, weekCount: 0, weekValue: 0 });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinMode, setPinMode] = useState<'set' | 'change'>('set');
  const [pinStep, setPinStep] = useState(1);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSaving, setPinSaving] = useState(false);

  const fetchWorkStats = useCallback(async (userId: string, role?: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);

    if (role === 'technician') {
      const sumPrices = (rows: Array<{ final_price?: number; services?: { price?: number } }>) =>
        (rows || []).reduce((sum, row) => sum + (row.final_price ?? row.services?.price ?? 0), 0);

      const [{ count: todayCount }, { data: todayAppts }, { count: weekCount }, { data: weekAppts }] = await Promise.all([
        getSupabase().from('appointments').select('id', { count: 'exact', head: true }).eq('technician_id', userId).eq('status', 'completed').gte('checked_in_at', today.toISOString()),
        getSupabase().from('appointments').select('final_price, services(price)').eq('technician_id', userId).eq('status', 'completed').gte('checked_in_at', today.toISOString()),
        getSupabase().from('appointments').select('id', { count: 'exact', head: true }).eq('technician_id', userId).eq('status', 'completed').gte('checked_in_at', weekStart.toISOString()),
        getSupabase().from('appointments').select('final_price, services(price)').eq('technician_id', userId).eq('status', 'completed').gte('checked_in_at', weekStart.toISOString()),
      ]);
      setWorkStats({
        todayCount: todayCount || 0,
        todayValue: sumPrices(todayAppts || []),
        weekCount: weekCount || 0,
        weekValue: sumPrices(weekAppts || []),
      });
      return;
    }

    if (['cashier', 'admin', 'super_admin', 'owner', 'partner'].includes(role || '')) {
      const [{ count: todayCount }, { data: todayPayments }, { count: weekCount }, { data: weekPayments }] = await Promise.all([
        getSupabase().from('payment_transactions').select('id', { count: 'exact', head: true }).eq('cashier_id', userId).eq('status', 'completed').gte('created_at', today.toISOString()),
        getSupabase().from('payment_transactions').select('final_amount').eq('cashier_id', userId).eq('status', 'completed').gte('created_at', today.toISOString()),
        getSupabase().from('payment_transactions').select('id', { count: 'exact', head: true }).eq('cashier_id', userId).eq('status', 'completed').gte('created_at', weekStart.toISOString()),
        getSupabase().from('payment_transactions').select('final_amount').eq('cashier_id', userId).eq('status', 'completed').gte('created_at', weekStart.toISOString()),
      ]);
      setWorkStats({
        todayCount: todayCount || 0,
        todayValue: (todayPayments || []).reduce((sum: number, row: { final_amount?: number }) => sum + (row.final_amount || 0), 0),
        weekCount: weekCount || 0,
        weekValue: (weekPayments || []).reduce((sum: number, row: { final_amount?: number }) => sum + (row.final_amount || 0), 0),
      });
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const { data, error } = await getSupabase().from('profiles').select('*').eq('id', user.id).single();
    const record = (!error && data ? data : user) as ProfileRecord;
    setProfile(record);
    setForm({
      full_name: record.full_name || '',
      phone: record.phone || '',
      email: record.email || '',
    });
    await fetchWorkStats(record.id, record.role || user.role);
    setLoading(false);
  }, [user, fetchWorkStats]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    const cleanPhone = form.phone.replace(/\D/g, '');
    if (cleanPhone && cleanPhone.length < 10) {
      setSaveError('Please enter a valid phone number');
      return;
    }
    setSaving(true);
    setSaveError('');
    const { data, error } = await getSupabase()
      .from('profiles')
      .update({ full_name: form.full_name.trim(), phone: cleanPhone || null, email: form.email.trim() || null })
      .eq('id', profile.id)
      .select()
      .single();
    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    setProfile(data as ProfileRecord);
    login({ ...user, ...data });
    setEditing(false);
    setSaveMessage('Profile updated successfully');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const openPinModal = (mode: 'set' | 'change') => {
    setPinMode(mode);
    setPinStep(mode === 'change' ? 1 : 2);
    setOldPin('');
    setNewPin('');
    setConfirmPin('');
    setPinError('');
    setShowPinModal(true);
  };

  const handlePinStep = async () => {
    if (!profile) return;
    if (pinStep === 1) {
      if (oldPin.length !== 4) { setPinError('Enter your current 4-digit PIN'); return; }
      const { data } = await getSupabase().from('profiles').select('pin').eq('id', profile.id).single();
      if (!data?.pin || data.pin !== oldPin) { setPinError('Incorrect current PIN'); return; }
      setPinError('');
      setPinStep(2);
      return;
    }
    if (pinStep === 2) {
      if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) { setPinError('Enter a 4-digit PIN'); return; }
      setPinError('');
      setPinStep(3);
      return;
    }
    if (confirmPin !== newPin) { setPinError('PINs do not match'); return; }
    setPinSaving(true);
    const { error } = await getSupabase().from('profiles').update({ pin: newPin }).eq('id', profile.id);
    setPinSaving(false);
    if (error) { setPinError('Failed to update PIN'); return; }
    setProfile({ ...profile, pin: newPin });
    setShowPinModal(false);
    setSaveMessage(pinMode === 'set' ? 'PIN set successfully' : 'PIN changed successfully');
    setTimeout(() => setSaveMessage(''), 3000);
  };

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

  if (loading) {
    return (
      <StaffScreenLayout>
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <ActivityIndicator color={styles.tokens.goldStrong} />
        </View>
      </StaffScreenLayout>
    );
  }

  const displayName = profile?.full_name || profile?.email || 'Staff Member';
  const initials = displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const role = profile?.role || user?.role || '';
  const roleColor = ROLE_COLORS[role as keyof typeof ROLE_COLORS] || ROLE_COLORS.customer;
  const isTechnician = role === 'technician';
  const showWorkStats = isTechnician || ['cashier', 'admin', 'super_admin', 'owner', 'partner'].includes(role);
  const todayLabel = isTechnician ? 'Services completed' : 'Transactions processed';
  const valueLabel = isTechnician ? 'Service value' : 'Revenue processed';

  const PinPad = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <View style={{ alignItems: 'center', marginVertical: 12 }}>
      <Text style={[styles.textHeading, { fontSize: 28, letterSpacing: 8, marginBottom: 16 }]}>
        {'•'.repeat(value.length).padEnd(4, '○')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 240, justifyContent: 'center', gap: 8 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'del', 0].map((key) => (
          <Pressable
            key={String(key)}
            onPress={() => {
              if (key === 'del') onChange(value.slice(0, -1));
              else if (value.length < 4) onChange(value + String(key));
            }}
            style={{ width: 72, height: 52, borderRadius: 12, backgroundColor: styles.tokens.cardBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: styles.tokens.borderLight }}
          >
            {key === 'del' ? (
              <Icon name="backspace" size={22} color={styles.tokens.textPrimary} />
            ) : (
              <Text style={[styles.textPrimary, { fontSize: 20 }]}>{key}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <StaffScreenLayout title="Profile Settings" subtitle="Manage your account and security">
      {saveMessage ? (
        <View style={{ backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <Text style={{ color: '#4ade80' }}>{saveMessage}</Text>
        </View>
      ) : null}

      <View style={[styles.card, { padding: 16, marginBottom: 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(197,160,89,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[styles.textGold, { fontSize: 20, fontWeight: '600' }]}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.textPrimary, { fontSize: 18, fontWeight: '600' }]}>{displayName}</Text>
            <View style={{ backgroundColor: roleColor.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 }}>
              <Text style={{ color: roleColor.text, fontSize: 11, fontWeight: '600' }}>{ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role}</Text>
            </View>
            {profile?.created_at && (
              <Text style={[styles.textSecondary, { fontSize: 11, marginTop: 4 }]}>
                Member since {formatProfileDate(profile.created_at)}
              </Text>
            )}
          </View>
          <Pressable onPress={() => setEditing(!editing)}>
            <Text style={styles.textGold}>{editing ? 'Cancel' : 'Edit'}</Text>
          </Pressable>
        </View>

        {editing ? (
          <>
            <Text style={styles.textSecondary}>Full Name</Text>
            <TextInput value={form.full_name} onChangeText={(v) => setForm({ ...form, full_name: v })} style={inputStyle} placeholderTextColor={styles.tokens.textMuted} />
            <Text style={styles.textSecondary}>Phone</Text>
            <TextInput value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" style={inputStyle} placeholderTextColor={styles.tokens.textMuted} />
            <Text style={styles.textSecondary}>Email</Text>
            <TextInput value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" style={inputStyle} placeholderTextColor={styles.tokens.textMuted} />
            {saveError ? <Text style={{ color: '#f87171', marginBottom: 8 }}>{saveError}</Text> : null}
            <Pressable onPress={handleSaveProfile} disabled={saving} style={{ backgroundColor: styles.tokens.goldStrong, borderRadius: 10, padding: 14, alignItems: 'center' }}>
              <Text style={{ color: '#121212', fontWeight: '600' }}>{saving ? 'Saving...' : 'Save Profile'}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.textSecondary}>Phone: {formatPhone(profile?.phone)}</Text>
            <Text style={[styles.textSecondary, { marginTop: 4 }]}>Email: {profile?.email || 'Not set'}</Text>
          </>
        )}
      </View>

      {showWorkStats && (
        <View style={[styles.card, { padding: 16, marginBottom: 12 }]}>
          <Text style={[styles.textPrimary, { fontWeight: '600', marginBottom: 12 }]}>My Activity</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[styles.textGold, { fontSize: 22, fontWeight: '600' }]}>{workStats.todayCount}</Text>
              <Text style={[styles.textSecondary, { fontSize: 11, textAlign: 'center' }]}>{todayLabel}</Text>
              <Text style={[styles.textSecondary, { fontSize: 10 }]}>${workStats.todayValue.toFixed(0)} {valueLabel}</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[styles.textGold, { fontSize: 22, fontWeight: '600' }]}>{workStats.weekCount}</Text>
              <Text style={[styles.textSecondary, { fontSize: 11, textAlign: 'center' }]}>This week</Text>
              <Text style={[styles.textSecondary, { fontSize: 10 }]}>${workStats.weekValue.toFixed(0)} {valueLabel}</Text>
            </View>
          </View>
        </View>
      )}

      <View style={[styles.card, { padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <View>
          <Text style={[styles.textPrimary, { fontWeight: '600' }]}>Dark Mode</Text>
          <Text style={styles.textSecondary}>Toggle app theme</Text>
        </View>
        <Switch value={theme === 'dark'} onValueChange={toggleTheme} trackColor={{ true: styles.tokens.goldStrong }} />
      </View>

      <View style={[styles.card, { padding: 16, marginBottom: 12 }]}>
        <Text style={[styles.textPrimary, { fontWeight: '600', marginBottom: 4 }]}>Login PIN</Text>
        <Text style={[styles.textSecondary, { marginBottom: 12 }]}>Quick staff login with 4-digit PIN</Text>
        <Pressable onPress={() => openPinModal(profile?.pin ? 'change' : 'set')} style={{ borderRadius: 10, borderWidth: 1, borderColor: styles.tokens.goldStrong, padding: 12, alignItems: 'center' }}>
          <Text style={styles.textGold}>{profile?.pin ? 'Change PIN' : 'Set PIN'}</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => setShowLogoutConfirm(true)} style={{ borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)', paddingVertical: 14, alignItems: 'center' }}>
        <Text style={{ color: '#f87171', fontWeight: '600' }}>Log Out</Text>
      </Pressable>

      <AppModal
        open={showPinModal}
        onClose={() => setShowPinModal(false)}
        title={pinStep === 1 ? 'Enter Current PIN' : pinStep === 2 ? 'Enter New PIN' : 'Confirm PIN'}
        footer={
          <>
            <ModalButton label="Cancel" onPress={() => setShowPinModal(false)} />
            <ModalButton label={pinSaving ? 'Saving...' : 'Continue'} onPress={handlePinStep} disabled={pinSaving} variant="primary" />
          </>
        }
      >
        {pinError ? <Text style={{ color: '#f87171', textAlign: 'center', marginBottom: 8 }}>{pinError}</Text> : null}
        {pinStep === 1 && <PinPad value={oldPin} onChange={setOldPin} />}
        {pinStep === 2 && <PinPad value={newPin} onChange={setNewPin} />}
        {pinStep === 3 && <PinPad value={confirmPin} onChange={setConfirmPin} />}
      </AppModal>

      <AppModal
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="Log Out?"
        subtitle="Are you sure you want to log out?"
        footer={
          <>
            <ModalButton label="Cancel" onPress={() => setShowLogoutConfirm(false)} />
            <ModalButton label="Log Out" variant="danger" onPress={() => { setShowLogoutConfirm(false); logout(); }} />
          </>
        }
      />
    </StaffScreenLayout>
  );
}
