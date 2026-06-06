import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import {
  APPOINTMENT_STATUS_COLORS,
  APPOINTMENT_STATUS_LABELS,
  formatAppointmentTime,
  getAppointmentFinalPrice,
  getAppointmentServices,
} from '@nail-couture/shared/utils/appointmentHelpers.js';
import { useAuth } from '../../contexts/AuthContext';
import { StaffScreenLayout } from '../../components/staff/StaffScreenLayout';
import { AppModal } from '../../components/AppModal';
import { useThemeStyles } from '../../theme/useThemeStyles';
import type { AppScreenName } from '../../navigation/screenRegistry';

type AppointmentRecord = {
  id: string;
  status: string;
  checked_in_at?: string;
  booking_type?: string;
  type?: string;
  notes?: string;
  technician_id?: string;
  technician?: { full_name?: string };
  technician_name?: string;
  customer?: { full_name?: string; phone?: string };
  services?: { name?: string; price?: number } | { name?: string; price?: number }[];
  add_ons?: string;
  final_price?: number;
};

const MANAGER_ROLES = new Set(['super_admin', 'owner', 'partner']);

const DASHBOARD_TITLES: Record<string, string> = {
  super_admin: 'Super Admin',
  owner: 'Owner Dashboard',
  partner: 'Partner Dashboard',
  admin: 'Admin Dashboard',
};

