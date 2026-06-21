import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import {
  fetchCustomerStats,
  fetchCustomerReceipts,
  fetchReferralInfo,
  fetchCustomerVisitHistory,
  computeServingDurationMinutes,
} from '@nail-couture/shared/utils/customerStats.js';
import { parseVisitFinalServices } from '@nail-couture/shared/utils/appointmentServiceHistory.js';
import { getTierInfo } from '@nail-couture/shared/utils/loyaltyTier.js';
import { formatTierSpend } from '@nail-couture/shared/utils/tierProgress.js';
import { formatFoundingBadge } from '@nail-couture/shared/constants/loyaltyProgram.js';
import {
  parseProfilePreferences,
  labelForOption,
  NAIL_SHAPES,
  NAIL_LENGTHS,
  NAIL_FINISHES,
  VISIT_TIME_OPTIONS,
} from '@nail-couture/shared/utils/profilePreferences.js';
import { fetchLoyaltyHistory, formatTransactionType } from '@nail-couture/shared/utils/loyaltyTransactions.js';
import { fetchStaffNotes, addStaffNote } from '@nail-couture/shared/utils/staffCustomerNotes.js';
import {
  fetchCustomerTimeline,
  adjustCustomerLoyalty,
  deleteVisitPhoto,
} from '@nail-couture/shared/utils/staffCustomerTimeline.js';
import {
  canAccessStaffCrm,
  canEditCustomerProfile,
  canAdjustLoyalty,
  canAddStaffNotes,
  canUploadVisitPhotos,
  canDeleteVisitPhotos,
} from '@nail-couture/shared/utils/staffCustomerAccess.js';
import { enrichVisits, visitDate } from '@nail-couture/shared/utils/visitEnrichment.js';
import { useAuth } from '../../contexts/AuthContext';
import { StaffScreenLayout } from '../../components/staff/StaffScreenLayout';
import { ScrollSelect } from '../../components/forms/ScrollSelect';
import { TimelineEventRow, formatTimelineDate } from '../../components/timeline/TimelineEventRow';
import { AppModal, ModalButton } from '../../components/AppModal';
import { Icon } from '../../components/icons/Icon';
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS, TIER_COLORS } from '../../constants/customerConstants';
import { useThemeStyles } from '../../theme/useThemeStyles';
import {
  pickVisitPhotoFromLibrary,
  takeVisitPhotoFromCamera,
  uploadVisitPhotoFromAsset,
} from '../../utils/visitPhotoUpload';
import type { CustomersStackParamList } from '../../navigation/staffTypes';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'history', label: 'History' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'notes', label: 'Notes' },
  { id: 'loyalty', label: 'Loyalty' },
  { id: 'photos', label: 'Photos' },
] as const;

type TabId = (typeof TABS)[number]['id'];

type ProfileRecord = Record<string, unknown> & {
  id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  birthday?: string;
  nail_goal?: string;
  refreshment_pref?: string;
  loyalty_points?: number;
  loyalty_tier?: string;
  calendar_spend_ytd?: number;
  founding_type?: string | null;
  founding_spot?: number | null;
  referral_code?: string;
  avatar_url?: string;
  role?: string;
  preferences?: unknown;
};

type TimelineEvent = {
  id: string;
  type: string;
  date?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  amount?: number;
  status?: string;
  meta?: Record<string, unknown>;
};

type VisitRecord = Record<string, unknown> & {
  id: string;
  status: string;
  visitAt?: string;
  totalPrice?: number;
  checked_in_at?: string;
  scheduled_at?: string;
  notes?: string;
  booking_type?: string;
  technicians?: { full_name?: string };
  serviceSummary?: {
    finalServices?: { main: string[]; addons: string[] };
    finalWithPrices?: { mainItems?: Array<{ name: string; price?: number | null }>; addonItems?: Array<{ name: string; price?: number | null }> };
    paymentSummary?: Record<string, unknown>;
    changeLog?: Array<Record<string, unknown>>;
    checkIn?: Record<string, unknown>;
    finalLabelText?: string;
  };
};

type EditForm = {
  full_name: string;
  email: string;
  phone: string;
  birthday: string;
  nail_goal: string;
  refreshment_pref: string;
};

const PHOTO_TYPE_OPTIONS = [
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  const styles = useThemeStyles();
  return (
    <View style={[styles.card, { padding: 16, marginBottom: 12 }]}>
      <Text style={[styles.textGold, { fontSize: 17, fontWeight: '600', marginBottom: 12 }]}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const styles = useThemeStyles();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
      <Text style={styles.textSecondary}>{label}</Text>
      <Text style={[styles.textPrimary, { flex: 1, textAlign: 'right' }]}>{value}</Text>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  const styles = useThemeStyles();
  return (
    <View style={[styles.card, { padding: 10, flex: 1, alignItems: 'center' }]}>
      <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1 }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.textGold, { fontSize: 16, fontWeight: '600', marginTop: 4 }]}>{value}</Text>
    </View>
  );
}

