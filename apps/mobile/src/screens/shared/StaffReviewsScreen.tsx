import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import {
  fetchStaffCustomerReviews,
  fetchTechnicianReviews,
  formatReviewDate,
  moderateCustomerReview,
} from '@nail-couture/shared/utils/customerReviewService.js';
import { getDateRangeForPreset } from '@nail-couture/shared/utils/activityDateRange.js';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { useAuth } from '../../contexts/AuthContext';
import { StaffScreenLayout } from '../../components/staff/StaffScreenLayout';
import { useThemeStyles } from '../../theme/useThemeStyles';

const MANAGEMENT_ROLES = new Set(['super_admin', 'owner', 'partner', 'admin']);
const EXECUTIVE_ROLES = new Set(['super_admin', 'owner', 'partner']);
const PAGE_SIZE = 50;

const DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: '7_days', label: '7 days' },
  { id: '30_days', label: '30 days' },
  { id: 'custom', label: 'Custom' },
] as const;

type ReviewRow = {
  id: string;
  rating: number;
  comment?: string | null;
  created_at?: string;
  customer_name?: string;
  service_name?: string;
  technician_name?: string;
  is_hidden?: boolean;
};

type TechnicianOption = { id: string; full_name?: string | null };

export function StaffReviewsScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [summary, setSummary] = useState({ avgRating: null as number | null, reviewCount: 0 });
  const [hasMore, setHasMore] = useState(false);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [technicianFilter, setTechnicianFilter] = useState('');
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<(typeof DATE_PRESETS)[number]['id']>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filtersClientSide, setFiltersClientSide] = useState(false);

  const isTechnician = user?.role === 'technician';
  const canModerate = MANAGEMENT_ROLES.has(user?.role || '');
  const canPublish = MANAGEMENT_ROLES.has(user?.role || '');
  const canViewHidden = EXECUTIVE_ROLES.has(user?.role || '');
  const canFilter = !isTechnician;

  const dateRange = useMemo(
    () => getDateRangeForPreset(datePreset, customStart, customEnd),
    [datePreset, customStart, customEnd],
  );

  const title = isTechnician ? 'My Reviews' : 'Customer Reviews';
  const subtitle = isTechnician
    ? 'Feedback from your completed visits'
    : 'Salon-wide ratings and comments';

  useEffect(() => {
    if (!canFilter) return;
    getSupabase()
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'technician')
      .order('full_name')
      .then(({ data }) => setTechnicians((data as TechnicianOption[]) || []));
  }, [canFilter]);

  const loadReviews = useCallback(
    async ({ append = false, offset = 0 } = {}) => {
      if (!user?.phone || !dateRange) {
        setLoading(false);
        return;
      }
      if (append) setLoadingMore(true);
      else setLoading(true);

      const query = {
        limit: PAGE_SIZE,
        offset,
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
        search: searchTerm.trim() || null,
        includeHidden: canViewHidden,
      };

      try {
        let result;
        if (isTechnician && user.id) {
          result = await fetchTechnicianReviews(user.id, {
            ...query,
            callerPhone: user.phone,
          });
        } else {
          result = await fetchStaffCustomerReviews(user.phone, {
            ...query,
            technicianId: technicianFilter || null,
          });
        }

        if (result.available) {
          setLoadError(result.error ? String(result.error.message || 'Could not load reviews.') : null);
          setFiltersClientSide(Boolean(result.filtersClientSide));
          setSummary(result.summary || { avgRating: null, reviewCount: 0 });
          setReviews((prev) =>
            append ? [...prev, ...((result.reviews as ReviewRow[]) || [])] : (result.reviews as ReviewRow[]) || [],
          );
          setHasMore(Boolean(result.hasMore));
        } else if (!append) {
          setLoadError('Reviews are not set up yet. Run migrations 063–066 in Supabase.');
          setFiltersClientSide(false);
          setSummary({ avgRating: null, reviewCount: 0 });
          setReviews([]);
          setHasMore(false);
        }
      } catch {
        if (!append) {
          setLoadError('Could not load reviews. Try again.');
          setReviews([]);
          setSummary({ avgRating: null, reviewCount: 0 });
        }
      }

      setLoading(false);
      setLoadingMore(false);
    },
    [user?.phone, user?.id, isTechnician, technicianFilter, dateRange, searchTerm, canViewHidden],
  );

  useEffect(() => {
    if (!dateRange) return;
    loadReviews();
  }, [dateRange, technicianFilter, searchTerm, loadReviews]);

  const handleModerate = async (review: ReviewRow, action: 'hide' | 'unhide' | 'delete') => {
    if (!user?.phone || !canModerate) return;
    setModeratingId(review.id);
    const { error, available } = await moderateCustomerReview(user.phone, review.id, action);
    if (available && !error) {
      if (action === 'delete' || (action === 'hide' && !canViewHidden)) {
        setReviews((prev) => prev.filter((r) => r.id !== review.id));
        setSummary((prev) => ({
          ...prev,
          reviewCount: Math.max(0, (prev.reviewCount || 0) - 1),
        }));
      } else if (action === 'hide') {
        setReviews((prev) =>
          prev.map((r) => (r.id === review.id ? { ...r, is_hidden: true } : r)),
        );
      } else if (action === 'unhide') {
        setReviews((prev) =>
          prev.map((r) => (r.id === review.id ? { ...r, is_hidden: false } : r)),
        );
      }
      await loadReviews();
    }
    setModeratingId(null);
  };

  const handlePublish = (_review: ReviewRow) => {
    // Social media publish integration coming soon
  };

  const handleDeleteRequest = (review: ReviewRow) => {
    Alert.alert(
      'Delete review?',
      `Permanently remove this review from ${review.customer_name || 'this customer'}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleModerate(review, 'delete'),
        },
      ],
    );
  };

  const emptyMessage = useMemo(() => {
    if (datePreset === 'custom' && !dateRange) return 'Select start and end dates.';
    if (searchTerm.trim()) return 'No reviews match your search.';
    if (datePreset === 'today') return 'No reviews today. Try Last 7 or 30 days.';
    return 'No reviews for this period. Try a wider date range.';
  }, [datePreset, dateRange, searchTerm]);

  return (
    <StaffScreenLayout title={title} subtitle={subtitle}>
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
          placeholder="Search client, phone, service, comment…"
          placeholderTextColor={styles.tokens.textMuted}
          style={{
            borderWidth: 1,
            borderColor: styles.tokens.borderColor,
            borderRadius: 10,
            padding: 10,
            color: styles.tokens.textPrimary,
          }}
        />

        {canFilter ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Pressable
              onPress={() => setTechnicianFilter('')}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: !technicianFilter ? styles.tokens.goldStrong : 'transparent',
                borderWidth: 1,
                borderColor: styles.tokens.borderColor,
              }}
            >
              <Text style={{ color: !technicianFilter ? '#121212' : styles.tokens.textSecondary, fontSize: 12 }}>
                All techs
              </Text>
            </Pressable>
            {technicians.map((tech) => (
              <Pressable
                key={tech.id}
                onPress={() => setTechnicianFilter(tech.id)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: technicianFilter === tech.id ? styles.tokens.goldStrong : 'transparent',
                  borderWidth: 1,
                  borderColor: styles.tokens.borderColor,
                }}
              >
                <Text
                  style={{
                    color: technicianFilter === tech.id ? '#121212' : styles.tokens.textSecondary,
                    fontSize: 12,
                  }}
                >
                  {tech.full_name || 'Technician'}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {loadError ? (
        <View style={[styles.card, { padding: 12, marginBottom: 12, borderColor: '#b45309' }]}>
          <Text style={{ color: '#fcd34d', fontSize: 13 }}>{loadError}</Text>
        </View>
      ) : null}

      {filtersClientSide && !loadError ? (
        <View style={[styles.card, { padding: 12, marginBottom: 12 }]}>
          <Text style={[styles.textSecondary, { fontSize: 13 }]}>
            Apply migration 066 in Supabase for full date filtering. Try Last 30 days if today looks empty.
          </Text>
        </View>
      ) : null}

      <View style={[styles.card, { padding: 16, marginBottom: 16 }]}>
        <Text style={styles.textGold}>
          {summary.avgRating != null ? `${Number(summary.avgRating).toFixed(1)} ★` : '—'}
        </Text>
        <Text style={styles.textSecondary}>
          {summary.reviewCount} review{summary.reviewCount === 1 ? '' : 's'} in period
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={styles.tokens.goldStrong} style={{ marginTop: 24 }} />
      ) : !dateRange ? (
        <Text style={[styles.textSecondary, { textAlign: 'center', paddingVertical: 24 }]}>{emptyMessage}</Text>
      ) : reviews.length === 0 ? (
        <Text style={[styles.textSecondary, { textAlign: 'center', paddingVertical: 24 }]}>{emptyMessage}</Text>
      ) : (
        <>
          {reviews.map((review) => (
            <View
              key={review.id}
              style={[
                styles.card,
                {
                  padding: 16,
                  marginBottom: 12,
                  opacity: review.is_hidden ? 0.65 : 1,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.textPrimary, { fontWeight: '600' }]}>
                    {review.customer_name || 'Customer'}
                  </Text>
                  <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 4 }]}>
                    {formatReviewDate(review.created_at)}
                  </Text>
                </View>
                <Text style={styles.textGold}>{'★'.repeat(review.rating)}</Text>
              </View>
              {!isTechnician && review.technician_name ? (
                <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 6 }]}>
                  {review.service_name} · {review.technician_name}
                </Text>
              ) : review.service_name ? (
                <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 6 }]}>{review.service_name}</Text>
              ) : null}
              {review.comment ? (
                <Text style={[styles.textPrimary, { marginTop: 8, lineHeight: 20 }]}>{review.comment}</Text>
              ) : null}
              {review.is_hidden ? (
                <Text style={{ color: '#fbbf24', fontSize: 11, marginTop: 8 }}>Hidden from public</Text>
              ) : null}
              {canModerate || canPublish ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {canModerate ? (
                    <>
                      <Pressable
                        disabled={moderatingId === review.id}
                        onPress={() => handleModerate(review, review.is_hidden ? 'unhide' : 'hide')}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: styles.tokens.goldStrong,
                        }}
                      >
                        <Text style={[styles.textGold, { fontSize: 11 }]}>
                          {review.is_hidden ? 'Unhide' : 'Hide'}
                        </Text>
                      </Pressable>
                      <Pressable
                        disabled={moderatingId === review.id}
                        onPress={() => handleDeleteRequest(review)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: '#f87171',
                        }}
                      >
                        <Text style={{ color: '#f87171', fontSize: 11 }}>Delete</Text>
                      </Pressable>
                    </>
                  ) : null}
                  {canPublish ? (
                    <Pressable
                      onPress={() => handlePublish(review)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#34d399',
                      }}
                    >
                      <Text style={{ color: '#34d399', fontSize: 11 }}>Publish</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          ))}
          {hasMore ? (
            <Pressable
              onPress={() => loadReviews({ append: true, offset: reviews.length })}
              disabled={loadingMore}
              style={{
                paddingVertical: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: styles.tokens.goldStrong,
                alignItems: 'center',
                marginTop: 4,
              }}
            >
              <Text style={styles.textGold}>{loadingMore ? 'Loading…' : 'Load more'}</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </StaffScreenLayout>
  );
}
