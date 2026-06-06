import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getHomePath } from '@nail-couture/shared/utils/routes';
import { isRefreshmentAvailable } from '@nail-couture/shared/services/inventoryService';
import { useAvailableRefreshments } from '@nail-couture/shared/hooks/useAvailableRefreshments';
import {
  fetchCustomerStats,
  fetchCustomerReceipts,
  fetchCustomerWaiverDetail,
  fetchReferralInfo,
  fetchCustomerVisitPhotos,
  fetchVisitReceipt,
  formatReceiptContent,
  formatPaymentReceiptRow,
  downloadTextFile,
  receiptFilename,
} from '@nail-couture/shared/utils/customerStats';
import { getTierInfo, generateReferralCode, isBirthdayMonth, tierDetails } from '@nail-couture/shared/utils/loyaltyTier';
import {
  parseProfilePreferences,
  buildProfilePreferences,
  NAIL_SHAPES,
  NAIL_LENGTHS,
  NAIL_FINISHES,
  VISIT_TIME_OPTIONS,
  CONTACT_METHOD_OPTIONS,
  labelForOption,
} from '@nail-couture/shared/utils/profilePreferences';
import { fetchLoyaltyHistory, formatTransactionType } from '@nail-couture/shared/utils/loyaltyTransactions';
import { computeAchievements } from '@nail-couture/shared/utils/customerAchievements';
import { uploadProfileAvatar, getProfileInitials } from '@nail-couture/shared/utils/avatarUpload';
import RefreshmentSelect from './RefreshmentSelect';
import Sidebar from './Sidebar';
import ScrollSelect from './ScrollSelect';
import { modalBtnSecondary } from './AppModal';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'loyalty', label: 'Loyalty' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'activity', label: 'Activity' },
  { id: 'security', label: 'Security' },
];

const MONTHS = [
  { value: '', label: 'Month' },
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const DAYS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1).padStart(2, '0'),
  label: String(i + 1).padStart(2, '0'),
}));

const isValidDate = (month, day) => {
  if (!month || !day) return false;
  const date = new Date(2000, parseInt(month, 10) - 1, parseInt(day, 10));
  return date.getMonth() === parseInt(month, 10) - 1 && date.getDate() === parseInt(day, 10);
};

const cardClass = (theme) =>
  theme === 'dark'
    ? 'p-4 bg-white/[0.02] border border-white/5 rounded-xl'
    : 'p-4 bg-charcoal/[0.02] border border-charcoal/5 rounded-xl';

const labelClass = (theme) =>
  theme === 'dark'
    ? 'text-[10px] uppercase tracking-wider text-offwhite/30 block mb-1'
    : 'text-[10px] uppercase tracking-wider text-charcoal/30 block mb-1';

const valueClass = (theme) =>
  theme === 'dark' ? 'text-sm text-offwhite font-medium' : 'text-sm text-charcoal font-medium';

