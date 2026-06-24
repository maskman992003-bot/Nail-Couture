import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import clsx from 'clsx';
import { getCustomersPath, getHomePath } from '@nail-couture/shared/utils/routes';
import {
  fetchCustomerStats,
  fetchCustomerReceipts,
  fetchReferralInfo,
  fetchCustomerVisitHistory,
  computeServingDurationMinutes,
} from '@nail-couture/shared/utils/customerStats';
import {
  parseVisitFinalServices,
} from '@nail-couture/shared/utils/appointmentServiceHistory';
import { getTierInfo, isBirthdayMonth, getTierBenefitsList } from '@nail-couture/shared/utils/loyaltyTier';
import { formatTierSpend } from '@nail-couture/shared/utils/tierProgress.js';
import { formatFoundingBadge, getTierConfig, BIRTHDAY_PERK_NOTE_PREFIX, getStaffBirthdayMonthGuidance } from '@nail-couture/shared/constants/loyaltyProgram.js';
import {
  parseProfilePreferences,
  labelForOption,
  NAIL_SHAPES,
  NAIL_LENGTHS,
  NAIL_FINISHES,
  VISIT_TIME_OPTIONS,
} from '@nail-couture/shared/utils/profilePreferences';
import { fetchLoyaltyHistory, formatTransactionType } from '@nail-couture/shared/utils/loyaltyTransactions';
import {
  formatGiftCardCode,
  getCustomerGiftCards,
  getGiftCardDisplayStatus,
  getGiftCardExpiryLabel,
  GIFT_CARD_STATUS_LABELS,
  isGiftCardExpired,
  voidGiftCard,
} from '@nail-couture/shared/utils/giftCards';
import { fetchStaffNotes, addStaffNote } from '@nail-couture/shared/utils/staffCustomerNotes';
import {
  fetchCustomerTimeline,
  adjustCustomerLoyalty,
  uploadVisitPhoto,
  deleteVisitPhoto,
} from '@nail-couture/shared/utils/staffCustomerTimeline';
import { STAFF_GIFT_CARDS } from '@nail-couture/shared/constants/featureFlags';
import {
  canAccessStaffCrm,
  canEditCustomerProfile,
  canAdjustLoyalty,
  canAddStaffNotes,
  canUploadVisitPhotos,
  canDeleteVisitPhotos,
  canViewCustomerGiftCards,
  canVoidCustomerGiftCards,
} from '@nail-couture/shared/utils/staffCustomerAccess';
import { formatTimelineDate } from './TimelineEventRow';
import VirtualizedTimelineList from './VirtualizedTimelineList';
import ThemeSelect from './ThemeSelect';
import TechnicianNailSummary from './nails/TechnicianNailSummary';
import { getDateRangeForPreset } from '@nail-couture/shared/utils/activityDateRange';
import { enrichVisits, visitDate } from '@nail-couture/shared/utils/visitEnrichment';
import WebCameraCapture from './WebCameraCapture.jsx';
import { clickFileInput, openWebCameraPicker } from '../utils/mobileFilePickers.js';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'history', label: 'History' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'notes', label: 'Notes' },
  { id: 'loyalty', label: 'Loyalty' },
  { id: 'gift-cards', label: 'Gift Cards' },
  { id: 'photos', label: 'Photos' },
];

const TIMELINE_DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: '7_days', label: 'Last 7 days' },
  { id: '30_days', label: 'Last 30 days' },
  { id: 'custom', label: 'Custom' },
  { id: 'all', label: 'All history' },
];

const TIMELINE_EVENT_TYPES = [
  { id: 'all', label: 'All events' },
  { id: 'visit', label: 'Visits' },
  { id: 'payment', label: 'Payments' },
  { id: 'service_change', label: 'Service changes' },
  { id: 'note', label: 'Notes' },
  { id: 'loyalty', label: 'Loyalty' },
  { id: 'photo', label: 'Photos' },
  { id: 'waiver', label: 'Waivers' },
];