export function AdminHomeScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const navigation = useNavigation<BottomTabNavigationProp<Record<AppScreenName, undefined>>>();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    activeTechnicians: 0,
    waitingCustomers: 0,
    completedToday: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<AppointmentRecord[]>([]);
  const [staff, setStaff] = useState<{ id: string; full_name?: string; role?: string }[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRecord | null>(null);

  const isManager = user?.role && MANAGER_ROLES.has(user.role);

  const fetchData = useCallback(async () => {
    if (!user?.phone) {
      setLoading(false);
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const dateFrom = `${today}T00:00:00`;

      const [apptsRes, waitingRes, staffRes] = await Promise.all([
        getSupabase().rpc('get_appointments', { caller_phone: user.phone, date_from: dateFrom }),
        getSupabase().rpc('get_appointments_count', {
          caller_phone: user.phone,
          status_filter: 'waiting',
        }),
        isManager
          ? getSupabase()
              .from('profiles')
              .select('*')
              .in('role', ['admin', 'cashier', 'technician'])
              .order('full_name')
          : Promise.resolve({ data: [] }),
      ]);

      const appointments = (apptsRes.data as AppointmentRecord[]) || [];
      const staffData = (staffRes.data as typeof staff) || [];
      const waitingCount =
        typeof waitingRes.data === 'object' ? (waitingRes.data as { count?: number })?.count || 0 : 0;

      const completed = appointments.filter((a) => a.status === 'completed');
      const revenue = completed.reduce(
        (sum, a) => sum + getAppointmentFinalPrice(a),
        0,
      );

      setStats({
        todayRevenue: revenue,
        activeTechnicians: staffData.filter((s) => s.role === 'technician').length || 5,
        waitingCustomers: isManager ? waitingCount : appointments.filter((a) => a.status === 'waiting').length,
        completedToday: completed.length,
      });
      setRecentAppointments(appointments.slice(0, 10));
      setStaff(staffData);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [user?.phone, isManager]);

  useEffect(() => {
    fetchData();
    const channel = getSupabase()
      .channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchData())
      .subscribe();
    return () => {
      getSupabase().removeChannel(channel);
    };
  }, [fetchData]);

  const getTechnicianName = (appt: AppointmentRecord) => {
    if (appt.technician?.full_name) return appt.technician.full_name;
    if (appt.technician_name) return appt.technician_name;
    if (appt.technician_id) {
      const tech = staff.find((m) => String(m.id) === String(appt.technician_id));
      if (tech?.full_name) return tech.full_name;
    }
    return 'Unassigned';
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

  const title = DASHBOARD_TITLES[user?.role || 'admin'] || 'Dashboard';
  const statCard = [styles.card, { padding: 14, flex: 1, alignItems: 'center' as const }];
  const linkCard = [styles.card, { padding: 18, marginBottom: 10 }];

  const quickLinks = [
    { screen: 'Lobby' as AppScreenName, icon: '👥', title: 'Manage Lobby', desc: 'Assign customers to technicians' },
    ...(isManager
      ? [
          { screen: 'Services' as AppScreenName, icon: '💅', title: 'Services', desc: 'Manage pricing and categories' },
          { screen: 'Reports' as AppScreenName, icon: '📊', title: 'View Reports', desc: 'Analytics and insights' },
        ]
      : []),
    { screen: 'Bookings' as AppScreenName, icon: '📅', title: 'Bookings', desc: 'Manage appointments' },
  ];

  return (
    <StaffScreenLayout
      title={title}
      subtitle={`Welcome back, ${user?.full_name || 'Admin'}`}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {isManager && (
          <View style={statCard}>
            <Text style={[styles.textGold, { fontSize: 22, fontWeight: '600' }]}>
              ${stats.todayRevenue.toFixed(0)}
            </Text>
            <Text style={styles.textSecondary}>Revenue</Text>
          </View>
        )}
        <View style={statCard}>
          <Text style={{ fontSize: 22, fontWeight: '600', color: styles.tokens.textPrimary }}>
            {stats.activeTechnicians}
          </Text>
          <Text style={styles.textSecondary}>Technicians</Text>
        </View>
        <View style={statCard}>
          <Text style={{ fontSize: 22, fontWeight: '600', color: '#facc15' }}>
            {stats.waitingCustomers}
          </Text>
          <Text style={styles.textSecondary}>Waiting</Text>
        </View>
        <View style={statCard}>
          <Text style={{ fontSize: 22, fontWeight: '600', color: '#4ade80' }}>
            {stats.completedToday}
          </Text>
          <Text style={styles.textSecondary}>Completed</Text>
        </View>
      </View>

      {quickLinks.map((link) => (
        <Pressable key={link.screen} onPress={() => navigation.navigate(link.screen)} style={linkCard}>
          <Text style={{ fontSize: 28, marginBottom: 6 }}>{link.icon}</Text>
          <Text style={[styles.textGold, { fontSize: 18, fontWeight: '600' }]}>{link.title}</Text>
          <Text style={[styles.textSecondary, { marginTop: 4 }]}>{link.desc}</Text>
        </Pressable>
      ))}

      {isManager && (
        <View style={[styles.card, { padding: 16, marginTop: 8 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={[styles.textPrimary, { fontSize: 18, fontWeight: '600' }]}>Today&apos;s Activity</Text>
            <Pressable onPress={() => navigation.navigate('Lobby')}>
              <Text style={styles.textGold}>View Lobby</Text>
            </Pressable>
          </View>
          {recentAppointments.length > 0 ? (
            recentAppointments.map((appt) => {
              const services = getAppointmentServices(appt);
              const statusStyle = APPOINTMENT_STATUS_COLORS[appt.status as keyof typeof APPOINTMENT_STATUS_COLORS] || APPOINTMENT_STATUS_COLORS.waiting;
              return (
                <Pressable
                  key={appt.id}
                  onPress={() => setSelectedAppointment(appt)}
                  style={{
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: styles.tokens.borderLight,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.textPrimary}>
                        {appt.customer?.full_name || appt.customer?.phone || 'Guest'}
                      </Text>
                      <Text style={styles.textSecondary}>
                        {services[0] || 'Service'}
                        {services.length > 1 ? ` +${services.length - 1}` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={{ backgroundColor: statusStyle.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ color: statusStyle.text, fontSize: 11, fontWeight: '600' }}>
                          {APPOINTMENT_STATUS_LABELS[appt.status as keyof typeof APPOINTMENT_STATUS_LABELS] || appt.status}
                        </Text>
                      </View>
                      <Text style={[styles.textGold, { marginTop: 4, fontWeight: '600' }]}>
                        ${getAppointmentFinalPrice(appt)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <Text style={[styles.textSecondary, { textAlign: 'center', paddingVertical: 24 }]}>
              No appointments today
            </Text>
          )}
        </View>
      )}

      <AppModal
        open={!!selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        title={selectedAppointment?.customer?.full_name || 'Guest'}
        subtitle={formatAppointmentTime(selectedAppointment?.checked_in_at)}
        scrollBody
      >
        {selectedAppointment && (
          <View style={{ gap: 12 }}>
            <View style={[styles.card, { padding: 12 }]}>
              <Text style={styles.textSecondary}>Technician</Text>
              <Text style={styles.textPrimary}>{getTechnicianName(selectedAppointment)}</Text>
            </View>
            <View style={[styles.card, { padding: 12 }]}>
              <Text style={styles.textSecondary}>Services</Text>
              {getAppointmentServices(selectedAppointment).map((s, i) => (
                <Text key={i} style={styles.textPrimary}>{s}</Text>
              ))}
            </View>
            <View style={[styles.card, { padding: 12 }]}>
              <Text style={styles.textSecondary}>Notes</Text>
              <Text style={styles.textPrimary}>{selectedAppointment.notes || 'No notes'}</Text>
            </View>
            <Text style={[styles.textGold, { fontSize: 24, fontWeight: '600', textAlign: 'right' }]}>
              ${getAppointmentFinalPrice(selectedAppointment).toFixed(2)}
            </Text>
          </View>
        )}
      </AppModal>
    </StaffScreenLayout>
  );
}
