import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { useAuth } from '../../contexts/AuthContext';
import { StaffScreenLayout } from '../../components/staff/StaffScreenLayout';
import { ScrollSelect } from '../../components/forms/ScrollSelect';
import { useThemeStyles } from '../../theme/useThemeStyles';
import type { StaffStackParamList } from '../../navigation/staffTypes';

const MANAGER_ROLES = new Set(['admin', 'super_admin', 'owner', 'partner']);

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  owner: 'Owner',
  partner: 'Partner',
  admin: 'Admin',
  cashier: 'Cashier',
  technician: 'Technician',
};

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  super_admin: { bg: 'rgba(147,51,234,0.2)', text: '#c084fc' },
  owner: { bg: 'rgba(147,51,234,0.2)', text: '#c084fc' },
  partner: { bg: 'rgba(99,102,241,0.2)', text: '#818cf8' },
  admin: { bg: 'rgba(59,130,246,0.2)', text: '#60a5fa' },
  cashier: { bg: 'rgba(34,197,94,0.2)', text: '#4ade80' },
  technician: { bg: 'rgba(234,179,8,0.2)', text: '#facc15' },
};

const ROLE_OPTIONS = [
  { value: 'technician', label: 'Technician' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'admin', label: 'Admin' },
];

type ProfileRecord = {
  id: string;
  full_name?: string;
  email?: string;
  role?: string;
};

type ActivityRecord = {
  id: string;
  final_price?: number;
  payment_method?: string;
  services?: { name?: string };
  customer?: { full_name?: string; email?: string };
  payment?: { created_at?: string; payment_method?: string };
};

type StaffProfileScreenProps = {
  staffId?: string;
};