export default function CustomerProfile() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [waiver, setWaiver] = useState(null);
  const [referralInfo, setReferralInfo] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [preferencesAvailable, setPreferencesAvailable] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const { refreshments, loading: refreshmentsLoading } = useAvailableRefreshments();
  const [birthdayMonth, setBirthdayMonth] = useState('');
  const [birthdayDay, setBirthdayDay] = useState('');
  const [error, setError] = useState('');
  const [showPinForm, setShowPinForm] = useState(false);
  const [pinMode, setPinMode] = useState('set');
  const [pinForm, setPinForm] = useState({ current_pin: '', new_pin: '', confirm_pin: '' });
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [receiptLoadingId, setReceiptLoadingId] = useState(null);
  const [loyaltyHistory, setLoyaltyHistory] = useState({ rows: [], available: false });
  const [visitPhotos, setVisitPhotos] = useState({ rows: [], available: false });
  const [photoFilter, setPhotoFilter] = useState('all');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [commPrefsAvailable, setCommPrefsAvailable] = useState(true);
  const [commPrefsSaving, setCommPrefsSaving] = useState(false);
  const avatarInputRef = useRef(null);

  const fetchProfile = useCallback(async () => {
    const userId = user?.id;
    if (!userId) { navigate('/login'); return; }

    setLoading(true);
    try {
      const { data, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileErr || !data) {
        console.error('Error fetching profile:', profileErr);
        setLoading(false);
        return;
      }

      let profileData = data;
      if (!profileData.referral_code) {
        const newCode = generateReferralCode(profileData.full_name);
        await supabase.from('profiles').update({ referral_code: newCode }).eq('id', userId);
        profileData = { ...profileData, referral_code: newCode };
      }

      setProfile(profileData);
      const bd = profileData.birthday || '';
      setBirthdayMonth(bd ? bd.split('-')[0] : '');
      setBirthdayDay(bd ? bd.split('-')[1] : '');
      const journey = parseProfilePreferences(profileData.preferences);
      setForm({
        full_name: profileData.full_name || '',
        email: profileData.email || '',
        refreshment_pref: profileData.refreshment_pref || '',
        nail_goal: profileData.nail_goal || '',
        journey,
      });
      setPinMode(profileData.pin ? 'change' : 'set');
      setPreferencesAvailable('preferences' in profileData);
      setCommPrefsAvailable(
        'sms_reminders' in profileData || 'email_promotions' in profileData || 'preferred_contact' in profileData
      );

      const [statsData, waiverData, receiptsData, referralData, notifRes, loyaltyData, photosData] = await Promise.all([
        fetchCustomerStats(userId, user?.phone),
        fetchCustomerWaiverDetail(userId),
        fetchCustomerReceipts(userId),
        fetchReferralInfo(profileData),
        supabase.from('notifications').select('*').eq('recipient_id', userId).order('created_at', { ascending: false }).limit(5),
        fetchLoyaltyHistory(userId),
        fetchCustomerVisitPhotos(userId),
      ]);

      setStats(statsData);
      setWaiver(waiverData);
      setReceipts(receiptsData);
      setReferralInfo(referralData);
      setNotifications(notifRes.data || []);
      setLoyaltyHistory(loyaltyData);
      setVisitPhotos(photosData);
    } catch (err) {
      console.error('Profile load error:', err);
    }
    setLoading(false);
  }, [user, navigate]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.is_staff) { navigate(getHomePath(user.role)); return; }
    fetchProfile();
  }, [user, navigate, fetchProfile]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError('');

    const refreshmentPref = isRefreshmentAvailable(form.refreshment_pref, refreshments)
      ? (form.refreshment_pref || null)
      : null;

    let birthday = profile.birthday || null;
    if (birthdayMonth && birthdayDay) {
      if (!isValidDate(birthdayMonth, birthdayDay)) {
        setError('Please select a valid birthday');
        setSaving(false);
        return;
      }
      birthday = `${birthdayMonth}-${birthdayDay}`;
    }

    const payload = {
      full_name: form.full_name,
      email: form.email.trim() || null,
      refreshment_pref: refreshmentPref,
      nail_goal: form.nail_goal || null,
      birthday,
    };
    if (preferencesAvailable) {
      payload.preferences = buildProfilePreferences(form.journey || {});
    }

    let { data, error: updateErr } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', profile.id)
      .select()
      .single();

    if (updateErr?.message?.includes('preferences')) {
      setPreferencesAvailable(false);
      const { preferences: _omit, ...withoutPrefs } = payload;
      const retry = await supabase.from('profiles').update(withoutPrefs).eq('id', profile.id).select().single();
      data = retry.data;
      updateErr = retry.error;
      if (!retry.error) {
        setError('Saved basic preferences. Run sql/023_add_profile_preferences.sql for nail journey fields.');
      }
    }

    if (updateErr) {
      setError('Failed to save preferences');
    } else if (data) {
      setProfile(data);
      if (user) login({ ...user, ...data });
      setEditing(false);
    }
    setSaving(false);
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setPinError('');
    setPinSuccess('');

    if (pinMode === 'change' && !pinForm.current_pin) {
      setPinError('Please enter your current PIN');
      return;
    }
    if (!pinForm.new_pin || pinForm.new_pin.length !== 4) {
      setPinError('New PIN must be exactly 4 digits');
      return;
    }
    if (pinForm.new_pin !== pinForm.confirm_pin) {
      setPinError('New PIN and confirmation do not match');
      return;
    }

    setPinLoading(true);
    try {
      if (pinMode === 'change') {
        const { data: verify, error: verifyErr } = await supabase
          .from('profiles')
          .select('pin')
          .eq('id', profile.id)
          .single();
        if (verifyErr || verify?.pin !== pinForm.current_pin) {
          setPinError('Incorrect current PIN code');
          setPinLoading(false);
          return;
        }
      }

      const { error: pinUpdateErr } = await supabase
        .from('profiles')
        .update({ pin: pinForm.new_pin })
        .eq('id', profile.id);

      if (pinUpdateErr) throw pinUpdateErr;

      setProfile({ ...profile, pin: pinForm.new_pin });
      setPinSuccess('PIN updated successfully!');
      setPinForm({ current_pin: '', new_pin: '', confirm_pin: '' });
      setPinMode('change');
      setTimeout(() => setShowPinForm(false), 1500);
    } catch {
      setPinError('Failed to save PIN code');
    } finally {
      setPinLoading(false);
    }
  };

  const handleCopyReferral = () => {
    if (!profile?.referral_code) return;
    navigator.clipboard.writeText(profile.referral_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const downloadReceipt = async (receiptRow) => {
    if (!user?.id) return;
    setReceiptLoadingId(receiptRow.id);
    try {
      let content = formatPaymentReceiptRow(receiptRow);
      if (receiptRow.appointmentId) {
        try {
          const receipt = await fetchVisitReceipt(receiptRow.appointmentId, user.id, user?.phone);
          if (receipt?.appointment) content = formatReceiptContent(receipt);
        } catch (detailErr) {
          console.warn('Full receipt lookup failed, using payment summary:', detailErr);
        }
      }
      downloadTextFile(content, receiptFilename(receiptRow.date, receiptRow.appointmentId || receiptRow.id));
    } catch (err) {
      console.error('Receipt download error:', err);
      window.alert('Unable to download receipt. Please try again.');
    } finally {
      setReceiptLoadingId(null);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !profile) return;

    setAvatarUploading(true);
    setAvatarError('');
    const result = await uploadProfileAvatar(file, profile.id);
    if (result.success) {
      const updated = { ...profile, avatar_url: result.avatarUrl };
      setProfile(updated);
      if (user) login({ ...user, ...updated });
    } else {
      setAvatarError(result.error || 'Upload failed');
    }
    setAvatarUploading(false);
  };

  const handleCommPrefChange = async (field, value) => {
    if (!profile || !commPrefsAvailable) return;
    setCommPrefsSaving(true);
    const payload = { [field]: value };
    const { data, error: updateErr } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', profile.id)
      .select()
      .single();

    if (updateErr?.message?.includes(field)) {
      setCommPrefsAvailable(false);
    } else if (data) {
      setProfile(data);
      if (user) login({ ...user, ...data });
    }
    setCommPrefsSaving(false);
  };

  const resetEditForm = () => {
    setEditing(false);
    setError('');
    const bd = profile?.birthday || '';
    setBirthdayMonth(bd ? bd.split('-')[0] : '');
    setBirthdayDay(bd ? bd.split('-')[1] : '');
    setForm({
      full_name: profile?.full_name || '',
      email: profile?.email || '',
      refreshment_pref: profile?.refreshment_pref || '',
      nail_goal: profile?.nail_goal || '',
      journey: parseProfilePreferences(profile?.preferences),
    });
  };

  const selectClass = theme === 'dark'
    ? 'w-full p-3 bg-offwhite/10 border border-offwhite/20 text-offwhite focus:border-gold focus:outline-none rounded-lg text-sm'
    : 'w-full p-3 bg-charcoal/10 border border-charcoal/20 text-charcoal focus:border-gold focus:outline-none rounded-lg text-sm';

  if (loading) {
    return (
      <div className={`min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 ${theme === 'dark' ? 'bg-[#0B0B0C] text-white' : 'bg-white text-charcoal'}`}>
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse tracking-widest text-sm">LOADING ACCOUNT...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={`min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 ${theme === 'dark' ? 'bg-[#0B0B0C] text-white' : 'bg-white text-charcoal'}`}>
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <Link to="/login" className="px-4 py-2 bg-gold text-charcoal rounded-lg">Return to Login</Link>
        </div>
      </div>
    );
  }

  const tier = getTierInfo(profile.loyalty_points || 0);
  const achievements = computeAchievements({ stats, profile, referralInfo, tier });
  const panelClass = theme === 'dark' ? 'bg-offwhite/5 border border-white/5 rounded-2xl p-6' : 'bg-charcoal/5 border border-charcoal/5 rounded-2xl p-6';
  const initials = getProfileInitials(profile.full_name);

  return (
    <div className={`min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 ${theme === 'dark' ? 'bg-[#0B0B0C] text-white' : 'bg-white text-charcoal'}`}>
      <Sidebar />

      <div className="profile-section p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 max-w-4xl mx-auto">
        <div className="border-b border-gold/10 pb-6 mb-6">
          <h1 className="font-heading text-3xl text-gold tracking-wide">My Account</h1>
          <p className={theme === 'dark' ? 'text-xs text-offwhite/40 mt-1' : 'text-xs text-charcoal/40 mt-1'}>
            Your profile, visit history, loyalty, and salon preferences
          </p>
        </div>

        {isBirthdayMonth(profile.birthday) && (
          <div className="mb-6 p-4 rounded-xl border border-gold/30 bg-gold/10 text-center">
            <p className="text-gold font-heading text-sm tracking-wide">Happy Birthday Month — ask about your birthday perk at your next visit!</p>
          </div>
        )}

        <div className={`${panelClass} mb-6`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-16 h-16 rounded-2xl object-cover border border-gold/20"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center font-heading text-gold text-2xl uppercase">
                  {initials}
                </div>
              )}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gold text-charcoal text-xs font-bold flex items-center justify-center hover:bg-gold/90 disabled:opacity-50"
                title="Change photo"
              >
                {avatarUploading ? '…' : '+'}
              </button>
              <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className={theme === 'dark' ? 'text-offwhite font-medium text-xl' : 'text-charcoal font-medium text-xl'}>{profile.full_name}</h2>
              <p className={theme === 'dark' ? 'text-offwhite/40 text-sm mt-0.5' : 'text-charcoal/40 text-sm mt-0.5'}>{profile.phone}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`text-xs font-heading px-2 py-0.5 rounded-full border border-gold/30 ${tier.color}`}>{tier.name}</span>
                <span className={theme === 'dark' ? 'text-offwhite/50 text-xs' : 'text-charcoal/50 text-xs'}>{profile.loyalty_points ?? 0} points</span>
                {profile.created_at && (
                  <span className={theme === 'dark' ? 'text-offwhite/30 text-xs' : 'text-charcoal/30 text-xs'}>
                    Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          </div>
          {avatarError && (
            <p className="text-red-400 text-xs mt-3">{avatarError}</p>
          )}
        </div>

        {achievements.some((a) => a.earned) && (
          <div className={`${panelClass} mb-6`}>
            <span className={labelClass(theme)}>Milestones</span>
            <div className="flex flex-wrap gap-2 mt-3">
              {achievements.filter((a) => a.earned).map((badge) => (
                <div
                  key={badge.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-gold/20 ${theme === 'dark' ? 'bg-gold/5' : 'bg-gold/10'}`}
                  title={badge.label}
                >
                  <span className="text-lg">{badge.emoji}</span>
                  <span className="text-xs font-medium text-gold">{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-1 overflow-x-auto mb-6 pb-1 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setActiveTab(tab.id); if (tab.id !== 'preferences') setEditing(false); }}
              className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-gold text-charcoal'
                  : theme === 'dark'
                    ? 'text-offwhite/50 hover:text-offwhite hover:bg-white/5'
                    : 'text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Total visits', value: stats.totalVisits },
                { label: 'Total spent', value: `$${stats.totalSpent.toFixed(2)}` },
                { label: 'Last visit', value: stats.lastVisit ? new Date(stats.lastVisit).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
                { label: 'Favorite service', value: stats.favoriteService || '—' },
              ].map((item) => (
                <div key={item.label} className={cardClass(theme)}>
                  <span className={labelClass(theme)}>{item.label}</span>
                  <span className={`${valueClass(theme)} truncate block`}>{item.value}</span>
                </div>
              ))}
            </div>

            {(stats.lastService || stats.servicesTried > 0) && (
              <div className={panelClass}>
                <h3 className={theme === 'dark' ? 'text-offwhite font-medium mb-3' : 'text-charcoal font-medium mb-3'}>Your Nail Journey</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {stats.lastService && (
                    <div className={cardClass(theme)}>
                      <span className={labelClass(theme)}>Last service</span>
                      <span className={valueClass(theme)}>{stats.lastService}</span>
                    </div>
                  )}
                  <div className={cardClass(theme)}>
                    <span className={labelClass(theme)}>Services tried</span>
                    <span className={valueClass(theme)}>{stats.servicesTried}</span>
                  </div>
                  {stats.favoriteService && stats.isUsualService && (
                    <div className={cardClass(theme)}>
                      <span className={labelClass(theme)}>Your usual</span>
                      <span className="text-sm text-gold font-heading">{stats.favoriteService}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {stats.preferredTechnician && (
              <div className={panelClass}>
                <span className={labelClass(theme)}>Preferred technician</span>
                <span className={valueClass(theme)}>{stats.preferredTechnician}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link to="/customer/history" className={`${panelClass} hover:border-gold/30 transition-colors`}>
                <span className="text-gold font-heading text-sm">Visit History →</span>
                <p className={theme === 'dark' ? 'text-offwhite/40 text-xs mt-1' : 'text-charcoal/40 text-xs mt-1'}>View all past salon visits</p>
              </Link>
              <Link to="/customer/loyalty" className={`${panelClass} hover:border-gold/30 transition-colors`}>
                <span className="text-gold font-heading text-sm">Rewards & Redemption →</span>
                <p className={theme === 'dark' ? 'text-offwhite/40 text-xs mt-1' : 'text-charcoal/40 text-xs mt-1'}>Redeem points for perks</p>
              </Link>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className={panelClass}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={theme === 'dark' ? 'text-offwhite font-medium' : 'text-charcoal font-medium'}>Salon Preferences</h3>
              {!editing && (
                <button
                  type="button"
                  onClick={() => { setEditing(true); setError(''); }}
                  className="px-4 py-2 border border-gold/30 text-gold rounded-xl hover:bg-gold/10 transition-colors text-xs font-medium"
                >
                  Edit
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div>
                  <label className={labelClass(theme)}>Full Name</label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className={theme === 'dark' ? 'w-full p-3 bg-offwhite/10 border border-offwhite/20 text-offwhite focus:border-gold focus:outline-none rounded-lg text-sm' : 'w-full p-3 bg-charcoal/10 border border-charcoal/20 text-charcoal focus:border-gold focus:outline-none rounded-lg text-sm'}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass(theme)}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={theme === 'dark' ? 'w-full p-3 bg-offwhite/10 border border-offwhite/20 text-offwhite focus:border-gold focus:outline-none rounded-lg text-sm' : 'w-full p-3 bg-charcoal/10 border border-charcoal/20 text-charcoal focus:border-gold focus:outline-none rounded-lg text-sm'}
                    placeholder="name@example.com"
                  />
                </div>
                <RefreshmentSelect
                  label="Complementary Drink"
                  value={form.refreshment_pref}
                  onChange={(e) => setForm({ ...form, refreshment_pref: e.target.value })}
                  refreshments={refreshments}
                  loading={refreshmentsLoading}
                  showUnavailableNote
                  emptyLabel="None / No Preference"
                  className="p-3 text-sm"
                />
                <div>
                  <label className={labelClass(theme)}>Nail Philosophy Goal</label>
                  <select
                    value={form.nail_goal}
                    onChange={(e) => setForm({ ...form, nail_goal: e.target.value })}
                    className={theme === 'dark' ? 'w-full p-3 bg-offwhite/10 border border-offwhite/20 text-offwhite focus:border-gold focus:outline-none rounded-lg text-sm' : 'w-full p-3 bg-charcoal/10 border border-charcoal/20 text-charcoal focus:border-gold focus:outline-none rounded-lg text-sm'}
                  >
                    <option value="">Unset</option>
                    <option value="Healthy Natural Nails">Healthy Natural Nails</option>
                    <option value="Long Extensions">Long Extensions</option>
                    <option value="Intricate Art">Intricate Art</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass(theme)}>Birthday (optional)</label>
                  <div className="flex gap-3">
                    <ScrollSelect value={birthdayMonth} onChange={setBirthdayMonth} options={MONTHS} placeholder="Month" className="flex-1" theme={theme} />
                    <ScrollSelect value={birthdayDay} onChange={setBirthdayDay} options={DAYS} placeholder="Day" className="flex-1" theme={theme} />
                  </div>
                </div>

                {preferencesAvailable && (
                  <div className="pt-2 border-t border-gold/10 space-y-4">
                    <p className={theme === 'dark' ? 'text-offwhite/50 text-xs uppercase tracking-wider' : 'text-charcoal/50 text-xs uppercase tracking-wider'}>Nail journey</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass(theme)}>Shape</label>
                        <select value={form.journey?.nail_shape || ''} onChange={(e) => setForm({ ...form, journey: { ...form.journey, nail_shape: e.target.value } })} className={selectClass}>
                          {NAIL_SHAPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass(theme)}>Length</label>
                        <select value={form.journey?.nail_length || ''} onChange={(e) => setForm({ ...form, journey: { ...form.journey, nail_length: e.target.value } })} className={selectClass}>
                          {NAIL_LENGTHS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass(theme)}>Finish</label>
                        <select value={form.journey?.nail_finish || ''} onChange={(e) => setForm({ ...form, journey: { ...form.journey, nail_finish: e.target.value } })} className={selectClass}>
                          {NAIL_FINISHES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass(theme)}>Allergies / sensitivities</label>
                        <textarea
                          value={form.journey?.allergies || ''}
                          onChange={(e) => setForm({ ...form, journey: { ...form.journey, allergies: e.target.value } })}
                          rows={2}
                          placeholder="e.g. acetone sensitivity, latex allergy"
                          className={selectClass}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass(theme)}>Preferred visit times</label>
                        <select
                          value={form.journey?.preferred_visit_time || ''}
                          onChange={(e) => setForm({ ...form, journey: { ...form.journey, preferred_visit_time: e.target.value } })}
                          className={selectClass}
                        >
                          {VISIT_TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {!preferencesAvailable && (
                  <p className={theme === 'dark' ? 'text-offwhite/40 text-xs' : 'text-charcoal/40 text-xs'}>
                    Nail journey fields require migration sql/023_add_profile_preferences.sql in Supabase.
                  </p>
                )}

                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={resetEditForm} className={modalBtnSecondary}>Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 py-3 bg-gold text-charcoal text-sm rounded-xl hover:bg-gold/90 transition-colors font-medium">
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Full name', value: profile.full_name || 'Not set' },
                  { label: 'Phone', value: profile.phone || 'Not set' },
                  { label: 'Email', value: profile.email || 'Not set' },
                  { label: 'Birthday', value: profile.birthday ? new Date(`2000-${profile.birthday}`).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'Not set' },
                  { label: 'Refreshment', value: profile.refreshment_pref || 'None' },
                  { label: 'Nail goal', value: profile.nail_goal || 'Not specified', gold: true },
                ].map((item) => (
                  <div key={item.label} className={cardClass(theme)}>
                    <span className={labelClass(theme)}>{item.label}</span>
                    <span className={item.gold ? 'text-sm text-gold font-heading' : valueClass(theme)}>{item.value}</span>
                  </div>
                ))}
                {preferencesAvailable && (() => {
                  const journey = parseProfilePreferences(profile.preferences);
                  return [
                    { label: 'Nail shape', value: labelForOption(NAIL_SHAPES, journey.nail_shape) },
                    { label: 'Nail length', value: labelForOption(NAIL_LENGTHS, journey.nail_length) },
                    { label: 'Finish', value: labelForOption(NAIL_FINISHES, journey.nail_finish) },
                    { label: 'Allergies / sensitivities', value: journey.allergies || 'None noted' },
                    { label: 'Preferred visit times', value: labelForOption(VISIT_TIME_OPTIONS, journey.preferred_visit_time) },
                  ].map((item) => (
                    <div key={item.label} className={cardClass(theme)}>
                      <span className={labelClass(theme)}>{item.label}</span>
                      <span className={valueClass(theme)}>{item.value}</span>
                    </div>
                  ));
                })()}
              </div>
            )}

            <div className={`${panelClass} mt-6`}>
              <h3 className={theme === 'dark' ? 'text-offwhite font-medium mb-1' : 'text-charcoal font-medium mb-1'}>Communication Preferences</h3>
              <p className={theme === 'dark' ? 'text-offwhite/40 text-xs mb-4' : 'text-charcoal/40 text-xs mb-4'}>
                How we reach you about visits and salon offers
              </p>
              {commPrefsAvailable ? (
                <div className="space-y-4">
                  <label className={`flex items-center justify-between gap-4 ${cardClass(theme)} cursor-pointer`}>
                    <span className={valueClass(theme)}>SMS visit reminders</span>
                    <input
                      type="checkbox"
                      checked={profile.sms_reminders !== false}
                      disabled={commPrefsSaving}
                      onChange={(e) => handleCommPrefChange('sms_reminders', e.target.checked)}
                      className="w-5 h-5 accent-gold"
                    />
                  </label>
                  <label className={`flex items-center justify-between gap-4 ${cardClass(theme)} cursor-pointer`}>
                    <span className={valueClass(theme)}>Email promotions & offers</span>
                    <input
                      type="checkbox"
                      checked={profile.email_promotions !== false}
                      disabled={commPrefsSaving}
                      onChange={(e) => handleCommPrefChange('email_promotions', e.target.checked)}
                      className="w-5 h-5 accent-gold"
                    />
                  </label>
                  <div className={cardClass(theme)}>
                    <label className={labelClass(theme)}>Preferred contact method</label>
                    <select
                      value={profile.preferred_contact || 'phone'}
                      disabled={commPrefsSaving}
                      onChange={(e) => handleCommPrefChange('preferred_contact', e.target.value)}
                      className={selectClass}
                    >
                      {CONTACT_METHOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <p className={theme === 'dark' ? 'text-offwhite/40 text-xs' : 'text-charcoal/40 text-xs'}>
                  Run sql/024_phase3_loyalty_engagement.sql in Supabase to enable communication preferences.
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'loyalty' && (
          <div className="space-y-6">
            <div className={panelClass}>
              <div className="text-center mb-4">
                <div className={`font-heading text-2xl mb-1 ${tier.color}`}>{tier.name} Member</div>
                <div className="text-4xl font-heading text-gold">{profile.loyalty_points ?? 0}</div>
                <div className={theme === 'dark' ? 'text-offwhite/40 text-xs' : 'text-charcoal/40 text-xs'}>loyalty points</div>
              </div>
              {tier.nextTier && (
                <div className="max-w-sm mx-auto mb-4">
                  <div className="flex justify-between text-xs mb-1" style={{ color: theme === 'dark' ? 'rgba(249,249,249,0.4)' : 'rgba(18,18,18,0.4)' }}>
                    <span>Next: {tier.nextTier}</span>
                    <span>{profile.loyalty_points || 0} / {tier.nextThreshold}</span>
                  </div>
                  <div className="w-full rounded-full h-1.5" style={{ backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(18,18,18,0.1)' }}>
                    <div className="h-1.5 rounded-full bg-gold" style={{ width: `${tier.progress}%` }} />
                  </div>
                </div>
              )}
              <p className={`text-center text-sm ${theme === 'dark' ? 'text-offwhite/60' : 'text-charcoal/60'}`}>{tier.benefit}</p>
              {tier.nextTier && (
                <p className={`text-center text-xs mt-3 ${theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40'}`}>
                  {tierDetails[tier.name]?.reward}
                </p>
              )}
            </div>

            {referralInfo && (referralInfo.referredByName || referralInfo.referralsCount > 0) && (
              <div className={panelClass}>
                <span className={labelClass(theme)}>Referral network</span>
                <div className={`mt-2 space-y-1 ${valueClass(theme)}`}>
                  {referralInfo.referredByName && (
                    <p className="text-sm">Referred by <span className="text-gold">{referralInfo.referredByName}</span></p>
                  )}
                  {referralInfo.referralsCount > 0 && (
                    <p className="text-sm">You referred <span className="text-gold">{referralInfo.referralsCount}</span> friend{referralInfo.referralsCount !== 1 ? 's' : ''}</p>
                  )}
                </div>
              </div>
            )}

            {profile.referral_code && (
              <div className={panelClass}>
                <span className={labelClass(theme)}>Your referral code</span>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <span className="text-lg text-gold font-heading tracking-widest">{profile.referral_code}</span>
                  <button type="button" onClick={handleCopyReferral} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gold/30 text-gold hover:bg-gold/10">
                    {copiedCode ? 'Copied' : 'Copy'}
                  </button>
                  <a
                    href={`https://wa.me/?text=Use%20code%20${profile.referral_code}%20at%20Nail%20Couture%20for%20an%20exclusive%20discount!`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-green-500/30 text-green-500 hover:bg-green-500/10"
                  >
                    Share on WhatsApp
                  </a>
                </div>
              </div>
            )}

            {loyaltyHistory.available && loyaltyHistory.rows.length > 0 && (
              <div className={panelClass}>
                <h3 className={theme === 'dark' ? 'text-offwhite font-medium mb-4' : 'text-charcoal font-medium mb-4'}>Points History</h3>
                <div className="space-y-3">
                  {loyaltyHistory.rows.map((tx) => (
                    <div key={tx.id} className={`flex justify-between items-start py-3 border-b last:border-0 ${theme === 'dark' ? 'border-white/5' : 'border-charcoal/5'}`}>
                      <div>
                        <div className={valueClass(theme)}>
                          {tx.description || formatTransactionType(tx.transaction_type)}
                        </div>
                        <div className={theme === 'dark' ? 'text-offwhite/40 text-xs' : 'text-charcoal/40 text-xs'}>
                          {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {tx.redemption_code && ` · Code: ${tx.redemption_code}`}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <span className={`font-heading text-sm ${tx.points >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                          {tx.points >= 0 ? '+' : ''}{tx.points}
                        </span>
                        <div className={theme === 'dark' ? 'text-offwhite/30 text-xs' : 'text-charcoal/30 text-xs'}>
                          bal. {tx.balance_after}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Link to="/customer/loyalty" className={`block ${panelClass} hover:border-gold/30 transition-colors text-center`}>
              <span className="text-gold font-heading">View Rewards Program →</span>
              <p className={theme === 'dark' ? 'text-offwhite/40 text-xs mt-1' : 'text-charcoal/40 text-xs mt-1'}>Redeem during your next salon check-in</p>
            </Link>
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className={panelClass}>
            <h3 className={theme === 'dark' ? 'text-offwhite font-medium mb-4' : 'text-charcoal font-medium mb-4'}>Before & After Gallery</h3>
            {!visitPhotos.available ? (
              <p className={theme === 'dark' ? 'text-offwhite/50 text-sm' : 'text-charcoal/50 text-sm'}>Photo gallery is not available yet.</p>
            ) : (
              <>
                <div className="flex gap-2 mb-6 flex-wrap">
                  {[
                    { key: 'all', label: 'All', count: visitPhotos.rows.length },
                    { key: 'before', label: 'Before', count: visitPhotos.rows.filter((p) => p.photo_type === 'before').length },
                    { key: 'after', label: 'After', count: visitPhotos.rows.filter((p) => p.photo_type === 'after').length },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => setPhotoFilter(filter.key)}
                      className={`px-4 py-2 rounded-full text-xs font-heading transition-all ${
                        photoFilter === filter.key
                          ? 'bg-gold text-charcoal'
                          : theme === 'dark'
                            ? 'border border-gold/30 text-offwhite/60 hover:border-gold hover:text-gold'
                            : 'border border-gold/30 text-charcoal/60 hover:border-gold hover:text-gold'
                      }`}
                    >
                      {filter.label} ({filter.count})
                    </button>
                  ))}
                </div>
                {visitPhotos.rows.filter((photo) => photoFilter === 'all' || photo.photo_type === photoFilter).length === 0 ? (
                  <p className={theme === 'dark' ? 'text-offwhite/40 text-sm text-center py-10' : 'text-charcoal/40 text-sm text-center py-10'}>
                    No {photoFilter === 'all' ? '' : `${photoFilter} `}photos yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {visitPhotos.rows
                      .filter((photo) => photoFilter === 'all' || photo.photo_type === photoFilter)
                      .map((photo) => (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => setSelectedPhoto(photo)}
                          className="rounded-xl overflow-hidden border border-gold/20 text-left hover:border-gold/40 transition-colors"
                        >
                          <img src={photo.photo_url} alt="" className="w-full h-36 object-cover" />
                          <div className={`p-2 text-xs ${theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50'}`}>
                            {photo.photo_type === 'before' ? 'Before' : 'After'} · {new Date(photo.created_at).toLocaleDateString()}
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-6">
            {stats?.recentVisits?.length > 0 ? (
              <div className={panelClass}>
                <h3 className={theme === 'dark' ? 'text-offwhite font-medium mb-4' : 'text-charcoal font-medium mb-4'}>Recent Visits</h3>
                <div className="space-y-3">
                  {stats.recentVisits.map((visit) => (
                    <div key={visit.id} className={`flex justify-between items-center py-3 border-b last:border-0 ${theme === 'dark' ? 'border-white/5' : 'border-charcoal/5'}`}>
                      <div>
                        <div className={valueClass(theme)}>{visit.serviceName}</div>
                        <div className={theme === 'dark' ? 'text-offwhite/40 text-xs' : 'text-charcoal/40 text-xs'}>
                          {visit.date ? new Date(visit.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </div>
                      </div>
                      {visit.price != null && <span className="text-gold font-heading text-sm">${Number(visit.price).toFixed(2)}</span>}
                    </div>
                  ))}
                </div>
                <Link to="/customer/history" className="inline-block mt-4 text-gold text-sm font-medium hover:underline">View full history →</Link>
              </div>
            ) : (
              <div className={`${panelClass} text-center py-8`}>
                <p className={theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50'}>No completed visits yet. Check in at the salon to start your journey.</p>
              </div>
            )}

            {receipts.length > 0 && (
              <div className={panelClass}>
                <h3 className={theme === 'dark' ? 'text-offwhite font-medium mb-4' : 'text-charcoal font-medium mb-4'}>Payment History</h3>
                <div className="space-y-3">
                  {receipts.map((r) => (
                    <div key={r.id} className={`flex justify-between items-start gap-3 py-3 border-b last:border-0 ${theme === 'dark' ? 'border-white/5' : 'border-charcoal/5'}`}>
                      <div className="min-w-0">
                        <div className={valueClass(theme)}>{r.serviceName}</div>
                        <div className={theme === 'dark' ? 'text-offwhite/40 text-xs' : 'text-charcoal/40 text-xs'}>
                          {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {' · '}{r.paymentMethod}
                          {r.discount > 0 && ` · -$${r.discount.toFixed(2)} ${r.discountType || ''}`}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-gold font-heading text-sm">${r.finalAmount.toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => downloadReceipt(r)}
                          disabled={receiptLoadingId === r.id}
                          className="px-2.5 py-1 text-[10px] font-medium rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors disabled:opacity-50"
                        >
                          {receiptLoadingId === r.id ? '…' : 'Receipt'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={panelClass}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className={labelClass(theme)}>Salon waiver</span>
                  {waiver?.signed_at ? (
                    <p className={valueClass(theme)}>
                      Signed {new Date(waiver.signed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  ) : (
                    <p className={theme === 'dark' ? 'text-offwhite/50 text-sm' : 'text-charcoal/50 text-sm'}>No waiver on file</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {waiver?.signature_image && (
                    <button type="button" onClick={() => setShowWaiverModal(true)} className="px-3 py-2 text-xs border border-gold/30 text-gold rounded-lg hover:bg-gold/10">
                      View signature
                    </button>
                  )}
                  <Link to="/check-in" className="px-3 py-2 text-xs border border-white/10 rounded-lg hover:border-gold/30 text-gold">
                    Update at kiosk
                  </Link>
                </div>
              </div>
            </div>

            {notifications.length > 0 && (
              <div className={panelClass}>
                <h3 className={theme === 'dark' ? 'text-offwhite font-medium mb-4' : 'text-charcoal font-medium mb-4'}>Recent Notifications</h3>
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <div key={n.id} className={cardClass(theme)}>
                      <div className="font-medium text-sm text-gold">{n.title}</div>
                      <div className={theme === 'dark' ? 'text-offwhite/60 text-xs mt-1' : 'text-charcoal/60 text-xs mt-1'}>{n.body || n.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'security' && (
          <div className={`${panelClass} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
            <div>
              <h3 className={theme === 'dark' ? 'text-offwhite font-medium text-base' : 'text-charcoal font-medium text-base'}>Kiosk Self-Service PIN</h3>
              <p className={theme === 'dark' ? 'text-xs text-offwhite/40 mt-1 max-w-md' : 'text-xs text-charcoal/40 mt-1 max-w-md'}>
                Use a 4-digit code for quick check-in at salon kiosks.
              </p>
              <p className={theme === 'dark' ? 'text-xs text-offwhite/30 mt-2' : 'text-xs text-charcoal/30 mt-2'}>
                Status: {profile.pin ? 'PIN is set' : 'No PIN configured'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setShowPinForm(true); setPinError(''); setPinSuccess(''); }}
              className={theme === 'dark' ? 'px-5 py-2.5 bg-white/5 border border-white/10 text-offwhite rounded-xl hover:bg-white/10 transition-colors text-xs font-medium shrink-0' : 'px-5 py-2.5 bg-charcoal/5 border border-charcoal/10 text-charcoal rounded-xl hover:bg-charcoal/10 transition-colors text-xs font-medium shrink-0'}
            >
              {profile.pin ? 'Update PIN' : 'Setup PIN'}
            </button>
          </div>
        )}
      </div>

      {showWaiverModal && waiver?.signature_image && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowWaiverModal(false)}>
          <div className={theme === 'dark' ? 'w-full max-w-lg bg-[#1a1a1a] rounded-xl border border-gold/10 p-6' : 'w-full max-w-lg bg-white rounded-xl border border-gold/10 p-6'} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl text-gold">Signed Waiver</h2>
              <button type="button" onClick={() => setShowWaiverModal(false)} className={theme === 'dark' ? 'text-offwhite/40 hover:text-offwhite text-2xl' : 'text-charcoal/40 hover:text-charcoal text-2xl'}>&times;</button>
            </div>
            <p className={theme === 'dark' ? 'text-offwhite/50 text-xs mb-4' : 'text-charcoal/50 text-xs mb-4'}>
              Signed {waiver.signed_at ? new Date(waiver.signed_at).toLocaleString() : ''}
            </p>
            <img src={waiver.signature_image} alt="Your signature" className="w-full max-h-48 object-contain bg-white rounded-lg border border-charcoal/10" />
          </div>
        </div>
      )}

      {showPinForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowPinForm(false)}>
          <div className={theme === 'dark' ? 'w-full max-w-md flex flex-col max-h-[min(90dvh,calc(100dvh-2rem))] bg-[#1a1a1a] rounded-t-2xl sm:rounded-xl overflow-hidden mx-0 sm:mx-4 border border-gold/10 shadow-2xl' : 'w-full max-w-md flex flex-col max-h-[min(90dvh,calc(100dvh-2rem))] bg-white rounded-t-2xl sm:rounded-xl overflow-hidden mx-0 sm:mx-4 border border-gold/10 shadow-2xl'} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 p-4 sm:p-6 border-b border-gold/10 shrink-0">
              <div>
                <h2 className="font-heading text-xl text-gold mb-0">{pinMode === 'change' ? 'Change Kiosk PIN' : 'Set Kiosk PIN'}</h2>
                <p className={theme === 'dark' ? 'text-offwhite/40 text-xs mt-1' : 'text-charcoal/40 text-xs mt-1'}>4-digit numeric passcode</p>
              </div>
              <button type="button" onClick={() => setShowPinForm(false)} className={theme === 'dark' ? 'text-offwhite/40 hover:text-offwhite text-2xl' : 'text-charcoal/40 hover:text-charcoal text-2xl'}>&times;</button>
            </div>
            <form onSubmit={handlePinSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {pinMode === 'change' && (
                <div>
                  <label className={labelClass(theme)}>Current PIN</label>
                  <input type="password" inputMode="numeric" maxLength={4} value={pinForm.current_pin} onChange={(e) => setPinForm({ ...pinForm, current_pin: e.target.value.replace(/\D/g, '').slice(0, 4) })} className={theme === 'dark' ? 'w-full p-3 text-offwhite bg-offwhite/10 border border-offwhite/20 rounded-lg focus:border-gold focus:outline-none tracking-widest text-center text-xl' : 'w-full p-3 text-charcoal bg-charcoal/10 border border-charcoal/20 rounded-lg focus:border-gold focus:outline-none tracking-widest text-center text-xl'} />
                </div>
              )}
              <div>
                <label className={labelClass(theme)}>New PIN</label>
                <input type="password" inputMode="numeric" maxLength={4} value={pinForm.new_pin} onChange={(e) => setPinForm({ ...pinForm, new_pin: e.target.value.replace(/\D/g, '').slice(0, 4) })} className={theme === 'dark' ? 'w-full p-3 text-offwhite bg-offwhite/10 border border-offwhite/20 rounded-lg focus:border-gold focus:outline-none tracking-widest text-center text-xl' : 'w-full p-3 text-charcoal bg-charcoal/10 border border-charcoal/20 rounded-lg focus:border-gold focus:outline-none tracking-widest text-center text-xl'} />
              </div>
              <div>
                <label className={labelClass(theme)}>Confirm PIN</label>
                <input type="password" inputMode="numeric" maxLength={4} value={pinForm.confirm_pin} onChange={(e) => setPinForm({ ...pinForm, confirm_pin: e.target.value.replace(/\D/g, '').slice(0, 4) })} className={theme === 'dark' ? 'w-full p-3 text-offwhite bg-offwhite/10 border border-offwhite/20 rounded-lg focus:border-gold focus:outline-none tracking-widest text-center text-xl' : 'w-full p-3 text-charcoal bg-charcoal/10 border border-charcoal/20 rounded-lg focus:border-gold focus:outline-none tracking-widest text-center text-xl'} />
              </div>
              {pinError && <p className="text-red-400 text-sm text-center">{pinError}</p>}
              {pinSuccess && <p className="text-green-400 text-sm text-center">{pinSuccess}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPinForm(false)} className={modalBtnSecondary}>Cancel</button>
                <button type="submit" disabled={pinLoading} className="flex-1 py-3 bg-gold text-charcoal rounded-xl hover:bg-gold/90 transition-colors font-medium text-sm disabled:opacity-50">
                  {pinLoading ? 'Saving...' : 'Save PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setSelectedPhoto(null)} className="absolute -top-10 right-0 text-offwhite/70 hover:text-offwhite text-2xl">&times;</button>
            <img src={selectedPhoto.photo_url} alt="" className="w-full max-h-[80vh] object-contain rounded-xl" />
            <div className="text-center text-offwhite/70 text-sm mt-3">
              {selectedPhoto.photo_type === 'before' ? 'Before' : 'After'} · {new Date(selectedPhoto.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
