import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getHomePath } from '@nail-couture/shared/utils/routes';
import { isRefreshmentAvailable } from '@nail-couture/shared/services/inventoryService';
import { useAvailableRefreshments } from '@nail-couture/shared/hooks/useAvailableRefreshments';
import { CONTACT_METHOD_OPTIONS } from '@nail-couture/shared/utils/profilePreferences';
import NotificationPreferencesPanel from '@nail-couture/shared/components/NotificationPreferencesPanel.jsx';
import ToggleSwitch from '@nail-couture/shared/components/ToggleSwitch.jsx';
import RefreshmentSelect from './RefreshmentSelect';
import ScrollSelect from './ScrollSelect';
import Sidebar from './Sidebar';

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

const formatPhone = (phone) => {
  if (!phone) return 'Not set';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
};

export default function CustomerSettings() {
  const navigate = useNavigate();
  const { user, login, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { refreshments, loading: refreshmentsLoading } = useAvailableRefreshments();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', refreshment_pref: '', nail_goal: '' });
  const [birthdayMonth, setBirthdayMonth] = useState('');
  const [birthdayDay, setBirthdayDay] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [commPrefsAvailable, setCommPrefsAvailable] = useState(true);
  const [commPrefsSaving, setCommPrefsSaving] = useState(false);

  const shellClass = theme === 'dark' ? 'bg-[#0B0B0C] text-white' : 'bg-white text-charcoal';
  const cardClass =
    theme === 'dark'
      ? 'rounded-2xl border border-white/10 bg-white/[0.03] p-6'
      : 'rounded-2xl border border-gold/15 bg-gold/[0.04] p-6';
  const inputClass =
    theme === 'dark'
      ? 'w-full p-3 bg-offwhite/10 border border-offwhite/20 text-offwhite focus:border-gold focus:outline-none rounded-lg text-sm'
      : 'w-full p-3 bg-charcoal/10 border border-charcoal/20 text-charcoal focus:border-gold focus:outline-none rounded-lg text-sm';
  const labelClass =
    theme === 'dark'
      ? 'text-[10px] uppercase tracking-wider text-offwhite/30 block mb-2'
      : 'text-[10px] uppercase tracking-wider text-charcoal/30 block mb-2';
  const itemCardClass =
    theme === 'dark'
      ? 'p-4 bg-white/[0.02] border border-white/5 rounded-xl'
      : 'p-4 bg-charcoal/[0.02] border border-charcoal/5 rounded-xl';

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.is_staff) {
      navigate(getHomePath(user.role));
      return;
    }
    fetchProfile();
  }, [user, authLoading, navigate]);

  const fetchProfile = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error) {
      console.error('Error fetching profile:', error);
      setProfile(user);
      setForm({
        full_name: user.full_name || '',
        email: user.email || '',
        refreshment_pref: user.refreshment_pref || '',
        nail_goal: user.nail_goal || '',
      });
    } else if (data) {
      setProfile(data);
      const bd = data.birthday || '';
      setBirthdayMonth(bd ? bd.split('-')[0] : '');
      setBirthdayDay(bd ? bd.split('-')[1] : '');
      setForm({
        full_name: data.full_name || '',
        email: data.email || '',
        refreshment_pref: data.refreshment_pref || '',
        nail_goal: data.nail_goal || '',
      });
      setCommPrefsAvailable(
        'sms_reminders' in data || 'email_promotions' in data || 'preferred_contact' in data,
      );
    }
    setLoading(false);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setSaveError('');

    const refreshmentPref = isRefreshmentAvailable(form.refreshment_pref, refreshments)
      ? (form.refreshment_pref || null)
      : null;

    let birthday = profile.birthday || null;
    if (birthdayMonth && birthdayDay) {
      if (!isValidDate(birthdayMonth, birthdayDay)) {
        setSaveError('Please select a valid birthday');
        setSaving(false);
        return;
      }
      birthday = `${birthdayMonth}-${birthdayDay}`;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name,
        email: form.email.trim() || null,
        refreshment_pref: refreshmentPref,
        nail_goal: form.nail_goal || null,
        birthday,
      })
      .eq('id', profile.id)
      .select()
      .single();

    if (error) {
      setSaveError('Failed to save profile');
    } else if (data) {
      setProfile(data);
      if (user) login({ ...user, ...data });
      setEditing(false);
    }
    setSaving(false);
  };

  const handleCommPrefChange = async (field, value) => {
    if (!profile || !commPrefsAvailable) return;
    setCommPrefsSaving(true);
    const { data, error } = await supabase
      .from('profiles')
      .update({ [field]: value })
      .eq('id', profile.id)
      .select()
      .single();

    if (error?.message?.includes(field)) {
      setCommPrefsAvailable(false);
    } else if (data) {
      setProfile(data);
      if (user) login({ ...user, ...data });
    }
    setCommPrefsSaving(false);
  };

  const cancelEdit = () => {
    setEditing(false);
    setSaveError('');
    const bd = profile?.birthday || '';
    setBirthdayMonth(bd ? bd.split('-')[0] : '');
    setBirthdayDay(bd ? bd.split('-')[1] : '');
    setForm({
      full_name: profile?.full_name || '',
      email: profile?.email || '',
      refreshment_pref: profile?.refreshment_pref || '',
      nail_goal: profile?.nail_goal || '',
    });
  };

  if (authLoading || loading) {
    return (
      <div className={`min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 ${shellClass}`}>
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse tracking-widest text-sm">LOADING SETTINGS...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 ${shellClass}`}>
      <Sidebar />

      <div className="settings-page max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-24 lg:pb-8">
        <div className="border-b border-gold/10 pb-6 mb-6">
          <h1 className="font-heading text-3xl text-gold tracking-wide">Settings</h1>
          <p className={theme === 'dark' ? 'text-xs text-offwhite/40 mt-1' : 'text-xs text-charcoal/40 mt-1'}>
            Update your account details and notification preferences
          </p>
        </div>

        <div className={`${cardClass} mb-6`}>
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-gold/10">
            <div>
              <h2 className={theme === 'dark' ? 'text-offwhite font-heading text-xl' : 'text-charcoal font-heading text-xl'}>
                Profile Information
              </h2>
              <p className={theme === 'dark' ? 'text-offwhite/50 text-sm mt-1' : 'text-charcoal/50 text-sm mt-1'}>
                {formatPhone(profile?.phone)}
              </p>
            </div>
            {!editing && (
              <button
                type="button"
                onClick={() => { setEditing(true); setSaveError(''); }}
                className="px-4 py-2 border border-gold/30 text-gold rounded-xl hover:bg-gold/10 transition-colors text-xs font-medium"
              >
                Edit Profile
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div>
                <label className={labelClass}>Full Name</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass}
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
                <label className={labelClass}>Nail Philosophy Goal</label>
                <select
                  value={form.nail_goal}
                  onChange={(e) => setForm({ ...form, nail_goal: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Unset</option>
                  <option value="Healthy Natural Nails">Healthy Natural Nails</option>
                  <option value="Long Extensions">Long Extensions</option>
                  <option value="Intricate Art">Intricate Art</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Birthday (optional)</label>
                <div className="flex gap-3">
                  <ScrollSelect value={birthdayMonth} onChange={setBirthdayMonth} options={MONTHS} placeholder="Month" className="flex-1" theme={theme} />
                  <ScrollSelect value={birthdayDay} onChange={setBirthdayDay} options={DAYS} placeholder="Day" className="flex-1" theme={theme} />
                </div>
              </div>
              {saveError && <p className="text-red-400 text-sm">{saveError}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex-1 py-3 border border-gold/20 text-gold/80 rounded-xl hover:bg-gold/5 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-gold text-charcoal text-sm rounded-xl hover:bg-gold/90 transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Full Name', value: profile?.full_name || 'Not set' },
                { label: 'Phone', value: formatPhone(profile?.phone) },
                { label: 'Email', value: profile?.email || 'Not set' },
                {
                  label: 'Birthday',
                  value: profile?.birthday
                    ? new Date(`2000-${profile.birthday}`).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
                    : 'Not set',
                },
                { label: 'Refreshment', value: profile?.refreshment_pref || 'None' },
                { label: 'Nail Goal', value: profile?.nail_goal || 'Not specified', gold: true },
              ].map((item) => (
                <div key={item.label} className={itemCardClass}>
                  <span className={labelClass}>{item.label}</span>
                  <span className={item.gold ? 'text-sm text-gold font-heading' : theme === 'dark' ? 'text-sm text-offwhite font-medium' : 'text-sm text-charcoal font-medium'}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          <Link
            to="/customer/profile"
            className="inline-block mt-6 text-xs text-gold hover:text-gold/80 transition-colors"
          >
            View full account (loyalty, visits, gallery) →
          </Link>
        </div>

        <div className={`${cardClass} mb-6`}>
          <h3 className={theme === 'dark' ? 'text-offwhite font-medium mb-1' : 'text-charcoal font-medium mb-1'}>
            Communication Preferences
          </h3>
          <p className={theme === 'dark' ? 'text-offwhite/40 text-xs mb-4' : 'text-charcoal/40 text-xs mb-4'}>
            How we reach you about visits and salon offers
          </p>
          {commPrefsAvailable ? (
            <div className="space-y-4">
              <label className={`flex items-center justify-between gap-4 ${itemCardClass} cursor-pointer`}>
                <span className={theme === 'dark' ? 'text-sm text-offwhite font-medium' : 'text-sm text-charcoal font-medium'}>
                  SMS visit reminders
                </span>
                <input
                  type="checkbox"
                  checked={profile?.sms_reminders !== false}
                  disabled={commPrefsSaving}
                  onChange={(e) => handleCommPrefChange('sms_reminders', e.target.checked)}
                  className="w-5 h-5 accent-gold"
                />
              </label>
              <label className={`flex items-center justify-between gap-4 ${itemCardClass} cursor-pointer`}>
                <span className={theme === 'dark' ? 'text-sm text-offwhite font-medium' : 'text-sm text-charcoal font-medium'}>
                  Email promotions & offers
                </span>
                <input
                  type="checkbox"
                  checked={profile?.email_promotions !== false}
                  disabled={commPrefsSaving}
                  onChange={(e) => handleCommPrefChange('email_promotions', e.target.checked)}
                  className="w-5 h-5 accent-gold"
                />
              </label>
              <div className={itemCardClass}>
                <label className={labelClass}>Preferred contact method</label>
                <select
                  value={profile?.preferred_contact || 'phone'}
                  disabled={commPrefsSaving}
                  onChange={(e) => handleCommPrefChange('preferred_contact', e.target.value)}
                  className={inputClass}
                >
                  {CONTACT_METHOD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <p className={theme === 'dark' ? 'text-offwhite/40 text-xs' : 'text-charcoal/40 text-xs'}>
              Run sql/024_phase3_loyalty_engagement.sql in Supabase to enable communication preferences.
            </p>
          )}
        </div>

        <div className={`${cardClass} mb-6 flex items-center justify-between gap-4`}>
          <div>
            <p className={theme === 'dark' ? 'text-offwhite font-medium' : 'text-charcoal font-medium'}>Dark Mode</p>
            <p className={theme === 'dark' ? 'text-offwhite/50 text-xs mt-1' : 'text-charcoal/50 text-xs mt-1'}>
              Toggle app theme
            </p>
          </div>
          <ToggleSwitch
            checked={theme === 'dark'}
            theme={theme}
            ariaLabel={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onChange={() => toggleTheme()}
          />
        </div>

        <NotificationPreferencesPanel userPhone={user?.phone || profile?.phone} role="customer" theme={theme} />
      </div>
    </div>
  );
}
