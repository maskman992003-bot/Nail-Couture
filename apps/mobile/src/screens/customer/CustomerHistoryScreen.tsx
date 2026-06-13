import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { CUSTOMER_ONLINE_BOOKING } from '@nail-couture/shared/constants/featureFlags.js';
import { fetchCustomerVisitHistory, fetchVisitLoyaltyPoints } from '@nail-couture/shared/utils/customerStats.js';
import { enrichAppointmentsWithServices } from '@nail-couture/shared/utils/appointmentServices.js';
import { getAppointmentTechnicianNames } from '@nail-couture/shared/utils/appointmentServices.js';
import { fetchReviewableAppointments } from '@nail-couture/shared/utils/customerReviewService.js';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { useAuth } from '../../contexts/AuthContext';
import { CustomerScreenLayout } from '../../components/customer/CustomerScreenLayout';
import { AppointmentStatusBadge } from '../../components/customer/AppointmentStatusBadge';
import { AppModal, ModalButton } from '../../components/AppModal';
import { ReviewFormModal } from '../../components/reviews/ReviewFormModal';
import { useThemeStyles } from '../../theme/useThemeStyles';

type VisitRecord = {
  id: string;
  status: string;
  checked_in_at?: string;
  scheduled_at?: string;
  created_at?: string;
  final_price?: number;
  add_ons?: string;
  selected_service_names?: string;
  booking_type?: string;
  services?: { name?: string; price?: number };
  loyaltyPointsEarned?: number | null;
  technicians?: { full_name?: string };
  mainServiceLabel?: string;
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
] as const;

const ACTIVE_STATUSES = ['waiting', 'assigned_pending', 'serving', 'ready_for_checkout', 'pending', 'confirmed', 'in_progress'];
const HISTORY_STATUSES = ['completed', 'cancelled'];

async function resolveCustomerIds(customerId: string, phone?: string) {
  const ids = new Set<string>();
  ids.add(customerId);
  if (phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone) {
      const { data } = await getSupabase().from('profiles').select('id').eq('phone', cleanPhone);
      (data || []).forEach((profile: { id: string }) => ids.add(profile.id));
    }
  }
  return [...ids];
}

