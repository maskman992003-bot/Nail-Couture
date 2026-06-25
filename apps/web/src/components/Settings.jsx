import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme } from '../hooks/useAppTheme.js';
import { getThemeOptions } from '../themes/index.js';
import { mergeSkinWithPalette } from '../themes/resolveThemePalette.js';
import Sidebar from './Sidebar';
import NotificationPreferencesPanel from '@nail-couture/shared/components/NotificationPreferencesPanel.jsx';
import SessionTimeoutSettingsPanel from './SessionTimeoutSettingsPanel.jsx';
import StuckCheckInsPanel from './StuckCheckInsPanel.jsx';
import MysteryGiftPanel from './MysteryGiftPanel.jsx';
import clsx from 'clsx';

const roleLabels = {
  super_admin: 'Super Admin',
  owner: 'Owner',
  partner: 'Partner',
  admin: 'Admin',
  cashier: 'Cashier',
  technician: 'Technician',
};

const roleColors = {
  super_admin: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  owner: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  partner: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  admin: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  cashier: 'bg-green-500/20 text-green-300 border-green-500/30',
  technician: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
};

const formatPhone = (phone) => {
  if (!phone) return 'Not set';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11) {
    return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'Unknown';
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const APP_THEME_OPTIONS = getThemeOptions().map(({ id, config, description }) => ({
  id,
  config,
  description,
}));

function ThemePreviewSwatch({ config }) {
  return (
    <div
      className="h-24 rounded-xl overflow-hidden border mb-4"
      style={{ borderColor: config.borderColor }}
      aria-hidden
    >
      <div className="flex h-full">
        <div
          className="w-[26%] shrink-0 flex flex-col gap-1.5 border-r p-2"
          style={{
            background: config.layout.sidebarBackground,
            borderColor: config.borderColor,
          }}
        >
          <div
            className="h-1.5 w-4 rounded-full"
            style={{ background: config.accentColor }}
          />
          <div
            className="h-1 w-full rounded-full opacity-40"
            style={{ background: config.textSecondary }}
          />
          <div
            className="h-1 w-3/4 rounded-full opacity-25"
            style={{ background: config.textSecondary }}
          />
        </div>
        <div
          className="flex min-w-0 flex-1 flex-col justify-between p-2.5"
          style={{ background: config.backgroundColor }}
        >
          <div
            className="flex flex-1 flex-col justify-center p-2"
            style={{
              background: config.backgroundSecondary,
              border: config.cardStyle.border,
              borderRadius: config.cardStyle.borderRadius,
              backdropFilter: config.cardStyle.backdropFilter ?? undefined,
              boxShadow:
                config.cardStyle.boxShadow && config.cardStyle.boxShadow !== 'none'
                  ? config.cardStyle.boxShadow
                  : undefined,
            }}
          >
            <div
              className="mb-1 h-1 w-1/2 rounded-full opacity-70"
              style={{ background: config.textPrimary }}
            />
            <div
              className="h-1 w-full rounded-full opacity-35"
              style={{ background: config.textSecondary }}
            />
          </div>
          <div
            className="mt-2 h-2 w-10 shrink-0 self-end rounded-sm"
            style={{ background: config.accentColor }}
          />
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const { theme, colorScheme, activeTheme, switchTheme, themeConfig, themeSaving, themeError } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '' });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [workStats, setWorkStats] = useState({ todayCount: 0, todayValue: 0, weekCount: 0, weekValue: 0 });
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinMode, setPinMode] = useState('set');
  const [pinStep, setPinStep] = useState(1);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [pendingSkinId, setPendingSkinId] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    if (!user?.id) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      setProfile(user);
      setForm({
        full_name: user.full_name || '',
        phone: user.phone || '',
        email: user.email || '',
      });
    } else if (data) {
      setProfile(data);
      setForm({
        full_name: data.full_name || '',
        phone: data.phone || '',
        email: data.email || '',
      });
      await fetchWorkStats(data.id, data.role);
    }

    setLoading(false);
  };

  const fetchWorkStats = async (userId, role) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);

    if (role === 'technician') {
      const { count: todayCount } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('technician_id', userId)
        .eq('status', 'completed')
        .gte('checked_in_at', today.toISOString());

      const { data: todayAppts } = await supabase
        .from('appointments')
        .select('final_price, services(price)')
        .eq('technician_id', userId)
        .eq('status', 'completed')
        .gte('checked_in_at', today.toISOString());

      const { count: weekCount } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('technician_id', userId)
        .eq('status', 'completed')
        .gte('checked_in_at', weekStart.toISOString());

      const { data: weekAppts } = await supabase
        .from('appointments')
        .select('final_price, services(price)')
        .eq('technician_id', userId)
        .eq('status', 'completed')
        .gte('checked_in_at', weekStart.toISOString());

      const sumPrices = (rows) =>
        (rows || []).reduce((sum, row) => sum + (row.final_price ?? row.services?.price ?? 0), 0);

      setWorkStats({
        todayCount: todayCount || 0,
        todayValue: sumPrices(todayAppts),
        weekCount: weekCount || 0,
        weekValue: sumPrices(weekAppts),
      });
      return;
    }

    if (['cashier', 'admin', 'super_admin', 'owner', 'partner'].includes(role)) {
      const { count: todayCount } = await supabase
        .from('payment_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('cashier_id', userId)
        .eq('status', 'completed')
        .gte('created_at', today.toISOString());

      const { data: todayPayments } = await supabase
        .from('payment_transactions')
        .select('final_amount')
        .eq('cashier_id', userId)
        .eq('status', 'completed')
        .gte('created_at', today.toISOString());

      const { count: weekCount } = await supabase
        .from('payment_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('cashier_id', userId)
        .eq('status', 'completed')
        .gte('created_at', weekStart.toISOString());

      const { data: weekPayments } = await supabase
        .from('payment_transactions')
        .select('final_amount')
        .eq('cashier_id', userId)
        .eq('status', 'completed')
        .gte('created_at', weekStart.toISOString());

      setWorkStats({
        todayCount: todayCount || 0,
        todayValue: (todayPayments || []).reduce((sum, row) => sum + (row.final_amount || 0), 0),
        weekCount: weekCount || 0,
        weekValue: (weekPayments || []).reduce((sum, row) => sum + (row.final_amount || 0), 0),
      });
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile) return;

    const cleanPhone = form.phone.replace(/\D/g, '');
    if (cleanPhone && cleanPhone.length < 10) {
      setSaveError('Please enter a valid phone number');
      return;
    }

    setSaving(true);
    setSaveError('');
    setSaveMessage('');

    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name.trim(),
        phone: cleanPhone || null,
        email: form.email.trim() || null,
      })
      .eq('id', profile.id)
      .select()
      .single();

    setSaving(false);

    if (error) {
      setSaveError(error.message || 'Failed to update profile');
      return;
    }

    setProfile(data);
    login({ ...user, ...data });
    setEditing(false);
    setSaveMessage('Profile updated successfully');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const openPinModal = (mode) => {
    setPinMode(mode);
    setPinStep(1);
    setOldPin('');
    setNewPin('');
    setConfirmPin('');
    setPinError('');
    setShowPinModal(true);
  };

  const handlePinDigit = (setter, current, digit) => {
    if (current.length < 4 && /^\d$/.test(digit)) {
      setter(current + digit);
    }
  };

  const handlePinBackspace = (setter, current) => {
    setter(current.slice(0, -1));
  };

  const handlePinStep1 = async () => {
    if (oldPin.length !== 4) {
      setPinError('Enter your current 4-digit PIN');
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('pin')
      .eq('id', profile.id)
      .single();
    if (!data?.pin || data.pin !== oldPin) {
      setPinError('Incorrect current PIN');
      return;
    }
    setPinError('');
    setPinStep(2);
  };

  const handlePinStep2 = () => {
    if (newPin.length !== 4) {
      setPinError('Enter a 4-digit PIN');
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      setPinError('PIN must be 4 numbers only');
      return;
    }
    setPinError('');
    setPinStep(3);
  };

  const handleSkinSelect = (skinId) => {
    if (skinId === activeTheme || themeSaving) return;
    setPendingSkinId(skinId);
  };

  const handleConfirmSkinChange = async () => {
    if (!pendingSkinId) return;
    const skinId = pendingSkinId;
    setPendingSkinId(null);
    const result = await switchTheme(skinId, user?.phone);
    if (result?.success) {
      const applied = APP_THEME_OPTIONS.find((o) => o.id === skinId);
      setSaveMessage(`Application skin changed to ${applied?.config?.name || skinId}`);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handlePinStep3 = async () => {
    if (confirmPin !== newPin) {
      setPinError('PINs do not match');
      return;
    }
    setPinSaving(true);
    setPinError('');
    const { error } = await supabase
      .from('profiles')
      .update({ pin: newPin })
      .eq('id', profile.id);
    setPinSaving(false);
    if (error) {
      setPinError('Failed to update PIN. Try again.');
      return;
    }
    const updated = { ...profile, pin: newPin };
    setProfile(updated);
    login({ ...user, ...updated });
    setShowPinModal(false);
    setSaveMessage(pinMode === 'set' ? 'PIN set successfully' : 'PIN changed successfully');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 bg-primary text-primary">
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading profile...</div>
        </div>
      </div>
    );
  }

  const displayName = profile?.full_name || profile?.email || 'Staff Member';
  const initials = displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const role = profile?.role || user?.role;
  const isSuperAdmin = role === 'super_admin';
  const canManageMysteryGift = role === 'owner' || role === 'super_admin';
  const isTechnician = role === 'technician';
  const showWorkStats = isTechnician || ['cashier', 'admin', 'super_admin', 'owner', 'partner'].includes(role);
  const todayLabel = isTechnician ? 'Services completed' : 'Transactions processed';
  const weekLabel = isTechnician ? 'Services this week' : 'Transactions this week';
  const valueLabel = isTechnician ? 'Service value' : 'Revenue processed';
  const pendingSkin = pendingSkinId
    ? APP_THEME_OPTIONS.find((o) => o.id === pendingSkinId)
    : null;
  const currentSkin = APP_THEME_OPTIONS.find((o) => o.id === activeTheme);

  return (
    <div className="min-h-screen w-full bg-primary text-primary transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
      <Sidebar />
      <style>{`.settings-page select, .settings-page option { background: var(--input-bg); color: var(--text-primary); }`}</style>
      <div className="settings-page max-w-3xl mx-auto px-4 sm:px-6 py-8 mobile-page">
        <div className="mb-8">
          <h1 className="font-heading text-3xl text-gold mb-2">Profile Settings</h1>
          <p className="text-secondary">Manage your account details and security</p>
        </div>

        {saveMessage && (
          <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-green-300 text-sm">
            {saveMessage}
          </div>
        )}
        {saveError && !editing && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 text-sm">
            {saveError}
          </div>
        )}

        <div className="rounded-2xl border border-card bg-card p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-light">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gold/20 rounded-full flex items-center justify-center shrink-0">
                <span className="text-gold font-heading text-2xl">{initials || '??'}</span>
              </div>
              <div>
                <h2 className="text-primary font-heading text-xl">{displayName}</h2>
                <p className="text-secondary text-sm mt-1">{formatPhone(profile?.phone)}</p>
                <span className={clsx(
                  "inline-flex mt-2 px-3 py-1 text-xs border rounded-full",
                  roleColors[role] || 'bg-secondary text-secondary border-light'
                )}>
                  {roleLabels[role] || role}
                </span>
              </div>
            </div>
            {!editing && (
              <button
                onClick={() => { setEditing(true); setSaveError(''); }}
                className="px-4 py-2 border border-gold/30 text-gold rounded-xl hover:bg-gold/10 transition-colors text-sm font-heading"
              >
                Edit Profile
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div>
                <label className="text-secondary text-xs uppercase tracking-wider block mb-2">Full Name</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full px-4 py-3 bg-input border border-input text-primary rounded-lg focus:border-gold focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-secondary text-xs uppercase tracking-wider block mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-input border border-input text-primary rounded-lg focus:border-gold focus:outline-none"
                  placeholder="(555) 123-4567"
                />
                <p className="text-muted text-xs mt-1">Used for login and account identification</p>
              </div>
              <div>
                <label className="text-secondary text-xs uppercase tracking-wider block mb-2">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 bg-input border border-input text-primary rounded-lg focus:border-gold focus:outline-none"
                  placeholder="name@example.com"
                />
              </div>
              {saveError && <p className="text-red-400 text-sm">{saveError}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setSaveError('');
                    setForm({
                      full_name: profile?.full_name || '',
                      phone: profile?.phone || '',
                      email: profile?.email || '',
                    });
                  }}
                  className="flex-1 py-3 border border-input text-secondary rounded-xl hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-gold text-charcoal font-heading rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-light bg-secondary p-4">
                <div className="text-secondary text-xs uppercase tracking-wider mb-2">Full Name</div>
                <div className="text-primary">{profile?.full_name || 'Not set'}</div>
              </div>
              <div className="rounded-xl border border-light bg-secondary p-4">
                <div className="text-secondary text-xs uppercase tracking-wider mb-2">Phone</div>
                <div className="text-primary">{formatPhone(profile?.phone)}</div>
              </div>
              <div className="rounded-xl border border-light bg-secondary p-4">
                <div className="text-secondary text-xs uppercase tracking-wider mb-2">Email</div>
                <div className="text-primary">{profile?.email || 'Not set'}</div>
              </div>
              <div className="rounded-xl border border-light bg-secondary p-4">
                <div className="text-secondary text-xs uppercase tracking-wider mb-2">Member Since</div>
                <div className="text-primary">{formatDate(profile?.created_at)}</div>
              </div>
            </div>
          )}
        </div>

        {showWorkStats && !editing && (
          <div className="rounded-2xl border border-card bg-card p-6 mb-6">
            <h3 className="font-heading text-xl text-gold mb-4">My Activity</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                className="rounded-xl p-4"
                style={{
                  backgroundColor: themeConfig.backgroundSecondary,
                  border: `1px solid ${themeConfig.borderColor}`,
                  borderRadius: themeConfig.cardStyle.borderRadius,
                }}
              >
                <div className="text-sm mb-2" style={{ color: themeConfig.textPrimary }}>Today</div>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-2xl font-heading text-primary">{workStats.todayCount}</div>
                    <div className="text-xs text-secondary">{todayLabel}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-heading text-gold-strong">${workStats.todayValue.toFixed(0)}</div>
                    <div className="text-xs text-secondary">{valueLabel}</div>
                  </div>
                </div>
              </div>
              <div
                className="rounded-xl p-4"
                style={{
                  backgroundColor: themeConfig.backgroundSecondary,
                  border: `1px solid ${themeConfig.borderColor}`,
                  borderRadius: themeConfig.cardStyle.borderRadius,
                }}
              >
                <div className="text-sm mb-2" style={{ color: themeConfig.textPrimary }}>This Week</div>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-2xl font-heading text-primary">{workStats.weekCount}</div>
                    <div className="text-xs text-secondary">{weekLabel}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-heading text-gold-strong">${workStats.weekValue.toFixed(0)}</div>
                    <div className="text-xs text-secondary">{valueLabel}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {canManageMysteryGift && (
          <MysteryGiftPanel callerPhone={user?.phone} role={role} />
        )}

        {isSuperAdmin && (
          <div className="rounded-2xl border border-card bg-card p-6 mb-6">
            <div className="mb-5">
              <h3 className="font-heading text-xl text-gold">Application Skin</h3>
              <p className="text-secondary text-sm mt-1">
                Choose the global brand identity (fonts, logos, landing). Visitors can still switch dark or light mode.
              </p>
              {themeError ? (
                <p className="text-red-400 text-sm mt-2">{themeError}</p>
              ) : null}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {APP_THEME_OPTIONS.map((option) => {
                const selected = activeTheme === option.id;
                const previewConfig = mergeSkinWithPalette(option.config, colorScheme);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSkinSelect(option.id)}
                    disabled={themeSaving || selected}
                    aria-pressed={selected}
                    className={clsx(
                      'group relative text-left rounded-2xl border p-5 transition-all duration-300',
                      selected
                        ? 'border-gold/60 bg-gold/10 shadow-[0_0_24px_rgba(197,160,89,0.12)] ring-1 ring-gold/25'
                        : 'border-light bg-secondary hover:border-gold/35 hover:bg-gold/5',
                    )}
                  >
                    {selected && (
                      <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/15 px-2.5 py-0.5 text-[10px] font-heading uppercase tracking-widest text-gold">
                        Active
                      </span>
                    )}
                    <ThemePreviewSwatch config={previewConfig} />
                    <div className="font-heading text-lg text-primary">{option.config.name}</div>
                    <p className="text-muted text-xs mt-1 leading-relaxed">{option.description}</p>
                    <div
                      className={clsx(
                        'mt-4 flex items-center gap-2 text-xs font-heading uppercase tracking-wider transition-colors',
                        selected ? 'text-gold' : 'text-secondary group-hover:text-gold/80',
                      )}
                    >
                      <span
                        className={clsx(
                          'inline-flex h-4 w-4 items-center justify-center rounded-full border transition-colors',
                          selected ? 'border-gold bg-gold' : 'border-light bg-transparent',
                        )}
                      >
                        {selected && (
                          <svg className="h-2.5 w-2.5 text-charcoal" fill="currentColor" viewBox="0 0 12 12" aria-hidden>
                            <path d="M10.28 2.28a1 1 0 0 1 0 1.42l-5.5 5.5a1 1 0 0 1-1.42 0l-2.5-2.5a1 1 0 1 1 1.42-1.42L4.5 7.36l4.78-4.78a1 1 0 0 1 1.42 0Z" />
                          </svg>
                        )}
                      </span>
                      {selected ? 'Currently applied' : 'Apply skin'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isSuperAdmin && (
          <StuckCheckInsPanel callerPhone={user?.phone} />
        )}

        {isSuperAdmin && (
          <SessionTimeoutSettingsPanel callerPhone={user?.phone} />
        )}

        <NotificationPreferencesPanel
          userPhone={user?.phone}
          role={role}
          theme={theme}
        />

        <div className="rounded-2xl border border-card bg-card p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-lg text-primary">Login PIN</h3>
              <p className="text-secondary text-sm mt-1">
                {profile?.pin ? 'A 4-digit PIN is enabled for quick staff login' : 'Set a 4-digit PIN for faster login on shared devices'}
              </p>
              <p className="text-muted text-xs mt-2">
                Status: {profile?.pin ? 'Active' : 'Not configured'}
              </p>
            </div>
            <button
              onClick={() => openPinModal(profile?.pin ? 'change' : 'set')}
              className="shrink-0 flex items-center gap-2 bg-gold/10 border border-gold/30 text-gold px-4 py-2 rounded-lg hover:bg-gold/20 transition-colors text-sm font-heading"
            >
              {profile?.pin ? 'Change PIN' : 'Set PIN'}
            </button>
          </div>
        </div>
      </div>

      {pendingSkinId && pendingSkin && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setPendingSkinId(null)}
          >
            <div
              className="w-full max-w-md flex flex-col bg-card rounded-t-2xl sm:rounded-xl overflow-hidden mx-0 sm:mx-4 border border-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-labelledby="skin-confirm-title"
              aria-modal="true"
            >
              <div className="flex items-center justify-between gap-4 p-4 sm:p-6 border-b border-gold/10">
                <div>
                  <h3 id="skin-confirm-title" className="font-heading text-xl text-gold mb-0">
                    Change application skin?
                  </h3>
                  <p className="text-secondary text-sm mt-1">
                    This updates the global brand identity for all visitors.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingSkinId(null)}
                  className="text-secondary hover:text-primary text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="p-4 sm:p-6">
                <p className="text-secondary text-sm leading-relaxed">
                  Switch from{' '}
                  <span className="text-primary font-medium">{currentSkin?.config?.name || 'current skin'}</span>
                  {' '}to{' '}
                  <span className="text-gold font-medium">{pendingSkin.config.name}</span>?
                  Fonts, logos, and the public landing page will update site-wide.
                </p>
              </div>
              <div className="flex gap-3 p-4 sm:p-6 pt-0">
                <button
                  type="button"
                  onClick={() => setPendingSkinId(null)}
                  className="flex-1 py-3 rounded-xl border border-input text-primary hover:bg-secondary transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSkinChange}
                  disabled={themeSaving}
                  className="flex-1 py-3 rounded-xl bg-gold text-[#0B0B0C] font-heading text-sm hover:bg-gold/90 transition-colors disabled:opacity-50"
                >
                  {themeSaving ? 'Applying...' : 'Apply skin'}
                </button>
              </div>
            </div>
          </div>
      )}

      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowPinModal(false)}>
          <div className="w-full max-w-sm max-h-[90vh] flex flex-col bg-card rounded-t-2xl sm:rounded-xl overflow-hidden mx-0 sm:mx-4 border border-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 p-4 sm:p-6 border-b border-gold/10">
              <div>
                <h3 className="font-heading text-xl text-gold mb-0">
                  {pinMode === 'set' ? 'Set PIN' : 'Change PIN'}
                </h3>
                <p className="text-secondary text-sm mt-1">
                  {pinStep === 1 && 'Enter your current PIN'}
                  {pinStep === 2 && 'Enter a new 4-digit PIN'}
                  {pinStep === 3 && 'Confirm your new PIN'}
                </p>
              </div>
              <button
                onClick={() => setShowPinModal(false)}
                className="text-secondary hover:text-primary text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary"
              >
                ×
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <div className="flex justify-center gap-4 mb-4">
                {[1, 2, 3, 4].map((i) => {
                  const val = pinStep === 1 ? oldPin : pinStep === 2 ? newPin : confirmPin;
                  return (
                    <div
                      key={i}
                      className="w-14 h-14 rounded-xl bg-input border border-input flex items-center justify-center text-2xl font-heading"
                    >
                      {val[i - 1] ? '●' : ''}
                    </div>
                  );
                })}
              </div>

              {pinError && <p className="text-red-400 text-sm text-center mb-4">{pinError}</p>}

              <div className="grid grid-cols-3 gap-3 mb-5">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key, idx) => {
                  if (key === '') {
                    return <div key={idx} className="h-12" />;
                  }
                  if (key === '⌫') {
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (pinStep === 1) handlePinBackspace(setOldPin, oldPin);
                          else if (pinStep === 2) handlePinBackspace(setNewPin, newPin);
                          else handlePinBackspace(setConfirmPin, confirmPin);
                        }}
                        className="h-12 bg-input rounded-xl text-primary hover:bg-secondary transition-colors text-lg"
                      >
                        {key}
                      </button>
                    );
                  }
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (pinStep === 1) handlePinDigit(setOldPin, oldPin, key);
                        else if (pinStep === 2) handlePinDigit(setNewPin, newPin, key);
                        else handlePinDigit(setConfirmPin, confirmPin, key);
                      }}
                      className="h-12 bg-input rounded-xl text-primary hover:bg-secondary transition-colors text-xl font-heading"
                    >
                      {key}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowPinModal(false); setPinStep(1); }}
                  className="flex-1 py-3 rounded-xl border border-input text-primary hover:bg-secondary transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (pinStep === 1) handlePinStep1();
                    else if (pinStep === 2) handlePinStep2();
                    else handlePinStep3();
                  }}
                  disabled={pinSaving}
                  className="flex-1 py-3 rounded-xl bg-gold text-[#0B0B0C] font-heading text-sm hover:bg-gold/90 transition-colors disabled:opacity-50"
                >
                  {pinSaving ? 'Saving...' : pinStep === 3 ? 'Confirm' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
