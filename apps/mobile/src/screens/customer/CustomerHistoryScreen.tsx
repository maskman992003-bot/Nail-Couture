import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { CUSTOMER_ONLINE_BOOKING } from '@nail-couture/shared/constants/featureFlags.js';
import { fetchCustomerVisitHistory, fetchVisitLoyaltyPoints } from '@nail-couture/shared/utils/customerStats.js';
import { enrichAppointmentsWithServices } from '@nail-couture/shared/utils/appointmentServices.js';
import { getAppointmentTechnicianNames } from '@nail-couture/shared/utils/appointmentServices.js';
import { fetchReviewableAppointments } from '@nail-couture/shared/utils/customerReviewService.js';
import { getDateRangeForPreset } from '@nail-couture/shared/utils/activityDateRange.js';
import {
  VISIT_HISTORY_PAGE_SIZE,
  paginateRows,
} from '@nail-couture/shared/utils/pagination.js';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { useAuth } from '../../contexts/AuthContext';
import { CustomerScreenLayout } from '../../components/customer/CustomerScreenLayout';
import { AppointmentStatusBadge } from '../../components/customer/AppointmentStatusBadge';
import { AppModal, ModalButton } from '../../components/AppModal';
import { ReviewFormModal } from '../../components/reviews/ReviewFormModal';
import { ListPagination } from '../../components/ListPagination';
import { useThemeStyles } from '../../theme/useThemeStyles';
import { shareVisitReceiptWithAlert } from '../../utils/receiptShare';

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
  addonDetails?: { id: string; name: string }[];
};

const DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: '7_days', label: '7 days' },
  { id: '30_days', label: '30 days' },
  { id: 'custom', label: 'Custom' },
  { id: 'all', label: 'All history' },
] as const;