export function StaffProfileScreen({ staffId: staffIdProp }: StaffProfileScreenProps = {}) {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const route = useRoute<RouteProp<StaffStackParamList, 'StaffProfile'>>();
  const staffId = staffIdProp ?? route.params?.staffId;

  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [cashierActivity, setCashierActivity] = useState<ActivityRecord[]>([]);
  const [todayStats, setTodayStats] = useState({ servicesCompleted: 0, revenueProcessed: 0 });
  const [weekStats, setWeekStats] = useState({ servicesCompleted: 0, revenueProcessed: 0 });
  const [updatingRole, setUpdatingRole] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!staffId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await getSupabase().from('profiles').select('*').eq('id', staffId).single();
      if (error) throw error;
      setProfile(data as ProfileRecord);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  const fetchCashierActivity = useCallback(async () => {
    if (!staffId) return;

    const { data } = await getSupabase()
      .from('payment_transactions')
      .select(
        `*, appointments(*, services(name), customer:profiles!appointments_client_id_fkey(full_name, email))`,
      )
      .eq('cashier_id', staffId)
      .order('created_at', { ascending: false })
      .limit(10);

    setCashierActivity(
      (data || []).map((transaction: Record<string, unknown>) => ({
        ...(transaction.appointments as ActivityRecord),
        payment: transaction,
      })),
    );
  }, [staffId]);

  const fetchPerformanceStats = useCallback(async () => {
    if (!staffId) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);

    const supabase = getSupabase();

    const [{ count: todayCount }, { data: todayRevenue }, { count: weekCount }, { data: weekRevenue }] =
      await Promise.all([
        supabase
          .from('payment_transactions')
          .select('id', { count: 'exact', head: true })
          .eq('cashier_id', staffId)
          .eq('status', 'completed')
          .gte('created_at', today.toISOString()),
        supabase
          .from('payment_transactions')
          .select('final_amount')
          .eq('cashier_id', staffId)
          .eq('status', 'completed')
          .gte('created_at', today.toISOString()),
        supabase
          .from('payment_transactions')
          .select('id', { count: 'exact', head: true })
          .eq('cashier_id', staffId)
          .eq('status', 'completed')
          .gte('created_at', weekStart.toISOString()),
        supabase
          .from('payment_transactions')
          .select('final_amount')
          .eq('cashier_id', staffId)
          .eq('status', 'completed')
          .gte('completed_at', weekStart.toISOString()),
      ]);

    const todayTotal =
      (todayRevenue || []).reduce(
        (sum: number, row: { final_amount?: number }) => sum + (row.final_amount || 0),
        0,
      ) || 0;
    const weekTotal =
      (weekRevenue || []).reduce(
        (sum: number, row: { final_amount?: number }) => sum + (row.final_amount || 0),
        0,
      ) || 0;

    setTodayStats({ servicesCompleted: todayCount || 0, revenueProcessed: todayTotal });
    setWeekStats({ servicesCompleted: weekCount || 0, revenueProcessed: weekTotal });
  }, [staffId]);

  useEffect(() => {
    const role = user?.role?.toString().trim().toLowerCase();
    if (!role || !MANAGER_ROLES.has(role)) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }
    fetchProfile();
    fetchCashierActivity();
    fetchPerformanceStats();
  }, [user?.role, fetchProfile, fetchCashierActivity, fetchPerformanceStats]);

  const handleRoleChange = async (newRole: string) => {
    if (!staffId) return;
    setUpdatingRole(true);
    const { error } = await getSupabase().from('profiles').update({ role: newRole }).eq('id', staffId);
    if (!error) {
      setProfile((prev) => (prev ? { ...prev, role: newRole } : prev));
    }
    setUpdatingRole(false);
  };

  if (loading) {
    return (
      <StaffScreenLayout title="Staff Profile">
        <ActivityIndicator color={styles.tokens.goldStrong} style={{ marginTop: 40 }} />
      </StaffScreenLayout>
    );
  }

  if (accessDenied) {
    return (
      <StaffScreenLayout title="Staff Profile" subtitle="Manager access required.">
        <Text style={styles.textSecondary}>Only managers can view staff profiles.</Text>
      </StaffScreenLayout>
    );
  }

  if (!staffId || !profile) {
    return (
      <StaffScreenLayout title="Staff Profile" subtitle="Staff member not found.">
        <Text style={styles.textSecondary}>Provide a staff ID via navigation params.</Text>
      </StaffScreenLayout>
    );
  }

  const initials = profile.full_name
    ? profile.full_name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : profile.email?.charAt(0).toUpperCase() || '?';

  const roleStyle = ROLE_COLORS[profile.role || ''] || {
    bg: `${styles.tokens.goldStrong}22`,
    text: styles.tokens.goldStrong,
  };

  return (
    <StaffScreenLayout title="Staff Profile" subtitle={profile.full_name || 'Unknown'}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        <View style={[styles.card, { padding: 24, alignItems: 'center', minWidth: 200, flex: 1 }]}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: `${styles.tokens.goldStrong}33`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Text style={[styles.statValueLg, { fontSize: 32 }]}>{initials}</Text>
          </View>
          <Text style={[styles.statValue, { color: styles.tokens.textPrimary, fontSize: 22, marginBottom: 4 }]}>
            {profile.full_name || 'Unknown'}
          </Text>
          <Text style={[styles.textSecondary, { marginBottom: 12 }]}>{profile.email || 'No email'}</Text>
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: roleStyle.bg,
              borderWidth: 1,
              borderColor: roleStyle.text,
            }}
          >
            <Text style={{ color: roleStyle.text, fontSize: 13 }}>
              {ROLE_LABELS[profile.role || ''] || profile.role}
            </Text>
          </View>
        </View>

        <View style={{ flex: 2, minWidth: 260, gap: 16 }}>
          <View style={[styles.card, { padding: 16 }]}>
            <Text style={[styles.panelTitle, { marginBottom: 16 }]}>
              Performance
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View
                style={[
                  styles.card,
                  {
                    flex: 1,
                    padding: 14,
                    borderColor: 'rgba(34,197,94,0.4)',
                    backgroundColor: 'rgba(34,197,94,0.1)',
                  },
                ]}
              >
                <Text style={{ color: '#4ade80', fontSize: 13, marginBottom: 8 }}>Today</Text>
                <Text style={[styles.statValueLg, { color: styles.tokens.textPrimary, fontSize: 24 }]}>
                  {todayStats.servicesCompleted}
                </Text>
                <Text style={styles.textSecondary}>Services completed</Text>
                <Text style={[styles.statValue, { marginTop: 8 }]}>
                  ${todayStats.revenueProcessed.toFixed(0)}
                </Text>
                <Text style={styles.textSecondary}>Revenue</Text>
              </View>
              <View
                style={[
                  styles.card,
                  {
                    flex: 1,
                    padding: 14,
                    borderColor: 'rgba(59,130,246,0.4)',
                    backgroundColor: 'rgba(59,130,246,0.1)',
                  },
                ]}
              >
                <Text style={{ color: '#60a5fa', fontSize: 13, marginBottom: 8 }}>This Week</Text>
                <Text style={[styles.statValueLg, { color: styles.tokens.textPrimary, fontSize: 24 }]}>
                  {weekStats.servicesCompleted}
                </Text>
                <Text style={styles.textSecondary}>Services completed</Text>
                <Text style={[styles.statValue, { marginTop: 8 }]}>
                  ${weekStats.revenueProcessed.toFixed(0)}
                </Text>
                <Text style={styles.textSecondary}>Revenue</Text>
              </View>
            </View>
          </View>

          <View style={[styles.card, { padding: 16 }]}>
            <Text style={[styles.panelTitle, { marginBottom: 16 }]}>
              Role Management
            </Text>
            <Text style={[styles.textSecondary, { marginBottom: 8 }]}>Change role:</Text>
            <ScrollSelect
              value={profile.role || ''}
              onChange={handleRoleChange}
              options={ROLE_OPTIONS}
              placeholder="Select role"
            />
            <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 8 }]}>
              {updatingRole ? 'Saving…' : 'Changes apply immediately'}
            </Text>
          </View>

          <View style={[styles.card, { padding: 16 }]}>
            <Text style={[styles.panelTitle, { marginBottom: 16 }]}>
              Activity Log
            </Text>
            {cashierActivity.length === 0 ? (
              <Text style={[styles.textSecondary, { textAlign: 'center', paddingVertical: 24 }]}>
                No checkout activity recorded
              </Text>
            ) : (
              <View style={{ gap: 8 }}>
                {cashierActivity.map((activity) => (
                  <View
                    key={activity.id}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: styles.tokens.borderLight,
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={[styles.textPrimary, { fontWeight: '500' }]}>
                        {activity.services?.name || 'Service'}
                      </Text>
                      <Text style={[styles.textSecondary, { fontSize: 12 }]}>
                        {activity.customer?.full_name || activity.customer?.email || 'Unknown'}
                        {' · '}
                        {activity.payment?.created_at
                          ? new Date(activity.payment.created_at).toLocaleDateString()
                          : '—'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.textGold}>${Number(activity.final_price || 0).toFixed(2)}</Text>
                      <Text style={[styles.textSecondary, { fontSize: 12 }]}>
                        {activity.payment?.payment_method || activity.payment_method || '—'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
    </StaffScreenLayout>
  );
}
