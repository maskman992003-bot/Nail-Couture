import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import clsx from 'clsx';
import { getCustomersPath } from '../utils/routes';
import { fetchCustomerStats, fetchCustomerReceipts, fetchReferralInfo, fetchCustomerVisitHistory } from '../utils/customerStats';
import { getTierInfo } from '../utils/loyaltyTier';
import {
  parseProfilePreferences,
  labelForOption,
  NAIL_SHAPES,
  NAIL_LENGTHS,
  NAIL_FINISHES,
  VISIT_TIME_OPTIONS,
} from '../utils/profilePreferences';
import { fetchLoyaltyHistory, formatTransactionType } from '../utils/loyaltyTransactions';
import { fetchStaffNotes, addStaffNote } from '../utils/staffCustomerNotes';
import {
  fetchCustomerTimeline,
  adjustCustomerLoyalty,
  uploadVisitPhoto,
} from '../utils/staffCustomerTimeline';
import {
  canAccessStaffCrm,
  canEditCustomerProfile,
  canAdjustLoyalty,
  canAddStaffNotes,
  canUploadVisitPhotos,
} from '../utils/staffCustomerAccess';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'history', label: 'History' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'notes', label: 'Notes' },
  { id: 'loyalty', label: 'Loyalty' },
  { id: 'photos', label: 'Photos' },
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

