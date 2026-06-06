import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { fetchGlobalVisitHistory } from '@nail-couture/shared/utils/customerStats.js';
import { fetchGlobalTimeline } from '@nail-couture/shared/utils/staffCustomerTimeline.js';
import { getDateRangeForPreset } from '@nail-couture/shared/utils/activityDateRange.js';
import { enrichVisits } from '@nail-couture/shared/utils/visitEnrichment.js';
import { parseVisitFinalServices } from '@nail-couture/shared/utils/appointmentServiceHistory.js';
import { canViewGlobalVisitHistory } from '@nail-couture/shared/utils/staffCustomerAccess.js';
import { useAuth } from '../../contexts/AuthContext';
import { StaffScreenLayout } from '../../components/staff/StaffScreenLayout';
import { VirtualizedTimelineList } from '../../components/timeline/VirtualizedTimelineList';
import { useThemeStyles } from '../../theme/useThemeStyles';

const PAGE_SIZE = 50;

const DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: '7_days', label: '7 Days' },
  { id: '30_days', label: '30 Days' },
];

const EVENT_TYPES = [
  { id: 'all', label: 'All' },
  { id: 'visit', label: 'Visits' },
  { id: 'payment', label: 'Payments' },
  { id: 'service_change', label: 'Changes' },
  { id: 'note', label: 'Notes' },
  { id: 'loyalty', label: 'Loyalty' },
  { id: 'photo', label: 'Photos' },
  { id: 'waiver', label: 'Waivers' },
];

const TABS = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'history', label: 'Visits' },
] as const;

function matchesSearch(
  customer: { full_name?: string; email?: string; phone?: string } | undefined,
  term: string,
) {
  if (!customer) return false;
  const termDigits = term.replace(/\D/g, '');
  const name = (customer.full_name || '').toLowerCase();
  const email = (customer.email || '').toLowerCase();
  const phone = (customer.phone || '').toLowerCase();
  const phoneDigits = (customer.phone || '').replace(/\D/g, '');
  return (
    name.includes(term) ||
    email.includes(term) ||
    phone.includes(term) ||
    (termDigits.length >= 3 && phoneDigits.includes(termDigits))
  );
}