const VISIT_STATUS = {
  waiting: { label: 'Waiting', color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50' },
  assigned_pending: { label: 'Assigned', color: 'bg-blue-900/50 text-blue-300 border-blue-700/50' },
  serving: { label: 'In Chair', color: 'bg-green-900/50 text-green-300 border-green-700/50' },
  ready_for_checkout: { label: 'At Checkout', color: 'bg-amber-900/50 text-amber-300 border-amber-700/50' },
  completed: { label: 'Completed', color: 'bg-green-800/40 text-green-300 border-green-700/30' },
  cancelled: { label: 'Cancelled', color: 'bg-red-900/50 text-red-300 border-red-700/50' },
  pending: { label: 'Pending', color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-900/50 text-blue-300 border-blue-700/50' },
  in_progress: { label: 'In Progress', color: 'bg-green-900/50 text-green-300 border-green-700/50' },
};

const formatDate = formatTimelineDate;

function splitNames(value) {
  if (!value) return [];
  return value.split(',').map((n) => n.trim()).filter(Boolean);
}

export default function StaffCustomerDetail() {
  const { id: customerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const photoInputRef = useRef(null);
  const cameraCaptureInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [referralInfo, setReferralInfo] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [notesAvailable, setNotesAvailable] = useState(true);
  const [loyaltyHistory, setLoyaltyHistory] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [visits, setVisits] = useState([]);
  const [expandedVisitId, setExpandedVisitId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [newNote, setNewNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [loyaltyDelta, setLoyaltyDelta] = useState('');
  const [loyaltyReason, setLoyaltyReason] = useState('');
  const [loyaltySaving, setLoyaltySaving] = useState(false);
  const [photoType, setPhotoType] = useState('after');
  const [photoViewFilter, setPhotoViewFilter] = useState('all');
  const [showCamera, setShowCamera] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoDeletingId, setPhotoDeletingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [visitSearch, setVisitSearch] = useState('');
  const [timelineLoaded, setTimelineLoaded] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineDatePreset, setTimelineDatePreset] = useState('today');
  const [timelineCustomStart, setTimelineCustomStart] = useState('');
  const [timelineCustomEnd, setTimelineCustomEnd] = useState('');
  const [timelineEventFilter, setTimelineEventFilter] = useState('visit');
  const [visitsLoaded, setVisitsLoaded] = useState(false);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [customerGiftCards, setCustomerGiftCards] = useState([]);
  const [giftCardsLoaded, setGiftCardsLoaded] = useState(false);
  const [giftCardsLoading, setGiftCardsLoading] = useState(false);
  const [voidingGiftCardId, setVoidingGiftCardId] = useState(null);

  const canEdit = canEditCustomerProfile(user?.role);
  const canAdjust = canAdjustLoyalty(user?.role);
  const canVoidGiftCards = canVoidCustomerGiftCards(user?.role);
  const canDeletePhotos = canDeleteVisitPhotos(user?.role);
  const showGiftCardsTab = STAFF_GIFT_CARDS && canViewCustomerGiftCards(user?.role);
  const visibleTabs = useMemo(
    () => TABS.filter((tab) => tab.id !== 'gift-cards' || showGiftCardsTab),
    [showGiftCardsTab],
  );

  const filteredVisits = useMemo(() => {
    const sorted = [...visits].sort((a, b) => new Date(b.visitAt) - new Date(a.visitAt));
    const term = visitSearch.trim().toLowerCase();
    if (!term) return sorted;
    const termDigits = term.replace(/\D/g, '');
    return sorted.filter((visit) => {
      const c = profile;
      if (!c) return false;
      const name = (c.full_name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const phoneDigits = (c.phone || '').replace(/\D/g, '');
      return name.includes(term)
        || email.includes(term)
        || phone.includes(term)
        || (termDigits.length >= 3 && phoneDigits.includes(termDigits));
    });
  }, [visits, visitSearch, profile]);

  const timelineDateRange = useMemo(() => {
    if (timelineDatePreset === 'all') return null;
    return getDateRangeForPreset(timelineDatePreset, timelineCustomStart, timelineCustomEnd);
  }, [timelineDatePreset, timelineCustomStart, timelineCustomEnd]);

  const filteredTimeline = useMemo(() => {
    return timeline.filter((event) => {
      if (timelineEventFilter !== 'all' && event.type !== timelineEventFilter) return false;
      if (!timelineDateRange) return true;
      const eventTime = new Date(event.date).getTime();
      return eventTime >= new Date(timelineDateRange.fromDate).getTime()
        && eventTime <= new Date(timelineDateRange.toDate).getTime();
    });
  }, [timeline, timelineEventFilter, timelineDateRange]);

  const allNoteEvents = useMemo(() => (
    [...timeline]
      .filter((event) => event.type === 'note')
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  ), [timeline]);

  const resetEditForm = useCallback((profileData) => {
    setEditForm({
      full_name: profileData.full_name || '',
      email: profileData.email || '',
      phone: profileData.phone || '',
      birthday: profileData.birthday || '',
      nail_goal: profileData.nail_goal || '',
      refreshment_pref: profileData.refreshment_pref || '',
    });
  }, []);

  const loadCoreData = useCallback(async () => {
    if (!customerId) return null;

    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error || !profileData || profileData.role !== 'customer') {
      navigate(getCustomersPath(user?.role));
      return null;
    }

    setProfile(profileData);
    resetEditForm(profileData);
    setEditingProfile(false);

    const [statsData, referral, receiptRows, notesData, loyaltyData] = await Promise.all([
      fetchCustomerStats(customerId, profileData.phone),
      fetchReferralInfo(profileData),
      fetchCustomerReceipts(customerId, 10),
      fetchStaffNotes(customerId),
      fetchLoyaltyHistory(customerId, 25),
    ]);

    setStats(statsData);
    setReferralInfo(referral);
    setReceipts(receiptRows);
    setNotesAvailable(notesData.available);
    setLoyaltyHistory(loyaltyData.rows);

    return profileData;
  }, [customerId, navigate, user?.role, resetEditForm]);

  const loadTimelineData = useCallback(async (profileData) => {
    if (!profileData) return;
    setTimelineLoading(true);
    try {
      const timelineData = await fetchCustomerTimeline(customerId, profileData.phone);
      setTimeline(timelineData.events);
      setPhotos(timelineData.events.filter((e) => e.type === 'photo'));
      setTimelineLoaded(true);
    } catch (err) {
      console.error('Failed to load customer timeline:', err);
    } finally {
      setTimelineLoading(false);
    }
  }, [customerId]);

  const loadVisitHistoryData = useCallback(async (profileData) => {
    if (!profileData) return;
    setVisitsLoading(true);
    try {
      const visitRows = await fetchCustomerVisitHistory(customerId, profileData.phone, { includeOnline: true });
      const enriched = await enrichVisits(visitRows);
      enriched.sort((a, b) => new Date(b.visitAt) - new Date(a.visitAt));
      setVisits(enriched);
      setVisitsLoaded(true);
    } catch (err) {
      console.error('Failed to enrich visit history:', err);
      try {
        const visitRows = await fetchCustomerVisitHistory(customerId, profileData.phone, { includeOnline: true });
        const fallback = visitRows.map((v) => ({ ...v, visitAt: visitDate(v), totalPrice: v.final_price ?? 0 }));
        fallback.sort((a, b) => new Date(b.visitAt) - new Date(a.visitAt));
        setVisits(fallback);
        setVisitsLoaded(true);
      } catch (innerErr) {
        console.error('Failed to load visit history:', innerErr);
      }
    } finally {
      setVisitsLoading(false);
    }
  }, [customerId]);

  const loadGiftCardsData = useCallback(async () => {
    if (!user?.phone || !customerId) return;
    setGiftCardsLoading(true);
    try {
      const data = await getCustomerGiftCards(user.phone, customerId);
      setCustomerGiftCards(data.gift_cards || []);
      setGiftCardsLoaded(true);
    } catch (err) {
      console.error('Failed to load gift cards:', err);
    } finally {
      setGiftCardsLoading(false);
    }
  }, [customerId, user?.phone]);

  const handleVoidGiftCard = async (giftCardId) => {
    if (!canVoidGiftCards || !user?.phone) return;
    const reason = window.prompt('Reason for voiding this gift card?');
    if (reason == null) return;
    setVoidingGiftCardId(giftCardId);
    try {
      const result = await voidGiftCard({ callerPhone: user.phone, giftCardId, reason });
      if (!result.success) {
        window.alert(result.error || 'Void failed');
        return;
      }
      await loadGiftCardsData();
    } finally {
      setVoidingGiftCardId(null);
    }
  };

  const loadData = useCallback(async () => {
    setTimelineLoaded(false);
    setVisitsLoaded(false);
    setTimeline([]);
    setVisits([]);
    setPhotos([]);
    setGiftCardsLoaded(false);
    setCustomerGiftCards([]);
    return loadCoreData();
  }, [loadCoreData]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!canAccessStaffCrm(user.role)) {
      navigate('/portal');
      return;
    }
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [user, loadData, navigate]);

  useEffect(() => {
    if (!profile || loading) return;
    if ((activeTab === 'timeline' || activeTab === 'photos' || activeTab === 'notes') && !timelineLoaded && !timelineLoading) {
      loadTimelineData(profile);
    }
    if (activeTab === 'history' && !visitsLoaded && !visitsLoading) {
      loadVisitHistoryData(profile);
    }
    if (activeTab === 'gift-cards' && !giftCardsLoaded && !giftCardsLoading) {
      loadGiftCardsData();
    }
  }, [
    activeTab,
    profile,
    loading,
    timelineLoaded,
    timelineLoading,
    visitsLoaded,
    visitsLoading,
    giftCardsLoaded,
    giftCardsLoading,
    loadTimelineData,
    loadVisitHistoryData,
    loadGiftCardsData,
  ]);

  const handleStartEditProfile = () => {
    if (!canEdit || !profile) return;
    resetEditForm(profile);
    setEditingProfile(true);
  };

  const handleCancelEditProfile = () => {
    if (profile) resetEditForm(profile);
    setEditingProfile(false);
  };

  const handleSaveProfile = async () => {
    if (!canEdit || !editForm || !profile) return;
    setSaving(true);
    setSaveMsg('');

    const birthdayChanged = (editForm.birthday.trim() || null) !== (profile.birthday || null);

    if (birthdayChanged) {
      const { error: birthdayError } = await supabase.rpc('staff_update_customer_birthday', {
        caller_phone: user?.phone,
        profile_id: customerId,
        new_birthday: editForm.birthday.trim() || '',
      });
      if (birthdayError) {
        setSaving(false);
        setSaveMsg(birthdayError.message);
        return;
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        nail_goal: editForm.nail_goal || null,
        refreshment_pref: editForm.refreshment_pref || null,
      })
      .eq('id', customerId)
      .select()
      .single();

    setSaving(false);
    if (error) {
      setSaveMsg(error.message);
      return;
    }
    setSaveMsg('Saved');
    setProfile(data);
    resetEditForm(data);
    setEditingProfile(false);
    setTimeout(() => setSaveMsg(''), 2500);
  };

  const handleLogBirthdayPerk = () => {
    setActiveTab('notes');
    setNewNote((prev) => (prev.trim() ? prev : BIRTHDAY_PERK_NOTE_PREFIX));
  };

  const handleAddNote = async () => {
    if (!canAddStaffNotes(user?.role) || !newNote.trim()) return;
    setNoteSaving(true);
    const result = await addStaffNote(customerId, newNote, user);
    setNoteSaving(false);
    if (!result.success) {
      setSaveMsg(result.error);
      return;
    }
    setTimeline((prev) => [{
      id: `note-${result.note.id}`,
      type: 'note',
      date: result.note.created_at,
      title: 'Staff note',
      subtitle: result.note.author_name,
      body: result.note.note,
      meta: { ...result.note, noteSource: 'staff' },
    }, ...prev]);
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
      setSaveMsg(result.error);
      return;
    }
    setProfile((p) => ({ ...p, loyalty_points: result.new_balance }));
    setLoyaltyDelta('');
    setLoyaltyReason('');
    const history = await fetchLoyaltyHistory(customerId, 25);
    setLoyaltyHistory(history.rows);
    setSaveMsg(`Balance updated to ${result.new_balance} pts`);
    setTimeout(() => setSaveMsg(''), 2500);
  };

  const uploadPhotoFile = async (file) => {
    if (!file || !canUploadVisitPhotos(user?.role)) return;
    setPhotoUploading(true);
    const result = await uploadVisitPhoto(customerId, null, file, photoType, user?.id);
    setPhotoUploading(false);
    if (!result.success) {
      setSaveMsg(result.error);
      return;
    }
    const entry = {
      id: `photo-${result.photo.id}`,
      type: 'photo',
      date: result.photo.created_at,
      title: `${photoType === 'before' ? 'Before' : 'After'} photo`,
      subtitle: user?.full_name ? `By ${user.full_name}` : 'By Staff',
      meta: {
        ...result.photo,
        uploader_name: user?.full_name || 'Staff',
      },
    };
    setPhotos((prev) => [entry, ...prev]);
    setTimeline((prev) => [entry, ...prev]);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    await uploadPhotoFile(file);
  };

  const handleCameraCapture = async (file) => {
    await uploadPhotoFile(file);
  };

  const openCamera = () => {
    if (photoUploading) return;
    openWebCameraPicker({
      nativeCameraInputRef: cameraCaptureInputRef,
      onDesktopCamera: () => setShowCamera(true),
    });
  };

  const handlePhotoDelete = async (photoEvent) => {
    if (!canDeletePhotos) return;
    const photoId = photoEvent.meta?.id || photoEvent.id?.replace(/^photo-/, '');
    if (!photoId) return;
    if (!window.confirm('Remove this photo from the gallery? This cannot be undone.')) return;

    setPhotoDeletingId(photoId);
    const result = await deleteVisitPhoto(photoId, photoEvent.meta?.photo_url);
    setPhotoDeletingId(null);

    if (!result.success) {
      setSaveMsg(result.error);
      return;
    }

    setPhotos((prev) => prev.filter((p) => (p.meta?.id || p.id?.replace(/^photo-/, '')) !== photoId));
    setTimeline((prev) => prev.filter((e) => e.type !== 'photo' || (e.meta?.id || e.id?.replace(/^photo-/, '')) !== photoId));
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 bg-primary text-primary">
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading customer...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 bg-primary text-primary">
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="text-primary/60 mb-4">Customer not found</p>
            <Link
              to={user?.role ? getCustomersPath(user.role) : getHomePath(user?.role)}
              className="px-4 py-2 bg-gold text-charcoal rounded-lg"
            >
              Back to customers
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tier = getTierInfo(profile);
  const foundingBadge = formatFoundingBadge(profile.founding_type, profile.founding_spot);
  const birthdayMonthActive = isBirthdayMonth(profile.birthday);
  const birthdayGuidance = birthdayMonthActive ? getStaffBirthdayMonthGuidance(tier.id) : null;
  const tierBenefits = getTierBenefitsList(tier);
  const prefs = parseProfilePreferences(profile.preferences);
  const initials = profile.full_name?.charAt(0)?.toUpperCase() || '?';
  const readOnlyBadge = !canEdit;

  return (
    <div className="min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 bg-primary text-primary">
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              to={getCustomersPath(user?.role)}
              className="text-secondary text-sm hover:text-gold transition-colors mb-2 inline-block"
            >
              ← Back to customers
            </Link>
            <h1 className="font-heading text-3xl text-gold">Customer Profile</h1>
          </div>
          {readOnlyBadge && (
            <span className="self-start px-3 py-1 text-xs uppercase tracking-widest border border-light rounded-full text-secondary">
              Read-only
            </span>
          )}
        </div>

        <div className="@container bg-secondary border-card rounded-xl border p-4 sm:p-5 lg:p-6">
          <div className="flex flex-col @3xl:flex-row gap-4 sm:gap-6">
            <div className="flex items-start gap-3 sm:gap-4 min-w-0 @3xl:flex-shrink-0 @3xl:max-w-sm">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border border-gold/30 flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gold/20 rounded-full flex items-center justify-center text-gold font-heading text-xl sm:text-2xl flex-shrink-0">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-lg sm:text-xl lg:text-2xl text-primary capitalize break-words">
                  {profile.full_name}
                </h2>
                <p className="text-secondary text-sm truncate">{profile.email}</p>
                <p className="text-secondary text-sm truncate">{profile.phone}</p>
                <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
                  <span className={clsx('px-2 py-0.5 text-xs rounded-full border max-w-full truncate', tier.color, 'border-current')}>
                    {tier.name} · {profile.loyalty_points || 0} pts · {formatTierSpend(profile.rolling_spend_12m ?? profile.calendar_spend_ytd)} rolling
                  </span>
                  {tier.earnedTierName && tier.earnedTierName !== tier.name && (
                    <span className="px-2 py-0.5 text-xs rounded-full border border-light text-secondary">
                      Earned: {tier.earnedTierName}
                    </span>
                  )}
                  {tier.fmFloorActive && tier.fmFloorTier && (
                    <span className="px-2 py-0.5 text-xs rounded-full border border-gold/30 text-gold bg-gold/5">
                      FM floor: {getTierConfig(tier.fmFloorTier).name}
                    </span>
                  )}
                  {foundingBadge && (
                    <span className="px-2 py-0.5 text-xs rounded-full border border-gold/40 text-gold bg-gold/10">
                      Founding {foundingBadge}
                    </span>
                  )}
                  {profile.birthday && (
                    <span className="px-2 py-0.5 text-xs rounded-full border border-light text-secondary">
                      Birthday {profile.birthday}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {stats && (
              <div className="w-full min-w-0 @3xl:flex-1 grid grid-cols-2 @sm:grid-cols-4 @3xl:grid-cols-2 @5xl:grid-cols-4 gap-2 sm:gap-3">
                <StatCard label="Visits" value={stats.totalVisits} />
                <StatCard label="Total spent" value={`$${stats.totalSpent.toFixed(2)}`} />
                <StatCard label="Last visit" value={stats.lastVisit ? new Date(stats.lastVisit).toLocaleDateString() : '—'} small />
                <StatCard label="Preferred tech" value={stats.preferredTechnician || '—'} small />
              </div>
            )}
          </div>
        </div>

        {birthdayMonthActive && (
          <div className="rounded-xl border border-gold/30 bg-gold/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-heading text-gold text-sm tracking-wide">Birthday month</p>
              <p className="text-secondary text-sm mt-1">{birthdayGuidance}</p>
            </div>
            {canAddStaffNotes(user?.role) && notesAvailable && (
              <button
                type="button"
                onClick={handleLogBirthdayPerk}
                className="shrink-0 px-4 py-2 bg-gold text-charcoal rounded-lg text-sm font-semibold"
              >
                Log birthday perk
              </button>
            )}
          </div>
        )}

        <div className="flex gap-1 overflow-x-auto border-b border-light pb-px">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'px-4 py-2 text-sm whitespace-nowrap transition-colors rounded-t-lg',
                activeTab === tab.id
                  ? 'text-gold border-b-2 border-gold bg-gold/5'
                  : 'text-secondary hover:text-primary'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {saveMsg && (
          <div className="text-sm text-gold bg-gold/10 border border-gold/20 rounded-lg px-4 py-2">
            {saveMsg}
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Contact & preferences">
              {canEdit && editingProfile && editForm ? (
                <div className="space-y-3">
                  <Field label="Name" value={editForm.full_name} onChange={(v) => setEditForm({ ...editForm, full_name: v })} />
                  <Field label="Email" value={editForm.email} onChange={(v) => setEditForm({ ...editForm, email: v })} />
                  <Field label="Phone" value={editForm.phone} onChange={(v) => setEditForm({ ...editForm, phone: v })} />
                  <Field label="Birthday (MM-DD)" value={editForm.birthday} onChange={(v) => setEditForm({ ...editForm, birthday: v })} />
                  <Field label="Drink preference" value={editForm.refreshment_pref} onChange={(v) => setEditForm({ ...editForm, refreshment_pref: v })} />
                  <Field label="Nail goal" value={editForm.nail_goal} onChange={(v) => setEditForm({ ...editForm, nail_goal: v })} />
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="px-4 py-2 bg-gold text-charcoal rounded-lg text-sm font-semibold disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save changes'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditProfile}
                      disabled={saving}
                      className="px-4 py-2 border border-light text-secondary rounded-lg text-sm font-semibold hover:text-primary disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <dl className="space-y-2 text-sm">
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
                    {prefs.allergies && (
                      <div className="mt-3 p-3 bg-red-900/20 border border-red-700/40 rounded-lg">
                        <dt className="text-red-300 text-xs uppercase tracking-widest mb-1">Allergies / sensitivities</dt>
                        <dd className="text-primary">{prefs.allergies}</dd>
                      </div>
                    )}
                  </dl>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleStartEditProfile}
                      className="mt-4 px-4 py-2 bg-gold text-charcoal rounded-lg text-sm font-semibold"
                    >
                      Edit
                    </button>
                  )}
                </>
              )}
            </Section>

            <div className="space-y-6">
              <Section title="Service memory">
                <dl className="space-y-2 text-sm">
                  <Row label="Last service" value={stats?.lastService || '—'} />
                  <Row label="Favorite service" value={stats?.favoriteService ? `${stats.favoriteService} (${stats.favoriteServiceCount}×)` : '—'} />
                  <Row label="Services tried" value={stats?.servicesTried ?? '—'} />
                </dl>
              </Section>

              <TechnicianNailSummary profileId={profile.id} />

              <Section title="Referrals">
                <dl className="space-y-2 text-sm">
                  <Row label="Referral code" value={profile.referral_code || '—'} />
                  <Row label="Referred by" value={referralInfo?.referredByName || '—'} />
                  <Row label="Friends referred" value={referralInfo?.referralsCount ?? 0} />
                </dl>
              </Section>

              {receipts.length > 0 && (
                <Section title="Recent payments">
                  <div className="space-y-2">
                    {receipts.slice(0, 5).map((r) => (
                      <div key={r.id} className="flex justify-between text-sm py-2 border-b border-light last:border-0">
                        <div>
                          <div className="text-primary">{r.serviceName}</div>
                          <div className="text-secondary text-xs">{formatDate(r.date)}</div>
                        </div>
                        <div className="text-gold font-heading">${r.finalAmount.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-secondary border-card rounded-xl border p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h3 className="font-heading text-lg text-gold">Visit history</h3>
              <div className="relative w-full sm:max-w-xs">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 8a3 3 0 100 6 3 3 0 000-6z" />
                </svg>
                <input
                  type="search"
                  value={visitSearch}
                  onChange={(e) => setVisitSearch(e.target.value)}
                  placeholder="Search name, phone, email…"
                  className="w-full pl-9 pr-4 py-2.5 bg-input border-input border rounded-xl text-primary text-sm placeholder-text-muted focus:border-gold focus:outline-none"
                />
              </div>
            </div>
            {filteredVisits.length === 0 ? (
              <p className="text-secondary text-center py-8">
                {visits.length === 0 ? 'No visits recorded yet' : 'No visits match your search'}
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-secondary text-sm mb-4">
                  {filteredVisits.length} visit{filteredVisits.length !== 1 ? 's' : ''}
                  {visitSearch.trim() ? ' matching search' : ''}
                </p>
                {visitsLoading && visits.length === 0 ? (
                  <p className="text-secondary text-center py-8">Loading visit history…</p>
                ) : (
                filteredVisits.map((visit) => {
                  const statusCfg = VISIT_STATUS[visit.status];
                  const isExpanded = expandedVisitId === visit.id;
                  const summary = visit.serviceSummary;
                  const finalServices = summary?.finalServices || parseVisitFinalServices(visit);
                  const cardCustomer = profile;
                  return (
                    <div key={visit.id} className="bg-secondary rounded-lg border border-light overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedVisitId(isExpanded ? null : visit.id)}
                        className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-gold/5 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-primary font-medium truncate">
                            {cardCustomer?.full_name || 'Customer'}
                          </div>
                          <div className="text-secondary text-sm mt-0.5">
                            {cardCustomer?.phone || '—'}
                            {cardCustomer?.email && (
                              <span className="hidden sm:inline">{` · ${cardCustomer.email}`}</span>
                            )}
                          </div>
                          <div className="text-secondary text-xs mt-1">
                            {formatDate(visit.visitAt)}
                            {visit.technicians?.full_name && ` · ${visit.technicians.full_name}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-gold font-heading">${Number(visit.totalPrice).toFixed(2)}</span>
                          <span className={clsx('px-2 py-0.5 text-[10px] rounded-full border uppercase tracking-wider', statusCfg?.color || 'text-secondary border-light')}>
                            {statusCfg?.label || visit.status}
                          </span>
                          <svg
                            className={clsx('w-4 h-4 text-secondary transition-transform', isExpanded && 'rotate-180')}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>
                      {isExpanded && (
                        <VisitHistoryDetail
                          visit={visit}
                          summary={summary}
                          finalServices={finalServices}
                        />
                      )}
                    </div>
                  );
                })
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <Section title="Activity timeline">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-4">
              <div className="flex flex-wrap gap-2">
                {TIMELINE_DATE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setTimelineDatePreset(preset.id)}
                    className={clsx(
                      'px-3 py-2 rounded-lg text-sm border transition-colors',
                      timelineDatePreset === preset.id
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-light text-secondary hover:border-gold/30',
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <ThemeSelect
                value={timelineEventFilter}
                onChange={setTimelineEventFilter}
                options={TIMELINE_EVENT_TYPES.map((type) => ({ value: type.id, label: type.label }))}
                className="min-w-[140px]"
              />
            </div>

            {timelineDatePreset === 'custom' && (
              <div className="flex flex-wrap gap-3 mb-4">
                <label className="text-secondary text-xs uppercase tracking-widest">
                  From
                  <input
                    type="date"
                    value={timelineCustomStart}
                    onChange={(e) => setTimelineCustomStart(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-input border border-input rounded-lg text-primary text-sm"
                  />
                </label>
                <label className="text-secondary text-xs uppercase tracking-widest">
                  To
                  <input
                    type="date"
                    value={timelineCustomEnd}
                    onChange={(e) => setTimelineCustomEnd(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-input border border-input rounded-lg text-primary text-sm"
                  />
                </label>
              </div>
            )}

            {timelineDatePreset === 'custom' && !timelineDateRange && (
              <p className="text-secondary text-sm mb-4">Select a start and end date to load activity.</p>
            )}

            {timelineLoading && timeline.length === 0 ? (
              <p className="text-secondary text-center py-8">Loading activity…</p>
            ) : timeline.length === 0 ? (
              <p className="text-secondary text-center py-8">No activity recorded yet</p>
            ) : timelineDatePreset === 'custom' && !timelineDateRange ? null : filteredTimeline.length === 0 ? (
              <p className="text-secondary text-center py-8">No activity matches your filters</p>
            ) : (
              <>
                <p className="text-secondary text-sm mb-4">
                  {filteredTimeline.length} event{filteredTimeline.length !== 1 ? 's' : ''}
                  {timelineEventFilter !== 'visit' || timelineDatePreset !== 'today' ? ' matching filters' : ''}
                </p>
                <VirtualizedTimelineList
                  events={filteredTimeline}
                  profile={profile}
                  customerDetail
                />
              </>
            )}
          </Section>
        )}

        {activeTab === 'notes' && (
          <Section title="Notes">
            <p className="text-secondary text-sm mb-4">Staff, checkout, and visit record notes</p>
            {!notesAvailable && (
              <p className="text-secondary text-sm mb-4">Run sql/025_phase4_staff_crm.sql to enable staff notes.</p>
            )}
            {canAddStaffNotes(user?.role) && notesAvailable && (
              <div className="mb-6">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="e.g. Prefers quiet, allergic to latex gloves…"
                  rows={3}
                  className="w-full px-4 py-3 bg-input border-input border rounded-xl text-primary placeholder-text-muted focus:border-gold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={noteSaving || !newNote.trim()}
                  className="mt-2 px-4 py-2 bg-gold text-charcoal rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {noteSaving ? 'Saving…' : 'Add staff note'}
                </button>
              </div>
            )}
            {timelineLoading && allNoteEvents.length === 0 ? (
              <p className="text-secondary text-center py-6">Loading notes…</p>
            ) : allNoteEvents.length === 0 ? (
              <p className="text-secondary text-center py-6">No notes recorded yet</p>
            ) : (
              <div className="space-y-3">
                {allNoteEvents.map((event) => (
                  <div key={event.id} className="p-4 bg-secondary rounded-lg border border-light">
                    <div className="text-gold text-xs font-heading uppercase tracking-wider mb-1">
                      {event.title}
                    </div>
                    <p className="text-primary whitespace-pre-wrap">{event.body}</p>
                    <p className="text-secondary text-xs mt-2">
                      {[event.subtitle, formatDate(event.date)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {activeTab === 'loyalty' && (
          <div className="space-y-6">
            <Section title="Loyalty status">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-3xl font-heading text-gold">{profile.loyalty_points || 0}</div>
                <div>
                  <div className={clsx('font-heading', tier.color)}>{tier.name} tier</div>
                </div>
              </div>
              <ul className="space-y-1.5 text-sm text-secondary mb-4">
                {tierBenefits.map((benefit) => (
                  <li key={benefit}>· {benefit}</li>
                ))}
              </ul>
              {canAdjust && (
                <div className="p-4 border border-light rounded-lg bg-secondary/50 space-y-3">
                  <p className="text-sm text-secondary">Manual adjustment (logged to ledger)</p>
                  <div className="flex flex-wrap gap-3">
                    <input
                      type="number"
                      value={loyaltyDelta}
                      onChange={(e) => setLoyaltyDelta(e.target.value)}
                      placeholder="± points"
                      className="w-32 px-3 py-2 bg-input border-input border rounded-lg text-primary focus:border-gold focus:outline-none"
                    />
                    <input
                      type="text"
                      value={loyaltyReason}
                      onChange={(e) => setLoyaltyReason(e.target.value)}
                      placeholder="Reason (required for audit)"
                      className="flex-1 min-w-[200px] px-3 py-2 bg-input border-input border rounded-lg text-primary focus:border-gold focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleLoyaltyAdjust}
                      disabled={loyaltySaving}
                      className="px-4 py-2 bg-gold text-charcoal rounded-lg text-sm font-semibold disabled:opacity-50"
                    >
                      {loyaltySaving ? 'Applying…' : 'Apply'}
                    </button>
                  </div>
                </div>
              )}
            </Section>

            <Section title="Points history">
              {loyaltyHistory.length === 0 ? (
                <p className="text-secondary text-center py-6">No loyalty transactions</p>
              ) : (
                <div className="space-y-2">
                  {loyaltyHistory.map((t) => (
                    <div key={t.id} className="flex justify-between py-2 border-b border-light last:border-0 text-sm">
                      <div>
                        <div className="text-primary">{t.description || formatTransactionType(t.transaction_type)}</div>
                        <div className="text-secondary text-xs">{formatDate(t.created_at)}</div>
                      </div>
                      <div className="text-right">
                        <div className={t.points >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {t.points >= 0 ? '+' : ''}{t.points}
                        </div>
                        <div className="text-secondary text-xs">Bal {t.balance_after}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}

        {activeTab === 'gift-cards' && (
          <Section title="Gift cards">
            {giftCardsLoading ? (
              <p className="text-secondary text-center py-6">Loading gift cards…</p>
            ) : customerGiftCards.length === 0 ? (
              <p className="text-secondary text-center py-6">No gift cards for this customer</p>
            ) : (
              <div className="space-y-3">
                {customerGiftCards.map((card) => (
                  <div key={card.id} className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-light last:border-0">
                    <div>
                      <div className="font-mono text-gold">{formatGiftCardCode(card.code)}</div>
                      <div className="text-secondary text-sm">
                        {GIFT_CARD_STATUS_LABELS[getGiftCardDisplayStatus(card)] || card.status}
                        {' · '}
                        {card.relation === 'purchased' ? 'Purchased for another' : 'Owned'}
                        {getGiftCardExpiryLabel(card) ? ` · ${getGiftCardExpiryLabel(card)}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-primary font-heading">${Number(card.balance || 0).toFixed(2)}</div>
                      <div className="text-secondary text-xs">of ${Number(card.initial_amount || 0).toFixed(2)}</div>
                    </div>
                    {canVoidGiftCards && card.status === 'active' && !card.first_used_at && !isGiftCardExpired(card) && (
                      <button
                        type="button"
                        onClick={() => handleVoidGiftCard(card.id)}
                        disabled={voidingGiftCardId === card.id}
                        className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                      >
                        {voidingGiftCardId === card.id ? 'Voiding…' : 'Void'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {activeTab === 'photos' && (
          <Section title="Before & after gallery">
            {canUploadVisitPhotos(user?.role) && (
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <select
                  value={photoType}
                  onChange={(e) => setPhotoType(e.target.value)}
                  className="px-3 py-2 bg-input border-input border rounded-lg text-primary focus:border-gold focus:outline-none"
                >
                  <option value="before">Before</option>
                  <option value="after">After</option>
                </select>
                <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoUpload} />
                <input
                  ref={cameraCaptureInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <button
                  type="button"
                  onClick={openCamera}
                  disabled={photoUploading}
                  className="px-4 py-2 bg-secondary border border-light text-primary rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {photoUploading ? 'Uploading…' : 'Camera'}
                </button>
                <button
                  type="button"
                  onClick={() => clickFileInput(photoInputRef)}
                  disabled={photoUploading}
                  className="px-4 py-2 bg-gold text-charcoal rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {photoUploading ? 'Uploading…' : 'Photos'}
                </button>
              </div>
            )}
            <div className="flex gap-2 mb-6 flex-wrap">
              {[
                { key: 'all', label: 'All', count: photos.length },
                { key: 'before', label: 'Before', count: photos.filter((p) => p.meta?.photo_type === 'before').length },
                { key: 'after', label: 'After', count: photos.filter((p) => p.meta?.photo_type === 'after').length },
              ].map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setPhotoViewFilter(filter.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-heading transition-all ${
                    photoViewFilter === filter.key
                      ? 'bg-gold text-charcoal'
                      : 'border border-light text-secondary hover:border-gold hover:text-gold'
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>
            {photos.length === 0 ? (
              <p className="text-secondary text-center py-8">No visit photos yet</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos
                  .filter((p) => photoViewFilter === 'all' || p.meta?.photo_type === photoViewFilter)
                  .map((p) => (
                  <div key={p.id} className="rounded-lg overflow-hidden border border-light relative group">
                    <img src={p.meta.photo_url} alt="" className="w-full h-36 object-cover" />
                    {canDeletePhotos && (
                      <button
                        type="button"
                        onClick={() => handlePhotoDelete(p)}
                        disabled={photoDeletingId === (p.meta?.id || p.id?.replace(/^photo-/, ''))}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-charcoal/80 text-red-300 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-50"
                        title="Remove photo"
                        aria-label="Remove photo"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                    <div className="p-2 text-xs text-secondary">
                      {p.title}
                      {p.meta?.uploader_name && ` · By ${p.meta.uploader_name}`}
                      {' · '}{formatDate(p.date)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}
      </div>

      <WebCameraCapture
        open={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
}

function normalizeLineItems(items) {
  if (!items?.length) return [];
  return items.map((item) => (
    typeof item === 'string' ? { name: item, price: null } : item
  ));
}

function ServiceItemList({ label, items, variant = 'main' }) {
  const lineItems = normalizeLineItems(items);
  if (!lineItems.length) return null;
  const dotColor = variant === 'addon'
    ? 'bg-amber-400/80'
    : variant === 'removed'
      ? 'bg-red-400/60'
      : 'bg-gold/80';
  return (
    <div>
      <div className="text-secondary text-[10px] uppercase tracking-widest mb-1.5">{label}</div>
      <ul className="space-y-1.5">
        {lineItems.map((item) => (
          <li key={`${variant}-${item.name}`} className="flex items-start justify-between gap-3 text-sm">
            <div className="flex items-start gap-2 min-w-0">
              <span className={clsx('mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0', dotColor)} />
              <span className={clsx('text-primary', variant === 'removed' && 'line-through text-secondary')}>
                {variant === 'addon' ? `+ ${item.name}` : variant === 'removed' ? `− ${item.name}` : item.name}
              </span>
            </div>
            {item.price != null && (
              <span className={clsx('text-gold font-heading flex-shrink-0', variant === 'removed' && 'line-through opacity-60')}>
                ${Number(item.price).toFixed(2)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ServiceChangeStep({ entry, stepNumber, isLast }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-7 h-7 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center text-xs font-heading text-gold">
          {stepNumber}
        </div>
        {!isLast && <div className="w-px flex-1 bg-light min-h-[1rem] mt-1" />}
      </div>
      <div className={clsx('flex-1 min-w-0', !isLast && 'pb-4')}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-primary font-medium text-sm">{entry.action}</span>
          <span className="text-secondary text-xs">{formatDate(entry.date)}</span>
        </div>
        <div className="mt-2 p-3 rounded-lg bg-primary/30 border border-light/60 space-y-2">
          {entry.action === 'Services removed' ? (
            <>
              <ServiceItemList label="Removed services" items={entry.removedMainItems || entry.removedMain} variant="removed" />
              <ServiceItemList label="Removed add-ons" items={entry.removedAddonItems || entry.removedAddons} variant="removed" />
            </>
          ) : (
            <>
              <ServiceItemList label="Services" items={entry.mainItems || entry.mainServices} />
              {(entry.addonItems?.length > 0 || entry.addons?.length > 0) && (
                <ServiceItemList label="Add-ons" items={entry.addonItems || entry.addons} variant="addon" />
              )}
            </>
          )}
          {!entry.mainItems?.length && !entry.addonItems?.length
            && !entry.removedMainItems?.length && !entry.removedAddonItems?.length
            && !entry.mainServices?.length && !entry.addons?.length
            && !entry.removedMain?.length && !entry.removedAddons?.length && (
            <p className="text-secondary text-sm">No services recorded</p>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary border border-light text-secondary">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>
              <span className="text-primary">{entry.changedByName}</span>
              <span className="text-secondary"> · {entry.changedByRole}</span>
            </span>
          </span>
          {entry.stepPrice != null && entry.stepPrice > 0 && (
            <span className="text-gold font-heading text-sm">${Number(entry.stepPrice).toFixed(2)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentSummaryRows({ paymentSummary }) {
  if (!paymentSummary) return null;
  const {
    subtotal,
    discount,
    discountType,
    tip,
    giftCardAmount = 0,
    visitTotal,
    totalPaid,
    paymentMethod,
  } = paymentSummary;
  const discountLabel = discountType === 'percentage' || discountType === 'percent'
    ? 'Discount (%)'
    : discountType === 'loyalty'
      ? 'Loyalty deduction'
      : discountType === 'coupon'
        ? 'Coupon discount'
        : 'Discount';
  const showVisitTotal = (giftCardAmount > 0 || discount > 0 || tip > 0) && visitTotal > 0;

  return (
    <div className="p-4 rounded-xl bg-gold/5 border border-gold/20 space-y-2 text-sm">
      <h4 className="font-heading text-gold text-sm uppercase tracking-wider mb-3">Payment summary</h4>
      <div className="flex justify-between">
        <span className="text-secondary">Services & add-ons</span>
        <span className="text-primary">${Number(subtotal).toFixed(2)}</span>
      </div>
      {tip > 0 && (
        <div className="flex justify-between">
          <span className="text-secondary">Tip</span>
          <span className="text-primary">+${Number(tip).toFixed(2)}</span>
        </div>
      )}
      {discount > 0 && (
        <div className="flex justify-between">
          <span className="text-secondary">{discountLabel}</span>
          <span className="text-red-300">−${Number(discount).toFixed(2)}</span>
        </div>
      )}
      {giftCardAmount > 0 && (
        <div className="flex justify-between">
          <span className="text-secondary">Gift card</span>
          <span className="text-gold">−${Number(giftCardAmount).toFixed(2)}</span>
        </div>
      )}
      {showVisitTotal && (
        <div className="flex justify-between pt-2 border-t border-gold/20">
          <span className="text-secondary">Visit total</span>
          <span className="text-primary">${Number(visitTotal).toFixed(2)}</span>
        </div>
      )}
      <div className="flex justify-between pt-2 border-t border-gold/20 font-medium">
        <span className="text-gold font-heading">{giftCardAmount > 0 ? 'Amount paid' : 'Total paid'}</span>
        <span className="text-gold font-heading text-lg">${Number(totalPaid).toFixed(2)}</span>
      </div>
      {paymentMethod && paymentMethod !== 'N/A' && (
        <div className="text-secondary text-xs pt-1">Paid via {paymentMethod}</div>
      )}
    </div>
  );
}

export function VisitHistoryDetail({ visit, summary, finalServices }) {
  const servingMinutes = computeServingDurationMinutes(visit);
  const changeLog = summary?.changeLog || [];
  const hasChangeLog = changeLog.length > 0;
  const finalItems = summary?.finalWithPrices || {
    mainItems: finalServices.main.map((name) => ({ name, price: null })),
    addonItems: finalServices.addons.map((name) => ({ name, price: null })),
  };
  const removedItems = summary?.performedRemoved || { mainItems: [], addonItems: [] };
  const paymentSummary = summary?.paymentSummary;
  const hasAddons = finalItems.addonItems?.length > 0;
  const hasRemoved = removedItems.mainItems?.length > 0 || removedItems.addonItems?.length > 0;

  return (
    <div className="px-4 pb-4 pt-0 border-t border-light space-y-4">
      {/* Final services */}
      <div className="pt-4 p-4 rounded-xl border border-light bg-primary/20">
        <h4 className="font-heading text-gold text-sm uppercase tracking-wider mb-3">Services performed</h4>
        <ServiceItemList label="Services" items={finalItems.mainItems} />
        {hasAddons && (
          <div className="mt-3">
            <ServiceItemList label="Add-ons" items={finalItems.addonItems} variant="addon" />
          </div>
        )}
        {hasRemoved && (
          <div className="mt-3 pt-3 border-t border-light/60">
            <div className="text-secondary text-[10px] uppercase tracking-widest mb-2">Removed from visit</div>
            <ServiceItemList label="Services" items={removedItems.mainItems} variant="removed" />
            {removedItems.addonItems?.length > 0 && (
              <div className="mt-2">
                <ServiceItemList label="Add-ons" items={removedItems.addonItems} variant="removed" />
              </div>
            )}
          </div>
        )}
        {!finalServices.main.length && !finalServices.addons.length && !hasRemoved && (
          <p className="text-secondary text-sm">{summary?.finalLabelText || '—'}</p>
        )}
      </div>

      <PaymentSummaryRows paymentSummary={paymentSummary} />

      {/* Service change timeline */}
      {hasChangeLog ? (
        <div>
          <h4 className="text-secondary text-xs uppercase tracking-widest mb-3">How services changed</h4>
          <div className="pl-1">
            {changeLog.map((entry, index) => (
              <ServiceChangeStep
                key={entry.id}
                entry={entry}
                stepNumber={index + 1}
                isLast={index === changeLog.length - 1}
              />
            ))}
          </div>
        </div>
      ) : summary?.checkIn && (summary.checkIn.services.length > 0 || summary.checkIn.addons.length > 0) && (
        <div className="p-4 rounded-lg border border-light bg-primary/20">
          <h4 className="text-secondary text-xs uppercase tracking-widest mb-2">
            At check-in{summary.checkIn.approximate ? ' (approximate)' : ''}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ServiceItemList label="Main services" items={summary.checkIn.services} />
            <ServiceItemList label="Add-ons" items={summary.checkIn.addons} variant="addon" />
          </div>
          {summary.checkIn.attribution && (
            <p className="text-secondary text-xs mt-3">
              {formatDate(summary.checkIn.date)} · {summary.checkIn.attribution}
            </p>
          )}
        </div>
      )}

      {/* Visit details */}
      <div className="pt-2 border-t border-light">
        <h4 className="text-secondary text-xs uppercase tracking-widest mb-3">Visit details</h4>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <DetailRow label="Technician" value={visit.technicians?.full_name || 'Unassigned'} />
          <DetailRow
            label="Booking"
            value={visit.booking_type === 'online' ? 'Online' : 'Walk-in'}
          />
          <DetailRow label="Check-in" value={formatDate(visit.checked_in_at)} />
          {servingMinutes != null && (
            <DetailRow label="Duration" value={`${servingMinutes} min`} />
          )}
          {visit.scheduled_at && visit.scheduled_at !== visit.checked_in_at && (
            <DetailRow label="Scheduled" value={formatDate(visit.scheduled_at)} />
          )}
        </dl>
      </div>

      {visit.notes && (
        <div className="pt-2 border-t border-light">
          <h4 className="text-secondary text-xs uppercase tracking-widest mb-1">Visit notes</h4>
          <p className="text-primary text-sm leading-relaxed">{visit.notes}</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, small }) {
  return (
    <div className="bg-primary/20 border border-light rounded-lg p-2.5 sm:p-3 text-center min-w-0 flex flex-col justify-center">
      <div className="text-secondary text-[10px] sm:text-xs uppercase tracking-widest leading-tight">{label}</div>
      <div
        className={clsx(
          'font-heading text-gold mt-0.5 sm:mt-1 min-w-0 break-words leading-tight',
          small ? 'text-xs sm:text-sm' : 'text-base sm:text-lg @sm:text-xl',
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-secondary border-card rounded-xl border p-6">
      <h3 className="font-heading text-lg text-gold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-secondary">{label}</dt>
      <dd className="text-primary text-right">{value}</dd>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <dt className="text-secondary text-xs uppercase tracking-widest">{label}</dt>
      <dd className="text-primary mt-0.5">{value}</dd>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="text-secondary text-xs uppercase tracking-widest block mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-input border-input border rounded-lg text-primary focus:border-gold focus:outline-none"
      />
    </div>
  );
}
