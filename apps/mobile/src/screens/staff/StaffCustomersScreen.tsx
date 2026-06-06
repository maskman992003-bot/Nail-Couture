import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { canAccessStaffCrm } from '@nail-couture/shared/utils/staffCustomerAccess.js';
import { useAuth } from '../../contexts/AuthContext';
import { StaffScreenLayout } from '../../components/staff/StaffScreenLayout';
import { ScrollSelect } from '../../components/forms/ScrollSelect';
import { useThemeStyles } from '../../theme/useThemeStyles';
import type { CustomersStackParamList } from '../../navigation/staffTypes';

type CustomerVisit = {
  id: string;
  date: string;
  checkoutAt: string | null;
  status: string;
  finalPrice: number;
};

type CustomerRecord = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  visits: CustomerVisit[];
  totalVisits: number;
  totalSpent: number;
  lastCheckout: string | null;
};

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recent Checkout' },
  { value: 'az', label: 'A-Z (Name)' },
  { value: 'spend_desc', label: 'Highest Spend' },
  { value: 'visits_desc', label: 'Most Visits' },
];

const DATE_FILTER_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom Range' },
];

const ITEMS_PER_PAGE = 10;

function isVisitInTimeFrame(
  visitDateString: string | null | undefined,
  filterType: string,
  startDate: string,
  endDate: string,
) {
  if (!visitDateString) return false;
  const visitDate = new Date(visitDateString);
  if (Number.isNaN(visitDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (filterType) {
    case 'today':
      return visitDate.toDateString() === today.toDateString();
    case 'this_week': {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      return visitDate >= sevenDaysAgo && visitDate <= today;
    }
    case 'custom': {
      if (!startDate || !endDate) return false;
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return visitDate >= start && visitDate <= end;
    }
    default:
      return true;
  }
}

export function StaffCustomersScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const navigation = useNavigation<NativeStackNavigationProp<CustomersStackParamList>>();

  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [dateFilterType, setDateFilterType] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [accessDenied, setAccessDenied] = useState(false);

  const fetchCustomers = useCallback(async () => {
    const role = user?.role?.toString().trim().toLowerCase();
    if (!role || !canAccessStaffCrm(role)) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    try {
      const supabase = getSupabase();
      const [profilesResult, appointmentsResult, paymentsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, phone, role, created_at')
          .order('full_name'),
        supabase
          .from('appointments')
          .select(
            `*, services:appointments_service_id_fkey!left(*), technicians:profiles!appointments_technician_id_fkey!left(*)`,
          )
          .order('completed_at', { ascending: false, nullsFirst: false }),
        supabase
          .from('payment_transactions')
          .select('appointment_id, customer_id, created_at')
          .eq('status', 'completed')
          .order('created_at', { ascending: false }),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (appointmentsResult.error) throw appointmentsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;

      const checkoutByAppointment: Record<string, string> = {};
      (paymentsResult.data || []).forEach((payment: { appointment_id?: string; created_at?: string }) => {
        if (payment.appointment_id && !checkoutByAppointment[payment.appointment_id]) {
          checkoutByAppointment[payment.appointment_id] = payment.created_at || '';
        }
      });

      const customerMap = new Map<string, CustomerRecord>();
      (profilesResult.data || []).forEach((profile: Record<string, unknown>) => {
        const profileRole = profile.role?.toString().trim().toLowerCase() || '';
        if (profileRole === 'customer') {
          customerMap.set(profile.id as string, {
            id: profile.id as string,
            full_name: (profile.full_name as string) || '',
            email: (profile.email as string) || '',
            phone: (profile.phone as string) || '',
            visits: [],
            totalVisits: 0,
            totalSpent: 0,
            lastCheckout: null,
          });
        }
      });

      (appointmentsResult.data || []).forEach((appointment: Record<string, unknown>) => {
        const customerId = appointment.customer_id as string;
        const customer = customerMap.get(customerId);
        if (!customer) return;

        const addOnNames = appointment.add_ons
          ? (appointment.add_ons as string).split(',').map((name) => name.trim()).filter(Boolean)
          : [];
        const services = appointment.services as { name?: string; price?: number; duration_minutes?: number } | null;
        const primaryServiceName = services?.name || 'Unknown Service';

        const checkoutAt =
          (appointment.completed_at as string) ||
          checkoutByAppointment[appointment.id as string] ||
          null;

        customer.visits.push({
          id: appointment.id as string,
          date: checkoutAt || (appointment.checked_in_at as string) || (appointment.scheduled_at as string),
          checkoutAt,
          status: (appointment.status as string) || '',
          finalPrice: (appointment.final_price as number) || 0,
        });

        if (appointment.status === 'completed') {
          customer.totalVisits += 1;
          customer.totalSpent += (appointment.final_price as number) || 0;
          if (checkoutAt) {
            const checkoutDate = new Date(checkoutAt);
            if (!customer.lastCheckout || checkoutDate > new Date(customer.lastCheckout)) {
              customer.lastCheckout = checkoutAt;
            }
          }
        }
      });

      setCustomers(Array.from(customerMap.values()));
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const searchFilteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const term = searchTerm.toLowerCase().trim();
    return customers.filter(
      (customer) =>
        customer.full_name.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        customer.phone.toLowerCase().includes(term),
    );
  }, [customers, searchTerm]);

  const dateFilteredCustomers = useMemo(() => {
    if (dateFilterType === 'all') return searchFilteredCustomers;
    return searchFilteredCustomers.filter((customer) =>
      customer.visits.some((visit) =>
        isVisitInTimeFrame(visit.date, dateFilterType, customStartDate, customEndDate),
      ),
    );
  }, [searchFilteredCustomers, dateFilterType, customStartDate, customEndDate]);

  const sortedCustomers = useMemo(() => {
    const sorted = [...dateFilteredCustomers];
    switch (sortBy) {
      case 'spend_desc':
        sorted.sort((a, b) => b.totalSpent - a.totalSpent);
        break;
      case 'visits_desc':
        sorted.sort((a, b) => b.totalVisits - a.totalVisits);
        break;
      case 'recent':
        sorted.sort((a, b) => {
          const dateA = a.lastCheckout ? new Date(a.lastCheckout).getTime() : 0;
          const dateB = b.lastCheckout ? new Date(b.lastCheckout).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'az':
      default:
        sorted.sort((a, b) => a.full_name.localeCompare(b.full_name));
    }
    return sorted;
  }, [dateFilteredCustomers, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedCustomers.length / ITEMS_PER_PAGE));
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedCustomers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedCustomers, currentPage]);

  const summaryStats = useMemo(() => {
    const totalCustomers = sortedCustomers.length;
    const totalVisits = sortedCustomers.reduce((sum, customer) => sum + customer.totalVisits, 0);
    const totalSpent = sortedCustomers.reduce((sum, customer) => sum + customer.totalSpent, 0);
    return { totalCustomers, totalVisits, totalSpent };
  }, [sortedCustomers]);

  if (loading) {
    return (
      <StaffScreenLayout title="Customers">
        <ActivityIndicator color={styles.tokens.goldStrong} style={{ marginTop: 40 }} />
      </StaffScreenLayout>
    );
  }

  if (accessDenied) {
    return (
      <StaffScreenLayout title="Customers" subtitle="You do not have access to customer management.">
        <Text style={styles.textSecondary}>Contact a manager if you need CRM access.</Text>
      </StaffScreenLayout>
    );
  }

  return (
    <StaffScreenLayout title="Customer Management" subtitle="Search, filter, and view customer profiles">
      <View style={[styles.card, { padding: 16, marginBottom: 12, gap: 12 }]}>
        <View>
          <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, marginBottom: 6 }]}>
            SEARCH CUSTOMERS
          </Text>
          <TextInput
            value={searchTerm}
            onChangeText={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
            placeholder="Name, phone, or email"
            placeholderTextColor={styles.tokens.textMuted}
            style={styles.input}
          />
        </View>

        <View>
          <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, marginBottom: 6 }]}>
            SORT BY
          </Text>
          <ScrollSelect
            value={sortBy}
            onChange={(value) => {
              setSortBy(value);
              setCurrentPage(1);
            }}
            options={SORT_OPTIONS}
            placeholder="Sort by"
          />
        </View>

        <View>
          <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, marginBottom: 6 }]}>
            DATE TRACKING
          </Text>
          <ScrollSelect
            value={dateFilterType}
            onChange={(value) => {
              setDateFilterType(value);
              setCurrentPage(1);
              if (value !== 'custom') {
                setCustomStartDate('');
                setCustomEndDate('');
              }
            }}
            options={DATE_FILTER_OPTIONS}
            placeholder="Date filter"
          />
        </View>

        {dateFilterType === 'custom' ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, marginBottom: 6 }]}>
                START DATE
              </Text>
              <TextInput
                value={customStartDate}
                onChangeText={(value) => {
                  setCustomStartDate(value);
                  setCurrentPage(1);
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={styles.tokens.textMuted}
                style={styles.input}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, marginBottom: 6 }]}>
                END DATE
              </Text>
              <TextInput
                value={customEndDate}
                onChangeText={(value) => {
                  setCustomEndDate(value);
                  setCurrentPage(1);
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={styles.tokens.textMuted}
                style={styles.input}
              />
            </View>
          </View>
        ) : null}
      </View>

      <View style={[styles.card, { padding: 16, marginBottom: 16 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1 }]}>ELITE CUSTOMERS</Text>
            <Text style={[styles.textGold, { fontSize: 24, fontWeight: '600', marginTop: 4 }]}>
              {summaryStats.totalCustomers}
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1 }]}>TOTAL VISITS</Text>
            <Text style={[styles.textPrimary, { fontSize: 20, fontWeight: '600', marginTop: 4 }]}>
              {summaryStats.totalVisits}
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1 }]}>REVENUE</Text>
            <Text style={[styles.textGold, { fontSize: 20, fontWeight: '600', marginTop: 4 }]}>
              ${summaryStats.totalSpent.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {sortedCustomers.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Text style={{ fontSize: 36, marginBottom: 8 }}>📦</Text>
          <Text style={[styles.textPrimary, { fontSize: 20, fontWeight: '600', marginBottom: 4 }]}>
            No Records Match
          </Text>
          <Text style={styles.textSecondary}>No records match your criteria or chosen date range</Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {paginatedCustomers.map((customer) => (
            <Pressable
              key={customer.id}
              onPress={() => navigation.navigate('CustomerDetail', { customerId: customer.id })}
              style={({ pressed }) => [
                styles.card,
                {
                  padding: 14,
                  opacity: pressed ? 0.85 : 1,
                  borderColor: pressed ? styles.tokens.goldStrong : styles.tokens.cardBorder,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: `${styles.tokens.goldStrong}33`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={styles.textGold}>{customer.full_name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.textPrimary, { fontWeight: '600', textTransform: 'capitalize' }]}>
                    {customer.full_name}
                  </Text>
                  <Text style={[styles.textSecondary, { fontSize: 13 }]}>{customer.email}</Text>
                  <Text style={[styles.textSecondary, { fontSize: 12 }]}>{customer.phone}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.textPrimary}>{customer.totalVisits} visits</Text>
                  <Text style={styles.textGold}>${customer.totalSpent.toFixed(2)}</Text>
                  <Text style={[styles.textGold, { fontSize: 12 }]}>View →</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {sortedCustomers.length > ITEMS_PER_PAGE ? (
        <View
          style={[
            styles.card,
            {
              marginTop: 16,
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
          ]}
        >
          <Pressable
            onPress={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            style={{ opacity: currentPage === 1 ? 0.3 : 1, padding: 8 }}
          >
            <Text style={styles.textPrimary}>← Previous</Text>
          </Pressable>
          <Text style={[styles.textSecondary, { fontSize: 12 }]}>
            Page {currentPage} of {totalPages}
          </Text>
          <Pressable
            onPress={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
            style={{ opacity: currentPage === totalPages ? 0.3 : 1, padding: 8 }}
          >
            <Text style={styles.textPrimary}>Next →</Text>
          </Pressable>
        </View>
      ) : null}
    </StaffScreenLayout>
  );
}