export function SalonActivityScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const [activeTab, setActiveTab] = useState<'timeline' | 'history'>('timeline');
  const [datePreset, setDatePreset] = useState('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');

  const [timeline, setTimeline] = useState<Array<{ id: string; type: string; title?: string; customer?: { full_name?: string; email?: string; phone?: string }; createdAt?: string }>>([]);
  const [timelineCursor, setTimelineCursor] = useState<{ date: string; id: string } | null>(null);
  const [timelineHasMore, setTimelineHasMore] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const [visits, setVisits] = useState<Array<{ id: string; visitAt: string; status: string; customer?: { full_name?: string; email?: string; phone?: string }; finalServices?: string[] }>>([]);
  const [visitsCursor, setVisitsCursor] = useState<{ date: string; id: string } | null>(null);
  const [visitsHasMore, setVisitsHasMore] = useState(false);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);

  const dateRange = useMemo(() => getDateRangeForPreset(datePreset, '', ''), [datePreset]);

  const filteredTimeline = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return timeline.filter((event) => {
      if (eventTypeFilter !== 'all' && event.type !== eventTypeFilter) return false;
      if (!term) return true;
      return matchesSearch(event.customer, term);
    });
  }, [timeline, searchTerm, eventTypeFilter]);

  const filteredVisits = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const sorted = [...visits].sort((a, b) => new Date(b.visitAt).getTime() - new Date(a.visitAt).getTime());
    if (!term) return sorted;
    return sorted.filter((visit) => matchesSearch(visit.customer, term));
  }, [visits, searchTerm]);

  const loadTimeline = useCallback(async (append = false) => {
    if (!dateRange || !canViewGlobalVisitHistory(user?.role)) return;
    setTimelineLoading(true);
    try {
      const result = await fetchGlobalTimeline({
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
        limit: PAGE_SIZE,
        cursor: append ? timelineCursor : null,
      } as Parameters<typeof fetchGlobalTimeline>[0]);
      setTimeline((prev) => (append ? [...prev, ...result.events] : result.events));
      setTimelineCursor(result.nextCursor);
      setTimelineHasMore(result.hasMore);
    } catch {
      if (!append) setTimeline([]);
    }
    setTimelineLoading(false);
  }, [dateRange, timelineCursor, user?.role]);

  const loadVisits = useCallback(async (append = false) => {
    if (!dateRange || !canViewGlobalVisitHistory(user?.role)) return;
    setVisitsLoading(true);
    try {
      const result = await fetchGlobalVisitHistory({
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
        includeOnline: true,
        limit: PAGE_SIZE,
        cursor: append ? visitsCursor : null,
      } as Parameters<typeof fetchGlobalVisitHistory>[0]);
      const enriched = await enrichVisits(result.rows);
      setVisits((prev) => (append ? [...prev, ...enriched] : enriched));
      setVisitsCursor(result.nextCursor);
      setVisitsHasMore(result.hasMore);
    } catch {
      if (!append) setVisits([]);
    }
    setVisitsLoading(false);
  }, [dateRange, visitsCursor, user?.role]);

  useEffect(() => {
    if (activeTab === 'timeline') loadTimeline(false);
    else loadVisits(false);
  }, [activeTab, datePreset]);

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

  if (!canViewGlobalVisitHistory(user?.role)) {
    return (
      <StaffScreenLayout title="Salon Activity">
        <Text style={styles.textSecondary}>You do not have access to salon activity.</Text>
      </StaffScreenLayout>
    );
  }

  return (
    <StaffScreenLayout title="Salon Activity" subtitle="Global timeline and visit history">
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: activeTab === tab.id ? styles.tokens.goldStrong : styles.tokens.cardBg,
            }}
          >
            <Text style={{ color: activeTab === tab.id ? '#121212' : styles.tokens.textSecondary, fontWeight: '600' }}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {DATE_PRESETS.map((p) => (
          <Pressable key={p.id} onPress={() => setDatePreset(p.id)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: datePreset === p.id ? styles.tokens.goldStrong : styles.tokens.cardBg }}>
            <Text style={{ color: datePreset === p.id ? '#121212' : styles.tokens.textSecondary, fontSize: 12 }}>{p.label}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput value={searchTerm} onChangeText={setSearchTerm} placeholder="Search customers..." placeholderTextColor={styles.tokens.textMuted} style={inputStyle} />

      {activeTab === 'timeline' && (
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {EVENT_TYPES.map((t) => (
            <Pressable key={t.id} onPress={() => setEventTypeFilter(t.id)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: eventTypeFilter === t.id ? styles.tokens.goldStrong : styles.tokens.borderLight }}>
              <Text style={{ color: eventTypeFilter === t.id ? styles.tokens.goldStrong : styles.tokens.textSecondary, fontSize: 11 }}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {(timelineLoading || visitsLoading) && (
        <ActivityIndicator color={styles.tokens.goldStrong} style={{ marginVertical: 24 }} />
      )}

      {activeTab === 'timeline' && !timelineLoading && (
        <>
          {filteredTimeline.length === 0 ? (
            <Text style={[styles.textSecondary, { textAlign: 'center', paddingVertical: 24 }]}>No activity found</Text>
          ) : (
            <VirtualizedTimelineList events={filteredTimeline} />
          )}
          {timelineHasMore && !searchTerm && (
            <Pressable onPress={() => loadTimeline(true)} style={{ alignItems: 'center', padding: 16 }}>
              <Text style={styles.textGold}>Load more</Text>
            </Pressable>
          )}
        </>
      )}

      {activeTab === 'history' && !visitsLoading && (
        <>
          {filteredVisits.length === 0 ? (
            <Text style={[styles.textSecondary, { textAlign: 'center', paddingVertical: 24 }]}>No visits found</Text>
          ) : (
            filteredVisits.map((visit) => {
              const parsed = parseVisitFinalServices(visit);
              const services = [...parsed.main, ...parsed.addons];
              const expanded = expandedVisitId === visit.id;
              return (
                <Pressable
                  key={visit.id}
                  onPress={() => setExpandedVisitId(expanded ? null : visit.id)}
                  style={[styles.card, { padding: 14, marginBottom: 8 }]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[styles.textPrimary, { fontWeight: '600' }]}>{visit.customer?.full_name || 'Guest'}</Text>
                    <Text style={{ fontSize: 11, color: '#4ade80' }}>{visit.status}</Text>
                  </View>
                  <Text style={styles.textSecondary}>
                    {new Date(visit.visitAt).toLocaleString()}
                  </Text>
                  {expanded && (
                    <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: styles.tokens.borderLight }}>
                      {services.map((s, i) => (
                        <Text key={i} style={styles.textSecondary}>• {s}</Text>
                      ))}
                    </View>
                  )}
                </Pressable>
              );
            })
          )}
          {visitsHasMore && !searchTerm && (
            <Pressable onPress={() => loadVisits(true)} style={{ alignItems: 'center', padding: 16 }}>
              <Text style={styles.textGold}>Load more</Text>
            </Pressable>
          )}
        </>
      )}
    </StaffScreenLayout>
  );
}