const getVisitDate = (visit: VisitRecord) => visit.checked_in_at || visit.scheduled_at || visit.created_at;

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
  const [selectedVisit, setSelectedVisit] = useState<VisitRecord | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reviewableIds, setReviewableIds] = useState<Set<string>>(new Set());
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [reviewVisit, setReviewVisit] = useState<VisitRecord | null>(null);
  const [datePreset, setDatePreset] = useState<(typeof DATE_PRESETS)[number]['id']>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [receiptLoadingId, setReceiptLoadingId] = useState<string | null>(null);

  const dateRange = useMemo(() => {
    if (datePreset === 'all') return null;
    return getDateRangeForPreset(datePreset, customStart, customEnd);
  }, [datePreset, customStart, customEnd]);

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

  const getVisitTechnicianName = (visit: VisitRecord) => {
    const names = getAppointmentTechnicianNames(visit as Parameters<typeof getAppointmentTechnicianNames>[0]);
    if (names.length) return names.join(', ');
    return visit.technicians?.full_name || null;
  };

  const matchesSearch = useCallback((visit: VisitRecord, term: string) => {
    if (!term) return true;
    const service = (
      visit.mainServiceLabel ||
      visit.selected_service_names ||
      visit.add_ons ||
      visit.services?.name ||
      ''
    ).toLowerCase();
    const tech = (getVisitTechnicianName(visit) || '').toLowerCase();
    const addons = (visit.addonDetails || []).map((addon) => addon.name).join(' ').toLowerCase();
    return service.includes(term) || tech.includes(term) || addons.includes(term);
  }, []);

  const filteredBookings = useMemo(() => {
    if (datePreset === 'custom' && !dateRange) return [];
    let result = bookings;
    if (dateRange) {
      const from = new Date(dateRange.fromDate).getTime();
      const to = new Date(dateRange.toDate).getTime();
      result = result.filter((visit) => {
        const visitTime = new Date(getVisitDate(visit) || 0).getTime();
        return visitTime >= from && visitTime <= to;
      });
    }
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter((visit) => matchesSearch(visit, term));
    }
    return result;
  }, [bookings, datePreset, dateRange, searchTerm, matchesSearch]);

  const historyPagination = useMemo(
    () => paginateRows(filteredBookings, historyPage, VISIT_HISTORY_PAGE_SIZE),
    [filteredBookings, historyPage],
  );

  useEffect(() => {
    setHistoryPage(1);
  }, [datePreset, customStart, customEnd, searchTerm]);

  useEffect(() => {
    if (historyPage > historyPagination.totalPages) {
      setHistoryPage(historyPagination.totalPages);
    }
  }, [historyPage, historyPagination.totalPages]);

  const emptyMessage = useMemo(() => {
    if (bookings.length === 0) return 'No visits yet.';
    if (datePreset === 'custom' && !dateRange) return 'Select start and end dates.';
    if (searchTerm.trim()) return 'No visits match your search for this period.';
    if (datePreset === 'today') return 'No visits today. Try 7 days or 30 days.';
    return 'No visits for this period. Try a wider date range.';
  }, [bookings.length, datePreset, dateRange, searchTerm]);

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

  const shareReceipt = async (visit: VisitRecord) => {
    setReceiptLoadingId(visit.id);
    try {
      await shareVisitReceiptWithAlert(visit);
    } finally {
      setReceiptLoadingId(null);
    }
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
            {visit.status === 'completed' ? (
              <Pressable
                onPress={(event) => {
                  event.stopPropagation?.();
                  shareReceipt(visit);
                }}
                disabled={receiptLoadingId === visit.id}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: styles.tokens.goldStrong,
                  opacity: receiptLoadingId === visit.id ? 0.5 : 1,
                }}
              >
                <Text style={[styles.textGold, { fontSize: 11, fontWeight: '600' }]}>
                  {receiptLoadingId === visit.id ? '…' : 'Receipt'}
                </Text>
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

      <View style={[styles.card, { padding: 14, marginBottom: 12, gap: 10 }]}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {DATE_PRESETS.map((preset) => (
            <Pressable
              key={preset.id}
              onPress={() => setDatePreset(preset.id)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: datePreset === preset.id ? styles.tokens.goldStrong : styles.tokens.borderColor,
                backgroundColor: datePreset === preset.id ? 'rgba(197,160,89,0.12)' : 'transparent',
              }}
            >
              <Text style={{ color: datePreset === preset.id ? styles.tokens.goldStrong : styles.tokens.textSecondary, fontSize: 12 }}>
                {preset.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {datePreset === 'custom' ? (
          <View style={{ gap: 8 }}>
            <TextInput
              value={customStart}
              onChangeText={setCustomStart}
              placeholder="Start date YYYY-MM-DD"
              placeholderTextColor={styles.tokens.textMuted}
              style={{
                borderWidth: 1,
                borderColor: styles.tokens.borderColor,
                borderRadius: 10,
                padding: 10,
                color: styles.tokens.textPrimary,
              }}
            />
            <TextInput
              value={customEnd}
              onChangeText={setCustomEnd}
              placeholder="End date YYYY-MM-DD"
              placeholderTextColor={styles.tokens.textMuted}
              style={{
                borderWidth: 1,
                borderColor: styles.tokens.borderColor,
                borderRadius: 10,
                padding: 10,
                color: styles.tokens.textPrimary,
              }}
            />
          </View>
        ) : null}

        <TextInput
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Search service or technician…"
          placeholderTextColor={styles.tokens.textMuted}
          style={{
            borderWidth: 1,
            borderColor: styles.tokens.borderColor,
            borderRadius: 10,
            padding: 10,
            color: styles.tokens.textPrimary,
          }}
        />

        {(dateRange || datePreset === 'all') && !loading ? (
          <Text style={[styles.textSecondary, { fontSize: 12 }]}>
            {filteredBookings.length} visit{filteredBookings.length !== 1 ? 's' : ''}
            {searchTerm.trim() ? ' matching search' : datePreset === 'all' ? '' : ' in this period'}
          </Text>
        ) : null}
      </View>

      <View style={[styles.card, { padding: 16 }]}>
        {filteredBookings.length === 0 ? (
          <Text style={[styles.textSecondary, { textAlign: 'center', paddingVertical: 24 }]}>
            {emptyMessage}
          </Text>
        ) : (
          <>
            {historyPagination.pageRows.map(renderVisitRow)}
            <ListPagination pagination={historyPagination} onPageChange={setHistoryPage} />
          </>
        )}
      </View>

      <AppModal
        open={Boolean(selectedVisit)}
        onClose={() => setSelectedVisit(null)}
        title="Visit Details"
        scrollBody
        footer={
          selectedVisit && selectedVisit.status === 'completed' ? (
            <>
              <ModalButton label="Close" onPress={() => setSelectedVisit(null)} />
              {canReviewVisit(selectedVisit) ? (
                <ModalButton
                  label="Leave Review"
                  variant="primary"
                  onPress={() => {
                    setReviewVisit(selectedVisit);
                    setSelectedVisit(null);
                  }}
                />
              ) : null}
              <ModalButton
                label={receiptLoadingId === selectedVisit.id ? 'Preparing…' : 'Share Receipt'}
                variant={canReviewVisit(selectedVisit) ? 'secondary' : 'primary'}
                disabled={receiptLoadingId === selectedVisit.id}
                onPress={() => shareReceipt(selectedVisit)}
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