export function CustomerHistoryScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const [loading, setLoading] = useState(true);
  const [activeVisits, setActiveVisits] = useState<VisitRecord[]>([]);
  const [bookings, setBookings] = useState<VisitRecord[]>([]);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['key']>('all');
  const [selectedVisit, setSelectedVisit] = useState<VisitRecord | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reviewableIds, setReviewableIds] = useState<Set<string>>(new Set());
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [reviewVisit, setReviewVisit] = useState<VisitRecord | null>(null);

  const fetchData = useCallback(async () => {
    const userId = user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const customerIds = await resolveCustomerIds(userId, user?.phone as string | undefined);
      const [allData, loyaltyByAppt, reviewableRes] = await Promise.all([
        fetchCustomerVisitHistory(userId, user?.phone as string | undefined, {
          includeOnline: CUSTOMER_ONLINE_BOOKING,
        }),
        fetchVisitLoyaltyPoints(customerIds),
        fetchReviewableAppointments(user?.phone as string | undefined),
      ]);

      const enriched = await enrichAppointmentsWithServices(getSupabase(), allData as VisitRecord[]);
      const combined = (enriched as VisitRecord[])
        .map((visit: VisitRecord) => ({
          ...visit,
          loyaltyPointsEarned: loyaltyByAppt[visit.id] || null,
        }))
        .sort((a: VisitRecord, b: VisitRecord) => {
          const dateA = new Date(a.checked_in_at || a.scheduled_at || a.created_at || 0).getTime();
          const dateB = new Date(b.checked_in_at || b.scheduled_at || b.created_at || 0).getTime();
          return dateB - dateA;
        });

      setActiveVisits(combined.filter((visit: VisitRecord) => ACTIVE_STATUSES.includes(visit.status)));
      setBookings(combined.filter((visit: VisitRecord) => HISTORY_STATUSES.includes(visit.status)));
      if (reviewableRes.available) {
        setReviewableIds(new Set((reviewableRes.rows || []).map((row) => row.appointment_id)));
      }
    } catch (err) {
      console.error('Error loading visit history:', err);
    }
    setLoading(false);
  }, [user?.id, user?.phone]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredBookings = useMemo(() => {
    if (activeTab === 'all') return bookings;
    return bookings.filter((visit) => visit.status === activeTab);
  }, [bookings, activeTab]);

  const cancelBooking = async (visit: VisitRecord) => {
    if (!user?.phone) return;
    setCancellingId(visit.id);
    try {
      const { error } = await getSupabase().rpc('cancel_my_appointment', {
        caller_phone: user.phone,
        appointment_id: visit.id,
      });
      if (error) throw error;
      setBookings((prev) => prev.map((item) => (item.id === visit.id ? { ...item, status: 'cancelled' } : item)));
      setSelectedVisit(null);
    } catch (err) {
      console.error('Cancel error:', err);
    }
    setCancellingId(null);
  };

  const canReviewVisit = (visit: VisitRecord) =>
    visit.status === 'completed' && reviewableIds.has(visit.id) && !reviewedIds.has(visit.id);

  const getVisitTechnicianName = (visit: VisitRecord) => {
    const names = getAppointmentTechnicianNames(visit as Parameters<typeof getAppointmentTechnicianNames>[0]);
    if (names.length) return names.join(', ');
    return visit.technicians?.full_name || null;
  };

  const renderVisitRow = (visit: VisitRecord) => {
    const serviceName =
      visit.selected_service_names || visit.add_ons || visit.services?.name || 'Visit';
    const visitDate = visit.checked_in_at || visit.scheduled_at || visit.created_at;

    return (
      <Pressable
        key={visit.id}
        onPress={() => setSelectedVisit(visit)}
        style={{
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: styles.tokens.borderLight,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.textPrimary, { fontWeight: '600' }]} numberOfLines={2}>
              {serviceName}
            </Text>
            {visitDate ? (
              <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 4 }]}>
                {new Date(visitDate).toLocaleString()}
              </Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <AppointmentStatusBadge status={visit.status} />
            {visit.final_price != null ? (
              <Text style={styles.textGold}>${Number(visit.final_price).toFixed(2)}</Text>
            ) : null}
            {canReviewVisit(visit) ? (
              <Pressable
                onPress={(event) => {
                  event.stopPropagation?.();
                  setReviewVisit(visit);
                }}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: styles.tokens.goldStrong,
                }}
              >
                <Text style={[styles.textGold, { fontSize: 11, fontWeight: '600' }]}>Review</Text>
              </Pressable>
            ) : null}
            {reviewedIds.has(visit.id) ? (
              <Text style={[styles.textSecondary, { fontSize: 10 }]}>Review submitted</Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <CustomerScreenLayout>
        <ActivityIndicator color={styles.tokens.goldStrong} style={{ marginTop: 40 }} />
      </CustomerScreenLayout>
    );
  }

  return (
    <CustomerScreenLayout title="Visit History" subtitle="Your salon visits and appointments">
      {activeVisits.length > 0 ? (
        <View style={[styles.card, { padding: 16, marginBottom: 16 }]}>
          <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 2, marginBottom: 8 }]}>
            ACTIVE VISITS
          </Text>
          {activeVisits.map(renderVisitRow)}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: activeTab === tab.key ? styles.tokens.goldStrong : 'transparent',
              borderWidth: activeTab === tab.key ? 0 : 1,
              borderColor: styles.tokens.borderColor,
            }}
          >
            <Text style={{ color: activeTab === tab.key ? '#121212' : styles.tokens.textSecondary, fontSize: 12 }}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.card, { padding: 16 }]}>
        {filteredBookings.length === 0 ? (
          <Text style={[styles.textSecondary, { textAlign: 'center', paddingVertical: 24 }]}>
            No visits in this category yet.
          </Text>
        ) : (
          filteredBookings.map(renderVisitRow)
        )}
      </View>

      <AppModal
        open={Boolean(selectedVisit)}
        onClose={() => setSelectedVisit(null)}
        title="Visit Details"
        scrollBody
        footer={
          selectedVisit && selectedVisit.status === 'completed' && canReviewVisit(selectedVisit) ? (
            <>
              <ModalButton label="Close" onPress={() => setSelectedVisit(null)} />
              <ModalButton
                label="Leave Review"
                variant="primary"
                onPress={() => {
                  setReviewVisit(selectedVisit);
                  setSelectedVisit(null);
                }}
              />
            </>
          ) : selectedVisit && ACTIVE_STATUSES.includes(selectedVisit.status) ? (
            <>
              <ModalButton label="Close" onPress={() => setSelectedVisit(null)} />
              <ModalButton
                label={cancellingId === selectedVisit.id ? 'Cancelling...' : 'Cancel Visit'}
                variant="danger"
                disabled={cancellingId === selectedVisit.id}
                onPress={() => cancelBooking(selectedVisit)}
              />
            </>
          ) : (
            <ModalButton label="Close" variant="primary" onPress={() => setSelectedVisit(null)} />
          )
        }
      >
        {selectedVisit ? (
          <View style={{ gap: 12 }}>
            <View>
              <Text style={styles.textSecondary}>Service</Text>
              <Text style={styles.textPrimary}>
                {selectedVisit.selected_service_names ||
                  selectedVisit.add_ons ||
                  selectedVisit.services?.name ||
                  'Visit'}
              </Text>
            </View>
            <View>
              <Text style={styles.textSecondary}>Status</Text>
              <AppointmentStatusBadge status={selectedVisit.status} />
            </View>
            {selectedVisit.final_price != null ? (
              <View>
                <Text style={styles.textSecondary}>Total</Text>
                <Text style={[styles.textGold, { fontSize: 20, fontWeight: '600' }]}>
                  ${Number(selectedVisit.final_price).toFixed(2)}
                </Text>
              </View>
            ) : null}
            {selectedVisit.loyaltyPointsEarned != null ? (
              <View>
                <Text style={styles.textSecondary}>Points earned</Text>
                <Text style={styles.textPrimary}>+{selectedVisit.loyaltyPointsEarned}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </AppModal>

      <ReviewFormModal
        open={Boolean(reviewVisit)}
        onClose={() => setReviewVisit(null)}
        appointmentId={reviewVisit?.id || ''}
        serviceName={reviewVisit?.mainServiceLabel || reviewVisit?.services?.name}
        technicianName={reviewVisit ? getVisitTechnicianName(reviewVisit) || undefined : undefined}
        callerPhone={user?.phone as string | undefined}
        onSuccess={(appointmentId) => {
          setReviewableIds((prev) => {
            const next = new Set(prev);
            next.delete(appointmentId);
            return next;
          });
          setReviewedIds((prev) => new Set(prev).add(appointmentId));
          setReviewVisit(null);
        }}
      />
    </CustomerScreenLayout>
  );
}