const TIMELINE_ICONS = {
  visit: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  payment: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  waiver: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  note: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  loyalty: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  photo: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function visitDate(appointment) {
  return appointment.checked_in_at || appointment.scheduled_at || appointment.created_at;
}

async function enrichVisits(rawVisits, customerId) {
  const allAddonNames = [...new Set(rawVisits.flatMap((v) => (v.add_ons ? v.add_ons.split(',').map((n) => n.trim()) : [])))];
  const [addOnResult, paymentsResult] = await Promise.all([
    allAddonNames.length
      ? supabase.from('services').select('id, name, price, duration_minutes').in('name', allAddonNames)
      : Promise.resolve({ data: [] }),
    customerId
      ? supabase
        .from('payment_transactions')
        .select('appointment_id, discount_amount, discount_type, payment_method, final_amount, amount')
        .eq('customer_id', customerId)
        .eq('status', 'completed')
      : Promise.resolve({ data: [] }),
  ]);
  const addOnMap = {};
  (addOnResult.data || []).forEach((a) => { addOnMap[a.name] = a; });
  const paymentMap = {};
  (paymentsResult.data || []).forEach((p) => {
    if (p.appointment_id) paymentMap[p.appointment_id] = p;
  });

  return rawVisits.map((v) => {
    const addonNames = v.add_ons ? v.add_ons.split(',').map((n) => n.trim()) : [];
    const addonDetails = addonNames.map((n) => addOnMap[n]).filter(Boolean);
    const addOnTotal = addonDetails.reduce((sum, a) => sum + (a.price || 0), 0);
    const payment = paymentMap[v.id];
    const totalPrice = v.final_price ?? payment?.final_amount ?? ((v.services?.price || 0) + addOnTotal);
    return {
      ...v,
      addonDetails,
      payment,
      totalPrice,
      visitAt: visitDate(v),
    };
  });
}

export default function StaffCustomerDetail() {
  const { id: customerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const photoInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [referralInfo, setReferralInfo] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [notes, setNotes] = useState([]);
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
  const [photoUploading, setPhotoUploading] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);

  const canEdit = canEditCustomerProfile(user?.role);
  const canAdjust = canAdjustLoyalty(user?.role);

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

  const loadData = useCallback(async () => {
    if (!customerId) return;

    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error || !profileData || profileData.role !== 'customer') {
      navigate(getCustomersPath(user?.role));
      return;
    }

    setProfile(profileData);
    resetEditForm(profileData);
    setEditingProfile(false);

    const [
      statsData,
      referral,
      receiptRows,
      timelineData,
      notesData,
      loyaltyData,
      visitRows,
    ] = await Promise.all([
      fetchCustomerStats(customerId, profileData.phone),
      fetchReferralInfo(profileData),
      fetchCustomerReceipts(customerId, 10),
      fetchCustomerTimeline(customerId, profileData.phone),
      fetchStaffNotes(customerId),
      fetchLoyaltyHistory(customerId, 25),
      fetchCustomerVisitHistory(customerId, profileData.phone, { includeOnline: true }).catch((err) => {
        console.error('Failed to load visit history:', err);
        return [];
      }),
    ]);

    setStats(statsData);
    setReferralInfo(referral);
    setReceipts(receiptRows);
    setTimeline(timelineData.events);
    setNotes(notesData.rows);
    setNotesAvailable(notesData.available);
    setLoyaltyHistory(loyaltyData.rows);
    setPhotos(timelineData.events.filter((e) => e.type === 'photo'));
    setVisits(await enrichVisits(visitRows, customerId));
  }, [customerId, navigate, user?.role, resetEditForm]);

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
    if (!canEdit || !editForm) return;
    setSaving(true);
    setSaveMsg('');
    const { error } = await supabase
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
    setProfile((p) => ({ ...p, ...editForm }));
    setEditingProfile(false);
    setTimeout(() => setSaveMsg(''), 2500);
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
    setNotes((prev) => [result.note, ...prev]);
    setTimeline((prev) => [{
      id: `note-${result.note.id}`,
      type: 'note',
      date: result.note.created_at,
      title: 'Staff note',
      subtitle: `By ${result.note.author_name}`,
      body: result.note.note,
      meta: result.note,
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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !canUploadVisitPhotos(user?.role)) return;
    setPhotoUploading(true);
    const result = await uploadVisitPhoto(customerId, null, file, photoType, user?.id);
    setPhotoUploading(false);
    e.target.value = '';
    if (!result.success) {
      setSaveMsg(result.error);
      return;
    }
    const entry = {
      id: `photo-${result.photo.id}`,
      type: 'photo',
      date: result.photo.created_at,
      title: `${photoType === 'before' ? 'Before' : 'After'} photo`,
      meta: result.photo,
    };
    setPhotos((prev) => [entry, ...prev]);
    setTimeline((prev) => [entry, ...prev]);
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

  if (!profile) return null;

  const tier = getTierInfo(profile.loyalty_points);
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

        <div className="bg-secondary border-card rounded-xl border p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex items-start gap-4">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover border border-gold/30" />
              ) : (
                <div className="w-16 h-16 bg-gold/20 rounded-full flex items-center justify-center text-gold font-heading text-2xl">
                  {initials}
                </div>
              )}
              <div>
                <h2 className="font-heading text-2xl text-primary capitalize">{profile.full_name}</h2>
                <p className="text-secondary text-sm">{profile.email}</p>
                <p className="text-secondary text-sm">{profile.phone}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={clsx('px-2 py-0.5 text-xs rounded-full border', tier.color, 'border-current')}>
                    {tier.name} · {profile.loyalty_points || 0} pts
                  </span>
                  {profile.birthday && (
                    <span className="px-2 py-0.5 text-xs rounded-full border border-light text-secondary">
                      Birthday {profile.birthday}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {stats && (
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Visits" value={stats.totalVisits} />
                <StatCard label="Total spent" value={`$${stats.totalSpent.toFixed(2)}`} />
                <StatCard label="Last visit" value={stats.lastVisit ? new Date(stats.lastVisit).toLocaleDateString() : '—'} small />
                <StatCard label="Preferred tech" value={stats.preferredTechnician || '—'} small />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-light pb-px">
          {TABS.map((tab) => (
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
          <Section title="Visit history">
            {visits.length === 0 ? (
              <p className="text-secondary text-center py-8">No visits recorded yet</p>
            ) : (
              <div className="space-y-3">
                <p className="text-secondary text-sm mb-4">{visits.length} visit{visits.length !== 1 ? 's' : ''} total</p>
                {visits.map((visit) => {
                  const statusCfg = VISIT_STATUS[visit.status];
                  const isExpanded = expandedVisitId === visit.id;
                  const serviceName = visit.services?.name || visit.add_ons || 'Service';
                  return (
                    <div key={visit.id} className="bg-secondary rounded-lg border border-light overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedVisitId(isExpanded ? null : visit.id)}
                        className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-gold/5 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-primary font-medium">{serviceName}</div>
                          <div className="text-secondary text-sm mt-0.5">
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
                        <div className="px-4 pb-4 pt-0 border-t border-light space-y-3">
                          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-3">
                            <DetailRow label="Service" value={visit.services?.name || '—'} />
                            {visit.services?.duration_minutes && (
                              <DetailRow label="Duration" value={`${visit.services.duration_minutes} min`} />
                            )}
                            <DetailRow label="Technician" value={visit.technicians?.full_name || 'Unassigned'} />
                            <DetailRow
                              label="Booking type"
                              value={visit.booking_type === 'online' ? 'Online' : 'Walk-in'}
                            />
                            <DetailRow label="Check-in" value={formatDate(visit.checked_in_at)} />
                            {visit.scheduled_at && visit.scheduled_at !== visit.checked_in_at && (
                              <DetailRow label="Scheduled" value={formatDate(visit.scheduled_at)} />
                            )}
                          </dl>
                          {visit.addonDetails?.length > 0 && (
                            <div>
                              <div className="text-secondary text-xs uppercase tracking-widest mb-2">Add-ons</div>
                              <div className="space-y-1">
                                {visit.addonDetails.map((addon) => (
                                  <div key={addon.id} className="flex justify-between text-sm">
                                    <span className="text-primary">+ {addon.name}</span>
                                    <span className="text-gold">${Number(addon.price || 0).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {visit.add_ons && !visit.services?.name && (
                            <DetailRow label="Services" value={visit.add_ons} />
                          )}
                          <div className="flex justify-between items-center pt-2 border-t border-light">
                            <span className="text-secondary text-sm">Total</span>
                            <span className="text-gold font-heading text-lg">${Number(visit.totalPrice).toFixed(2)}</span>
                          </div>
                          {visit.payment?.discount_amount > 0 && (
                            <div className="p-3 bg-gold/5 border border-gold/20 rounded-lg text-sm">
                              <div className="text-gold">Discount: ${Number(visit.payment.discount_amount).toFixed(2)}</div>
                              {visit.payment.discount_type && (
                                <div className="text-secondary text-xs mt-1">Type: {visit.payment.discount_type}</div>
                              )}
                              {visit.payment.payment_method && (
                                <div className="text-secondary text-xs">Paid via: {visit.payment.payment_method}</div>
                              )}
                            </div>
                          )}
                          {visit.notes && (
                            <div>
                              <div className="text-secondary text-xs uppercase tracking-widest mb-1">Visit notes</div>
                              <p className="text-primary text-sm">{visit.notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        )}

        {activeTab === 'timeline' && (
          <Section title="Full activity timeline">
            {timeline.length === 0 ? (
              <p className="text-secondary text-center py-8">No activity recorded yet</p>
            ) : (
              <div className="space-y-3">
                {timeline.map((event) => (
                  <div key={event.id} className="flex gap-3 p-3 bg-secondary rounded-lg border border-light">
                    <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={TIMELINE_ICONS[event.type] || TIMELINE_ICONS.visit} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2">
                        <div className="text-primary font-medium">{event.title}</div>
                        {event.amount != null && (
                          <div className="text-gold text-sm">${Number(event.amount).toFixed(2)}</div>
                        )}
                      </div>
                      {event.subtitle && <div className="text-secondary text-sm">{event.subtitle}</div>}
                      {event.body && <div className="text-primary/80 text-sm mt-1">{event.body}</div>}
                      {event.status && (
                        <span className="inline-block mt-1 text-xs uppercase tracking-wider text-secondary">{event.status}</span>
                      )}
                      {event.type === 'waiver' && event.meta?.signature_image && (
                        <img src={event.meta.signature_image} alt="Signature" className="mt-2 h-16 object-contain bg-white rounded border" />
                      )}
                      {event.type === 'photo' && event.meta?.photo_url && (
                        <img src={event.meta.photo_url} alt="" className="mt-2 h-24 object-cover rounded border border-light" />
                      )}
                      <div className="text-secondary text-xs mt-1">{formatDate(event.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {activeTab === 'notes' && (
          <Section title="Internal staff notes">
            {!notesAvailable && (
              <p className="text-secondary text-sm mb-4">Run sql/025_phase4_staff_crm.sql to enable notes.</p>
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
                  {noteSaving ? 'Saving…' : 'Add note'}
                </button>
              </div>
            )}
            {notes.length === 0 ? (
              <p className="text-secondary text-center py-6">No staff notes yet</p>
            ) : (
              <div className="space-y-3">
                {notes.map((n) => (
                  <div key={n.id} className="p-4 bg-secondary rounded-lg border border-light">
                    <p className="text-primary">{n.note}</p>
                    <p className="text-secondary text-xs mt-2">
                      {n.author_name} · {formatDate(n.created_at)}
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
                  <div className="text-secondary text-sm">{tier.benefit}</div>
                </div>
              </div>
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
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoUploading}
                  className="px-4 py-2 bg-gold text-charcoal rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {photoUploading ? 'Uploading…' : 'Upload photo'}
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
                  <div key={p.id} className="rounded-lg overflow-hidden border border-light">
                    <img src={p.meta.photo_url} alt="" className="w-full h-36 object-cover" />
                    <div className="p-2 text-xs text-secondary">{p.title} · {formatDate(p.date)}</div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, small }) {
  return (
    <div className="bg-secondary border border-light rounded-lg p-3 text-center">
      <div className="text-secondary text-xs uppercase tracking-widest">{label}</div>
      <div className={clsx('font-heading text-gold mt-1', small ? 'text-sm' : 'text-xl')}>{value}</div>
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