function VisitHistoryDetail({
  visit,
  summary,
  finalServices,
}: {
  visit: VisitRecord;
  summary?: VisitRecord['serviceSummary'];
  finalServices: { main: string[]; addons: string[] };
}) {
  const styles = useThemeStyles();
  const servingMinutes = computeServingDurationMinutes(visit);
  const finalItems = summary?.finalWithPrices || {
    mainItems: finalServices.main.map((name) => ({ name, price: null })),
    addonItems: finalServices.addons.map((name) => ({ name, price: null })),
  };

  return (
    <View style={{ paddingTop: 12, gap: 12, borderTopWidth: 1, borderTopColor: styles.tokens.borderLight }}>
      <View style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: styles.tokens.borderLight }}>
        <Text style={[styles.textGold, { fontSize: 12, letterSpacing: 1, marginBottom: 8 }]}>
          SERVICES PERFORMED
        </Text>
        {(finalItems.mainItems || []).map((item) => (
          <Text key={item.name} style={styles.textPrimary}>
            · {item.name}
          </Text>
        ))}
        {(finalItems.addonItems || []).map((item) => (
          <Text key={item.name} style={[styles.textSecondary, { marginLeft: 8 }]}>
            + {item.name}
          </Text>
        ))}
        {!finalServices.main.length && !finalServices.addons.length ? (
          <Text style={styles.textSecondary}>{summary?.finalLabelText || '—'}</Text>
        ) : null}
      </View>

      <View style={{ gap: 6 }}>
        <Row label="Technician" value={visit.technicians?.full_name || 'Unassigned'} />
        <Row label="Booking" value={visit.booking_type === 'online' ? 'Online' : 'Walk-in'} />
        <Row label="Check-in" value={formatTimelineDate(visit.checked_in_at)} />
        {servingMinutes != null ? <Row label="Duration" value={`${servingMinutes} min`} /> : null}
        {visit.scheduled_at && visit.scheduled_at !== visit.checked_in_at ? (
          <Row label="Scheduled" value={formatTimelineDate(visit.scheduled_at)} />
        ) : null}
      </View>

      {visit.notes ? (
        <View>
          <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, marginBottom: 4 }]}>
            VISIT NOTES
          </Text>
          <Text style={styles.textPrimary}>{visit.notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function StaffCustomerDetailScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const navigation = useNavigation<NativeStackNavigationProp<CustomersStackParamList>>();
  const route = useRoute<RouteProp<CustomersStackParamList, 'CustomerDetail'>>();
  const customerId = route.params.customerId;

  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchCustomerStats>> | null>(null);
  const [referralInfo, setReferralInfo] = useState<Awaited<ReturnType<typeof fetchReferralInfo>> | null>(null);
  const [receipts, setReceipts] = useState<Awaited<ReturnType<typeof fetchCustomerReceipts>>>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [notes, setNotes] = useState<Array<{ id: string; note: string; author_name?: string; created_at?: string }>>([]);
  const [notesAvailable, setNotesAvailable] = useState(true);
  const [loyaltyHistory, setLoyaltyHistory] = useState<Array<Record<string, unknown>>>([]);
  const [photos, setPhotos] = useState<TimelineEvent[]>([]);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [newNote, setNewNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [loyaltyDelta, setLoyaltyDelta] = useState('');
  const [loyaltyReason, setLoyaltyReason] = useState('');
  const [loyaltySaving, setLoyaltySaving] = useState(false);
  const [photoType, setPhotoType] = useState('after');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoViewFilter, setPhotoViewFilter] = useState('all');
  const [photoDeletingId, setPhotoDeletingId] = useState<string | null>(null);
  const [deletePhotoTarget, setDeletePhotoTarget] = useState<TimelineEvent | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [visitSearch, setVisitSearch] = useState('');
  const [timelineLoaded, setTimelineLoaded] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [visitsLoaded, setVisitsLoaded] = useState(false);
  const [visitsLoading, setVisitsLoading] = useState(false);

  const canEdit = canEditCustomerProfile(user?.role);
  const canAdjust = canAdjustLoyalty(user?.role);
  const canDeletePhotos = canDeleteVisitPhotos(user?.role);
  const canUploadPhotos = canUploadVisitPhotos(user?.role);
  const canAddNotes = canAddStaffNotes(user?.role);

  const resetEditForm = useCallback((profileData: ProfileRecord) => {
    setEditForm({
      full_name: (profileData.full_name as string) || '',
      email: (profileData.email as string) || '',
      phone: (profileData.phone as string) || '',
      birthday: (profileData.birthday as string) || '',
      nail_goal: (profileData.nail_goal as string) || '',
      refreshment_pref: (profileData.refreshment_pref as string) || '',
    });
  }, []);

  const loadCoreData = useCallback(async () => {
    const { data: profileData, error } = await getSupabase()
      .from('profiles')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error || !profileData || profileData.role !== 'customer') {
      navigation.goBack();
      return null;
    }

    const typedProfile = profileData as ProfileRecord;
    setProfile(typedProfile);
    resetEditForm(typedProfile);
    setEditingProfile(false);

    const [statsData, referral, receiptRows, notesData, loyaltyData] = await Promise.all([
      fetchCustomerStats(customerId, typedProfile.phone as string | undefined),
      fetchReferralInfo(typedProfile),
      fetchCustomerReceipts(customerId, 10),
      fetchStaffNotes(customerId),
      fetchLoyaltyHistory(customerId, 25),
    ]);

    setStats(statsData);
    setReferralInfo(referral);
    setReceipts(receiptRows);
    setNotes(notesData.rows);
    setNotesAvailable(notesData.available);
    setLoyaltyHistory(loyaltyData.rows);

    return typedProfile;
  }, [customerId, navigation, resetEditForm]);

  const loadTimelineData = useCallback(
    async (profileData: ProfileRecord) => {
      setTimelineLoading(true);
      try {
        const timelineData = await fetchCustomerTimeline(customerId, profileData.phone as string | undefined);
        const events = (timelineData.events || []) as TimelineEvent[];
        setTimeline(events);
        setPhotos(events.filter((event) => event.type === 'photo'));
        setTimelineLoaded(true);
      } catch (err) {
        console.error('Failed to load customer timeline:', err);
      } finally {
        setTimelineLoading(false);
      }
    },
    [customerId],
  );

  const loadVisitHistoryData = useCallback(
    async (profileData: ProfileRecord) => {
      setVisitsLoading(true);
      try {
        const visitRows = await fetchCustomerVisitHistory(customerId, profileData.phone as string | undefined, {
          includeOnline: true,
        });
        const enriched = (await enrichVisits(visitRows)) as VisitRecord[];
        enriched.sort(
          (a, b) => new Date(b.visitAt || visitDate(b)).getTime() - new Date(a.visitAt || visitDate(a)).getTime(),
        );
        setVisits(enriched);
        setVisitsLoaded(true);
      } catch (err) {
        console.error('Failed to enrich visit history:', err);
        try {
          const visitRows = await fetchCustomerVisitHistory(customerId, profileData.phone as string | undefined, {
            includeOnline: true,
          });
          const fallback = (visitRows as VisitRecord[]).map((visit) => ({
            ...visit,
            visitAt: visitDate(visit) as string,
            totalPrice: Number(visit.final_price ?? 0),
          }));
          fallback.sort(
            (a, b) => new Date(b.visitAt || 0).getTime() - new Date(a.visitAt || 0).getTime(),
          );
          setVisits(fallback);
          setVisitsLoaded(true);
        } catch (innerErr) {
          console.error('Failed to load visit history:', innerErr);
        }
      } finally {
        setVisitsLoading(false);
      }
    },
    [customerId],
  );

  const loadData = useCallback(async () => {
    setTimelineLoaded(false);
    setVisitsLoaded(false);
    setTimeline([]);
    setVisits([]);
    setPhotos([]);
    return loadCoreData();
  }, [loadCoreData]);

  useEffect(() => {
    const role = user?.role?.toString().trim().toLowerCase();
    if (!user || !role || !canAccessStaffCrm(role)) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [user, loadData]);

  useEffect(() => {
    if (!profile || loading) return;
    if ((activeTab === 'timeline' || activeTab === 'photos') && !timelineLoaded && !timelineLoading) {
      loadTimelineData(profile);
    }
    if (activeTab === 'history' && !visitsLoaded && !visitsLoading) {
      loadVisitHistoryData(profile);
    }
  }, [
    activeTab,
    profile,
    loading,
    timelineLoaded,
    timelineLoading,
    visitsLoaded,
    visitsLoading,
    loadTimelineData,
    loadVisitHistoryData,
  ]);

  const filteredVisits = useMemo(() => {
    const sorted = [...visits].sort(
      (a, b) => new Date(b.visitAt || 0).getTime() - new Date(a.visitAt || 0).getTime(),
    );
    const term = visitSearch.trim().toLowerCase();
    if (!term) return sorted;
    const termDigits = term.replace(/\D/g, '');
    return sorted.filter(() => {
      if (!profile) return false;
      const name = (profile.full_name || '').toLowerCase();
      const email = (profile.email || '').toLowerCase();
      const phone = (profile.phone || '').toLowerCase();
      const phoneDigits = (profile.phone || '').replace(/\D/g, '');
      return (
        name.includes(term) ||
        email.includes(term) ||
        phone.includes(term) ||
        (termDigits.length >= 3 && phoneDigits.includes(termDigits))
      );
    });
  }, [visits, visitSearch, profile]);

  const handleSaveProfile = async () => {
    if (!canEdit || !editForm) return;
    setSaving(true);
    setSaveMsg('');
    const { error } = await getSupabase()
      .from('profiles')
      .update({
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        birthday: editForm.birthday.trim() || null,
        nail_goal: editForm.nail_goal || null,
        refreshment_pref: editForm.refreshment_pref || null,
      })
      .eq('id', customerId);

    setSaving(false);
    if (error) {
      setSaveMsg(error.message);
      return;
    }
    setSaveMsg('Saved');
    setProfile((prev) => (prev ? { ...prev, ...editForm } : prev));
    setEditingProfile(false);
    setTimeout(() => setSaveMsg(''), 2500);
  };

  const handleAddNote = async () => {
    if (!canAddNotes || !newNote.trim()) return;
    setNoteSaving(true);
    const result = await addStaffNote(customerId, newNote, user);
    setNoteSaving(false);
    if (!result.success) {
      setSaveMsg(result.error || 'Failed to add note');
      return;
    }
    setNotes((prev) => [result.note, ...prev]);
    setTimeline((prev) => [
      {
        id: `note-${result.note.id}`,
        type: 'note',
        date: result.note.created_at,
        title: 'Staff note',
        subtitle: `By ${result.note.author_name}`,
        body: result.note.note,
        meta: result.note,
      },
      ...prev,
    ]);
    setNewNote('');
  };

  const handleLoyaltyAdjust = async () => {
    if (!canAdjust) return;
    const delta = parseInt(loyaltyDelta, 10);
    if (Number.isNaN(delta) || delta === 0) {
      setSaveMsg('Enter a non-zero point adjustment');
      return;
    }
    setLoyaltySaving(true);
    setSaveMsg('');
    const result = await adjustCustomerLoyalty(customerId, delta, loyaltyReason, user?.id);
    setLoyaltySaving(false);
    if (!result.success) {
      setSaveMsg(result.error || 'Adjustment failed');
      return;
    }
    setProfile((prev) => (prev ? { ...prev, loyalty_points: result.new_balance } : prev));
    setLoyaltyDelta('');
    setLoyaltyReason('');
    const history = await fetchLoyaltyHistory(customerId, 25);
    setLoyaltyHistory(history.rows);
    setSaveMsg(`Balance updated to ${result.new_balance} pts`);
    setTimeout(() => setSaveMsg(''), 2500);
  };

  const handlePhotoUpload = async (source: 'library' | 'camera') => {
    if (!canUploadPhotos) return;

    const picker = source === 'camera' ? takeVisitPhotoFromCamera : pickVisitPhotoFromLibrary;
    const picked = await picker();
    if (picked.canceled) return;

    setPhotoUploading(true);
    setSaveMsg('');
    const result = await uploadVisitPhotoFromAsset(
      customerId,
      null,
      picked.asset,
      photoType,
      user?.id,
    );
    setPhotoUploading(false);
    if (!result.success) {
      const message = result.error || 'Upload failed';
      setSaveMsg(message);
      Alert.alert('Upload failed', message);
      return;
    }
    if (!('photo' in result) || !result.photo) return;
    const photo = result.photo as Record<string, unknown>;
    const entry: TimelineEvent = {
      id: `photo-${photo.id}`,
      type: 'photo',
      date: photo.created_at as string,
      title: `${photoType === 'before' ? 'Before' : 'After'} photo`,
      subtitle: user?.full_name ? `By ${user.full_name}` : 'By Staff',
      meta: {
        ...photo,
        uploader_name: user?.full_name || 'Staff',
      },
    };
    setPhotos((prev) => [entry, ...prev]);
    setTimeline((prev) => [entry, ...prev]);
  };

  const handlePhotoDelete = async () => {
    if (!canDeletePhotos || !deletePhotoTarget) return;
    const photoEvent = deletePhotoTarget;
    const photoId =
      (photoEvent.meta?.id as string) || photoEvent.id?.replace(/^photo-/, '');
    if (!photoId) return;

    setPhotoDeletingId(photoId);
    const result = await deleteVisitPhoto(photoId, photoEvent.meta?.photo_url as string | undefined);
    setPhotoDeletingId(null);
    setDeletePhotoTarget(null);

    if (!result.success) {
      setSaveMsg(result.error || 'Delete failed');
      return;
    }

    setPhotos((prev) =>
      prev.filter((photo) => (photo.meta?.id || photo.id?.replace(/^photo-/, '')) !== photoId),
    );
    setTimeline((prev) =>
      prev.filter(
        (event) =>
          event.type !== 'photo' || (event.meta?.id || event.id?.replace(/^photo-/, '')) !== photoId,
      ),
    );
  };

  if (loading) {
    return (
      <StaffScreenLayout title="Customer Profile">
        <ActivityIndicator color={styles.tokens.goldStrong} style={{ marginTop: 40 }} />
      </StaffScreenLayout>
    );
  }

  if (accessDenied) {
    return (
      <StaffScreenLayout title="Customer Profile" subtitle="Access denied">
        <Text style={styles.textSecondary}>You do not have CRM access.</Text>
      </StaffScreenLayout>
    );
  }

  if (!profile) return null;

  const tier = getTierInfo(profile);
  const foundingBadge = formatFoundingBadge(profile.founding_type, profile.founding_spot);
  const tierColor = TIER_COLORS[tier.name] || styles.tokens.goldStrong;
  const prefs = parseProfilePreferences(profile.preferences);
  const initials = profile.full_name?.charAt(0)?.toUpperCase() || '?';

  const filteredPhotos =
    photoViewFilter === 'all'
      ? photos
      : photos.filter((photo) => photo.meta?.photo_type === photoViewFilter);

  return (
    <StaffScreenLayout
      title="Customer Profile"
      subtitle={profile.full_name || undefined}
      headerRight={
        !canEdit ? (
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: styles.tokens.borderLight,
            }}
          >
            <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1 }]}>READ-ONLY</Text>
          </View>
        ) : undefined
      }
    >
      <Pressable onPress={() => navigation.goBack()} style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="chevronLeft" size={16} color={styles.tokens.textSecondary} />
        <Text style={styles.textSecondary}>Back to customers</Text>
      </Pressable>

      <View style={[styles.card, { padding: 16, marginBottom: 12 }]}>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
          {profile.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: `${styles.tokens.goldStrong}55` }}
            />
          ) : (
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: `${styles.tokens.goldStrong}33`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={[styles.textGold, { fontSize: 24, fontWeight: '600' }]}>{initials}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.textPrimary, { fontSize: 22, fontWeight: '600', textTransform: 'capitalize' }]}>
              {profile.full_name}
            </Text>
            <Text style={styles.textSecondary}>{profile.email}</Text>
            <Text style={styles.textSecondary}>{profile.phone}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: tierColor,
                }}
              >
                <Text style={{ color: tierColor, fontSize: 12 }}>
                  {tier.name} · {profile.loyalty_points || 0} pts · {formatTierSpend(profile.calendar_spend_ytd)} YTD
                </Text>
              </View>
              {foundingBadge ? (
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: styles.tokens.goldStrong,
                    backgroundColor: `${styles.tokens.goldStrong}18`,
                  }}
                >
                  <Text style={[styles.textGold, { fontSize: 12 }]}>Founding {foundingBadge}</Text>
                </View>
              ) : null}
              {profile.birthday ? (
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: styles.tokens.borderLight,
                  }}
                >
                  <Text style={[styles.textSecondary, { fontSize: 12 }]}>Birthday {profile.birthday}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {stats ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            <StatCard label="Visits" value={String(stats.totalVisits)} />
            <StatCard label="Total spent" value={`$${stats.totalSpent.toFixed(2)}`} />
            <StatCard
              label="Last visit"
              value={stats.lastVisit ? new Date(stats.lastVisit).toLocaleDateString() : '—'}
            />
            <StatCard label="Preferred tech" value={stats.preferredTechnician || '—'} />
          </View>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderBottomWidth: 2,
                  borderBottomColor: active ? styles.tokens.goldStrong : 'transparent',
                  backgroundColor: active ? `${styles.tokens.goldStrong}14` : 'transparent',
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                }}
              >
                <Text style={active ? styles.textGold : styles.textSecondary}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {saveMsg ? (
        <View
          style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 10,
            backgroundColor: `${styles.tokens.goldStrong}18`,
            borderWidth: 1,
            borderColor: `${styles.tokens.goldStrong}44`,
          }}
        >
          <Text style={styles.textGold}>{saveMsg}</Text>
        </View>
      ) : null}

      {activeTab === 'overview' ? (
        <View>
          <Section title="Contact & preferences">
            {canEdit && editingProfile && editForm ? (
              <View style={{ gap: 10 }}>
                {(
                  [
                    ['Name', 'full_name'],
                    ['Email', 'email'],
                    ['Phone', 'phone'],
                    ['Birthday (MM-DD)', 'birthday'],
                    ['Drink preference', 'refreshment_pref'],
                    ['Nail goal', 'nail_goal'],
                  ] as const
                ).map(([label, key]) => (
                  <View key={key}>
                    <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, marginBottom: 4 }]}>
                      {label.toUpperCase()}
                    </Text>
                    <TextInput
                      value={editForm[key]}
                      onChangeText={(value) => setEditForm({ ...editForm, [key]: value })}
                      style={styles.input}
                      placeholderTextColor={styles.tokens.textMuted}
                    />
                  </View>
                ))}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <Pressable
                    onPress={handleSaveProfile}
                    disabled={saving}
                    style={[styles.buttonPrimary, { flex: 1, borderRadius: 10, opacity: saving ? 0.5 : 1 }]}
                  >
                    <Text style={styles.buttonPrimaryText}>{saving ? 'Saving…' : 'Save changes'}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      resetEditForm(profile);
                      setEditingProfile(false);
                    }}
                    disabled={saving}
                    style={[styles.card, { flex: 1, padding: 14, alignItems: 'center' }]}
                  >
                    <Text style={styles.textSecondary}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <Row label="Name" value={profile.full_name || '—'} />
                <Row label="Email" value={profile.email || '—'} />
                <Row label="Phone" value={profile.phone || '—'} />
                <Row label="Birthday" value={profile.birthday || '—'} />
                <Row label="Drink" value={profile.refreshment_pref || '—'} />
                <Row label="Nail goal" value={profile.nail_goal || '—'} />
                <Row label="Shape" value={labelForOption(NAIL_SHAPES, prefs.nail_shape)} />
                <Row label="Length" value={labelForOption(NAIL_LENGTHS, prefs.nail_length)} />
                <Row label="Finish" value={labelForOption(NAIL_FINISHES, prefs.nail_finish)} />
                <Row label="Visit time" value={labelForOption(VISIT_TIME_OPTIONS, prefs.preferred_visit_time)} />
                {prefs.allergies ? (
                  <View
                    style={{
                      marginTop: 8,
                      padding: 12,
                      borderRadius: 10,
                      backgroundColor: 'rgba(239,68,68,0.12)',
                      borderWidth: 1,
                      borderColor: 'rgba(239,68,68,0.35)',
                    }}
                  >
                    <Text style={{ color: '#fca5a5', fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>
                      ALLERGIES / SENSITIVITIES
                    </Text>
                    <Text style={styles.textPrimary}>{prefs.allergies}</Text>
                  </View>
                ) : null}
                {canEdit ? (
                  <Pressable
                    onPress={() => {
                      resetEditForm(profile);
                      setEditingProfile(true);
                    }}
                    style={[styles.buttonPrimary, { marginTop: 12, borderRadius: 10 }]}
                  >
                    <Text style={styles.buttonPrimaryText}>Edit</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </Section>

          <Section title="Service memory">
            <Row label="Last service" value={stats?.lastService || '—'} />
            <Row
              label="Favorite service"
              value={
                stats?.favoriteService
                  ? `${stats.favoriteService} (${stats.favoriteServiceCount}×)`
                  : '—'
              }
            />
            <Row label="Services tried" value={String(stats?.servicesTried ?? '—')} />
          </Section>

          <Section title="Referrals">
            <Row label="Referral code" value={profile.referral_code || '—'} />
            <Row label="Referred by" value={referralInfo?.referredByName || '—'} />
            <Row label="Friends referred" value={String(referralInfo?.referralsCount ?? 0)} />
          </Section>

          {receipts.length > 0 ? (
            <Section title="Recent payments">
              {receipts.slice(0, 5).map((receipt: (typeof receipts)[number]) => (
                <View
                  key={receipt.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: styles.tokens.borderLight,
                  }}
                >
                  <View>
                    <Text style={styles.textPrimary}>{receipt.serviceName}</Text>
                    <Text style={[styles.textSecondary, { fontSize: 12 }]}>{formatTimelineDate(receipt.date)}</Text>
                  </View>
                  <Text style={styles.textGold}>${receipt.finalAmount.toFixed(2)}</Text>
                </View>
              ))}
            </Section>
          ) : null}
        </View>
      ) : null}

      {activeTab === 'history' ? (
        <Section title="Visit history">
          <TextInput
            value={visitSearch}
            onChangeText={setVisitSearch}
            placeholder="Search name, phone, email…"
            placeholderTextColor={styles.tokens.textMuted}
            style={[styles.input, { marginBottom: 12 }]}
          />
          {visitsLoading && visits.length === 0 ? (
            <ActivityIndicator color={styles.tokens.goldStrong} style={{ marginVertical: 24 }} />
          ) : filteredVisits.length === 0 ? (
            <Text style={[styles.textSecondary, { textAlign: 'center', paddingVertical: 24 }]}>
              {visits.length === 0 ? 'No visits recorded yet' : 'No visits match your search'}
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              <Text style={styles.textSecondary}>
                {filteredVisits.length} visit{filteredVisits.length !== 1 ? 's' : ''}
                {visitSearch.trim() ? ' matching search' : ''}
              </Text>
              {filteredVisits.map((visit) => {
                const statusColors = APPOINTMENT_STATUS_COLORS[visit.status] || {
                  bg: `${styles.tokens.borderLight}`,
                  text: styles.tokens.textSecondary,
                };
                const isExpanded = expandedVisitId === visit.id;
                const summary = visit.serviceSummary;
                const finalServices = summary?.finalServices || parseVisitFinalServices(visit);

                return (
                  <View key={visit.id} style={[styles.card, { overflow: 'hidden' }]}>
                    <Pressable
                      onPress={() => setExpandedVisitId(isExpanded ? null : visit.id)}
                      style={{ padding: 14 }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.textPrimary, { fontWeight: '600' }]}>{profile.full_name}</Text>
                          <Text style={[styles.textSecondary, { fontSize: 13 }]}>
                            {profile.phone}
                            {profile.email ? ` · ${profile.email}` : ''}
                          </Text>
                          <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 4 }]}>
                            {formatTimelineDate(visit.visitAt as string)}
                            {visit.technicians?.full_name ? ` · ${visit.technicians.full_name}` : ''}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                          <Text style={styles.textGold}>${Number(visit.totalPrice || 0).toFixed(2)}</Text>
                          <View
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 999,
                              backgroundColor: statusColors.bg,
                            }}
                          >
                            <Text style={{ color: statusColors.text, fontSize: 10, textTransform: 'uppercase' }}>
                              {APPOINTMENT_STATUS_LABELS[visit.status] || visit.status}
                            </Text>
                          </View>
                          <Icon
                            name={isExpanded ? 'chevronUp' : 'chevronDown'}
                            size={16}
                            color={styles.tokens.textSecondary}
                          />
                        </View>
                      </View>
                    </Pressable>
                    {isExpanded ? (
                      <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                        <VisitHistoryDetail visit={visit} summary={summary} finalServices={finalServices} />
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </Section>
      ) : null}

      {activeTab === 'timeline' ? (
        <Section title="Full activity timeline">
          {timelineLoading && timeline.length === 0 ? (
            <ActivityIndicator color={styles.tokens.goldStrong} style={{ marginVertical: 24 }} />
          ) : timeline.length === 0 ? (
            <Text style={[styles.textSecondary, { textAlign: 'center', paddingVertical: 24 }]}>
              No activity recorded yet
            </Text>
          ) : (
            timeline.map((event) => <TimelineEventRow key={event.id} event={event} profile={profile} />)
          )}
        </Section>
      ) : null}

      {activeTab === 'notes' ? (
        <Section title="Internal staff notes">
          {!notesAvailable ? (
            <Text style={[styles.textSecondary, { marginBottom: 12 }]}>
              Run sql/025_phase4_staff_crm.sql to enable notes.
            </Text>
          ) : null}
          {canAddNotes && notesAvailable ? (
            <View style={{ marginBottom: 16 }}>
              <TextInput
                value={newNote}
                onChangeText={setNewNote}
                placeholder="e.g. Prefers quiet, allergic to latex gloves…"
                placeholderTextColor={styles.tokens.textMuted}
                multiline
                numberOfLines={3}
                style={[styles.input, { minHeight: 88, textAlignVertical: 'top' }]}
              />
              <Pressable
                onPress={handleAddNote}
                disabled={noteSaving || !newNote.trim()}
                style={[
                  styles.buttonPrimary,
                  { marginTop: 8, borderRadius: 10, opacity: noteSaving || !newNote.trim() ? 0.5 : 1 },
                ]}
              >
                <Text style={styles.buttonPrimaryText}>{noteSaving ? 'Saving…' : 'Add note'}</Text>
              </Pressable>
            </View>
          ) : null}
          {notes.length === 0 ? (
            <Text style={[styles.textSecondary, { textAlign: 'center', paddingVertical: 20 }]}>
              No staff notes yet
            </Text>
          ) : (
            notes.map((note) => (
              <View
                key={note.id}
                style={[styles.card, { padding: 12, marginBottom: 8, backgroundColor: styles.tokens.inputBg }]}
              >
                <Text style={styles.textPrimary}>{note.note}</Text>
                <Text style={[styles.textSecondary, { fontSize: 11, marginTop: 6 }]}>
                  {note.author_name} · {formatTimelineDate(note.created_at)}
                </Text>
              </View>
            ))
          )}
        </Section>
      ) : null}

      {activeTab === 'loyalty' ? (
        <View>
          <Section title="Loyalty status">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <Text style={[styles.textGold, { fontSize: 32, fontWeight: '600' }]}>
                {profile.loyalty_points || 0}
              </Text>
              <View>
                <Text style={{ color: tierColor, fontWeight: '600' }}>{tier.name} tier</Text>
                <Text style={styles.textSecondary}>{tier.benefit}</Text>
              </View>
            </View>
            {canAdjust ? (
              <View
                style={{
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: styles.tokens.borderLight,
                  gap: 8,
                }}
              >
                <Text style={styles.textSecondary}>Manual adjustment (logged to ledger)</Text>
                <TextInput
                  value={loyaltyDelta}
                  onChangeText={setLoyaltyDelta}
                  placeholder="± points"
                  keyboardType="numeric"
                  placeholderTextColor={styles.tokens.textMuted}
                  style={styles.input}
                />
                <TextInput
                  value={loyaltyReason}
                  onChangeText={setLoyaltyReason}
                  placeholder="Reason (required for audit)"
                  placeholderTextColor={styles.tokens.textMuted}
                  style={styles.input}
                />
                <Pressable
                  onPress={handleLoyaltyAdjust}
                  disabled={loyaltySaving}
                  style={[styles.buttonPrimary, { borderRadius: 10, opacity: loyaltySaving ? 0.5 : 1 }]}
                >
                  <Text style={styles.buttonPrimaryText}>{loyaltySaving ? 'Applying…' : 'Apply'}</Text>
                </Pressable>
              </View>
            ) : null}
          </Section>

          <Section title="Points history">
            {loyaltyHistory.length === 0 ? (
              <Text style={[styles.textSecondary, { textAlign: 'center', paddingVertical: 20 }]}>
                No loyalty transactions
              </Text>
            ) : (
              loyaltyHistory.map((transaction) => (
                <View
                  key={String(transaction.id)}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: styles.tokens.borderLight,
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.textPrimary}>
                      {(transaction.description as string) ||
                        formatTransactionType(transaction.transaction_type as string)}
                    </Text>
                    <Text style={[styles.textSecondary, { fontSize: 12 }]}>
                      {formatTimelineDate(transaction.created_at as string)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: (transaction.points as number) >= 0 ? '#4ade80' : '#f87171' }}>
                      {(transaction.points as number) >= 0 ? '+' : ''}
                      {transaction.points as number}
                    </Text>
                    <Text style={[styles.textSecondary, { fontSize: 12 }]}>
                      Bal {transaction.balance_after as number}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </Section>
        </View>
      ) : null}

      {activeTab === 'photos' ? (
        <Section title="Before & after gallery">
          {canUploadPhotos ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              <View style={{ minWidth: 120, flex: 1 }}>
                <ScrollSelect
                  value={photoType}
                  onChange={setPhotoType}
                  options={PHOTO_TYPE_OPTIONS}
                  placeholder="Photo type"
                />
              </View>
              <Pressable
                onPress={() => handlePhotoUpload('camera')}
                disabled={photoUploading}
                style={[
                  styles.buttonPrimary,
                  { paddingHorizontal: 20, borderRadius: 10, opacity: photoUploading ? 0.6 : 1 },
                ]}
              >
                <Text style={styles.buttonPrimaryText}>
                  {photoUploading ? 'Uploading…' : 'Camera'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handlePhotoUpload('library')}
                disabled={photoUploading}
                style={[
                  styles.buttonPrimary,
                  { paddingHorizontal: 20, borderRadius: 10, opacity: photoUploading ? 0.6 : 1 },
                ]}
              >
                <Text style={styles.buttonPrimaryText}>
                  {photoUploading ? 'Uploading…' : 'Photos'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {[
              { key: 'all', label: 'All', count: photos.length },
              {
                key: 'before',
                label: 'Before',
                count: photos.filter((photo) => photo.meta?.photo_type === 'before').length,
              },
              {
                key: 'after',
                label: 'After',
                count: photos.filter((photo) => photo.meta?.photo_type === 'after').length,
              },
            ].map((filter) => {
              const active = photoViewFilter === filter.key;
              return (
                <Pressable
                  key={filter.key}
                  onPress={() => setPhotoViewFilter(filter.key)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: active ? styles.tokens.goldStrong : 'transparent',
                    borderWidth: 1,
                    borderColor: active ? styles.tokens.goldStrong : styles.tokens.borderLight,
                  }}
                >
                  <Text style={{ color: active ? '#121212' : styles.tokens.textSecondary, fontSize: 12 }}>
                    {filter.label} ({filter.count})
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {timelineLoading && photos.length === 0 ? (
            <ActivityIndicator color={styles.tokens.goldStrong} style={{ marginVertical: 24 }} />
          ) : filteredPhotos.length === 0 ? (
            <Text style={[styles.textSecondary, { textAlign: 'center', paddingVertical: 24 }]}>
              No visit photos yet
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {filteredPhotos.map((photo) => {
                const photoId =
                  (photo.meta?.id as string) || photo.id?.replace(/^photo-/, '');
                return (
                  <View
                    key={photo.id}
                    style={[styles.card, { width: '47%', overflow: 'hidden', padding: 0 }]}
                  >
                    {photo.meta?.photo_url ? (
                      <Image
                        source={{ uri: photo.meta.photo_url as string }}
                        style={{ width: '100%', height: 120 }}
                        resizeMode="cover"
                      />
                    ) : null}
                    {canDeletePhotos ? (
                      <Pressable
                        onPress={() => setDeletePhotoTarget(photo)}
                        disabled={photoDeletingId === photoId}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          borderRadius: 999,
                          padding: 6,
                          opacity: photoDeletingId === photoId ? 0.5 : 1,
                        }}
                      >
                        <Icon name="close" size={14} color="#f87171" />
                      </Pressable>
                    ) : null}
                    <View style={{ padding: 8 }}>
                      <Text style={[styles.textSecondary, { fontSize: 11 }]}>
                        {photo.title}
                        {photo.meta?.uploader_name ? ` · By ${photo.meta.uploader_name as string}` : ''}
                        {' · '}
                        {formatTimelineDate(photo.date)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Section>
      ) : null}

      <AppModal
        open={deletePhotoTarget != null}
        onClose={() => setDeletePhotoTarget(null)}
        title="Remove photo?"
        subtitle="This cannot be undone."
        footer={
          <>
            <ModalButton label="Cancel" onPress={() => setDeletePhotoTarget(null)} />
            <ModalButton label="Remove" variant="danger" onPress={handlePhotoDelete} />
          </>
        }
      />
    </StaffScreenLayout>
  );
}
