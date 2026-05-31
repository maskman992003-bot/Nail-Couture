import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getHomePath } from '../utils/routes';
import { isRefreshmentAvailable } from '../services/inventoryService';
import { useAvailableRefreshments } from '../hooks/useAvailableRefreshments';
import RefreshmentSelect from './RefreshmentSelect';
import Sidebar from './Sidebar';

export default function CustomerProfile() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const { refreshments, loading: refreshmentsLoading } = useAvailableRefreshments();
  const [showPinForm, setShowPinForm] = useState(false);
  const [pinMode, setPinMode] = useState('set');
  const [pinForm, setPinForm] = useState({ current_pin: '', new_pin: '', confirm_pin: '' });
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.is_staff) { navigate(getHomePath(user.role)); return; }
    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    const userId = user?.id;
    if (!userId) { navigate('/login'); return; }
    
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
    } else if (data) {
      setProfile(data);
      setForm({
        full_name: data.full_name || '',
        email: data.email || '',
        refreshment_pref: data.refreshment_pref || '',
        nail_goal: data.nail_goal || '',
      });
      setPinMode(data.pin_code ? 'change' : 'set');
    }
    setLoading(false);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);

    const refreshmentPref = isRefreshmentAvailable(form.refreshment_pref, refreshments)
      ? (form.refreshment_pref || null)
      : null;
    
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name,
        email: form.email.trim() || null,
        refreshment_pref: refreshmentPref,
        nail_goal: form.nail_goal || null,
      })
      .eq('id', profile.id)
      .select()
      .single();

    if (!error && data) {
      setProfile(data);
      if (user) {
        login({ ...user, ...data });
      }
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
          .select('pin_code')
          .eq('id', profile.id)
          .single();
        if (verifyErr || verify?.pin_code !== pinForm.current_pin) {
          setPinError('Incorrect current PIN code');
          setPinLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({ pin_code: pinForm.new_pin })
        .eq('id', profile.id);

      if (error) throw error;

      setPinSuccess('PIN updated successfully!');
      setPinForm({ current_pin: '', new_pin: '', confirm_pin: '' });
      setPinMode('change');
      setTimeout(() => setShowPinForm(false), 1500);
    } catch (err) {
      setPinError('Failed to save PIN code');
    } finally {
      setPinLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse tracking-widest text-sm">LOADING ACCOUNT PROFILE...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
      <Sidebar />
      <style>{`.profile-section select, .profile-section option { background: #1a1a1a; color: #fff; }`}</style>
      
      <div className="profile-section p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 max-w-3xl mx-auto">
        <div className="border-b border-gold/10 pb-6 mb-8">
          <h1 className="font-heading text-3xl text-gold tracking-wide">My Profile</h1>
          <p className="text-xs text-offwhite/40 mt-1">Manage personal luxury configurations and verification PIN codes</p>
        </div>

        {profile && (
          <div className="space-y-6">
            <div className="bg-offwhite/5 border border-white/5 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center font-heading text-gold text-xl uppercase">
                    {(profile.full_name || '??').split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h2 className="text-offwhite font-medium text-lg">{profile.full_name}</h2>
                    <p className="text-offwhite/40 text-xs mt-0.5">{profile.phone}</p>
                  </div>
                </div>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 border border-gold/30 text-gold rounded-xl hover:bg-gold/10 transition-colors text-xs font-medium"
                  >
                    Edit Profile Details
                  </button>
                )}
              </div>

              {editing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-5">
                  <div>
                    <label className="text-offwhite/50 text-xs uppercase tracking-wider block mb-2">Full Name</label>
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={e => setForm({ ...form, full_name: e.target.value })}
                      className="w-full p-3 bg-offwhite/10 border border-offwhite/20 text-offwhite focus:border-gold focus:outline-none rounded-lg text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-offwhite/50 text-xs uppercase tracking-wider block mb-2">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      className="w-full p-3 bg-offwhite/10 border border-offwhite/20 text-offwhite focus:border-gold focus:outline-none rounded-lg text-sm"
                      placeholder="name@example.com"
                    />
                  </div>

                  <RefreshmentSelect
                    label="Complementary Drink"
                    value={form.refreshment_pref}
                    onChange={e => setForm({ ...form, refreshment_pref: e.target.value })}
                    refreshments={refreshments}
                    loading={refreshmentsLoading}
                    showUnavailableNote
                    emptyLabel="None / No Preference"
                    className="p-3 text-sm"
                  />

                  <div>
                    <label className="text-offwhite/50 text-xs uppercase tracking-wider block mb-2">Nail Philosophy Goal</label>
                    <select
                      value={form.nail_goal}
                      onChange={e => setForm({ ...form, nail_goal: e.target.value })}
                      className="w-full p-3 bg-offwhite/10 border border-offwhite/20 text-offwhite focus:border-gold focus:outline-none rounded-lg text-sm"
                    >
                      <option value="">Unset</option>
                      <option value="Healthy Natural Nails">Healthy Natural Nails</option>
                      <option value="Long Extensions">Long Extensions</option>
                      <option value="Intricate Art">Intricate Art</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setEditing(false); setForm({ full_name: profile.full_name, email: profile.email || '', refreshment_pref: profile.refreshment_pref || '', nail_goal: profile.nail_goal || '' }); }}
                      className="flex-1 py-3 bg-charcoal border border-white/10 text-offwhite text-sm rounded-xl hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-3 bg-gold text-charcoal text-sm rounded-xl hover:bg-gold/90 transition-colors font-medium shadow-lg shadow-gold/10"
                    >
                      {saving ? 'Saving...' : 'Save Preferences'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                      <span className="text-[10px] uppercase tracking-wider text-offwhite/30 block mb-1">Full name</span>
                      <span className="text-sm text-offwhite font-medium">{profile.full_name || 'Not set'}</span>
                    </div>
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                      <span className="text-[10px] uppercase tracking-wider text-offwhite/30 block mb-1">Phone</span>
                      <span className="text-sm text-offwhite font-medium">{profile.phone || 'Not set'}</span>
                    </div>
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                      <span className="text-[10px] uppercase tracking-wider text-offwhite/30 block mb-1">Email</span>
                      <span className="text-sm text-offwhite font-medium">{profile.email || 'Not set'}</span>
                    </div>
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                      <span className="text-[10px] uppercase tracking-wider text-offwhite/30 block mb-1">Member since</span>
                      <span className="text-sm text-offwhite font-medium">
                        {profile.created_at
                          ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                          : 'Unknown'}
                      </span>
                    </div>
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                      <span className="text-[10px] uppercase tracking-wider text-offwhite/30 block mb-1">Refreshment preference</span>
                      <span className="text-sm text-offwhite font-medium">{profile.refreshment_pref || 'None'}</span>
                    </div>
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                      <span className="text-[10px] uppercase tracking-wider text-offwhite/30 block mb-1">Nail profile journey</span>
                      <span className="text-sm text-gold font-heading">{profile.nail_goal || 'Not specified'}</span>
                    </div>
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                      <span className="text-[10px] uppercase tracking-wider text-offwhite/30 block mb-1">Loyalty tier</span>
                      <span className="text-sm text-gold font-heading">{profile.tier || 'Silver'}</span>
                    </div>
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                      <span className="text-[10px] uppercase tracking-wider text-offwhite/30 block mb-1">Loyalty points</span>
                      <span className="text-sm text-offwhite font-medium">{profile.loyalty_points ?? 0}</span>
                    </div>
                    {profile.referral_code && (
                      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl sm:col-span-2">
                        <span className="text-[10px] uppercase tracking-wider text-offwhite/30 block mb-1">Referral code</span>
                        <span className="text-sm text-gold font-heading tracking-widest">{profile.referral_code}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-offwhite/5 border border-white/5 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-offwhite font-medium text-base flex items-center gap-2">
                  <span>🔒</span> Kiosk Self-Service PIN
                </h3>
                <p className="text-xs text-offwhite/40 mt-1 max-w-md">
                  Secure your self-service interactions at salon kiosks. Use a 4-digit numeric code to check in without hassle.
                </p>
              </div>
              <button
                onClick={() => { setShowPinForm(true); setPinError(''); setPinSuccess(''); }}
                className="px-5 py-2.5 bg-white/5 border border-white/10 text-offwhite rounded-xl hover:bg-white/10 transition-colors text-xs font-medium shrink-0"
              >
                {profile.pin_code ? 'Update Security PIN' : 'Setup Kiosk PIN'}
              </button>
            </div>
          </div>
        )}
      </div>

      {showPinForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowPinForm(false)}>
          <div className="w-full max-w-md h-[85vh] sm:h-auto sm:max-h-[90vh] flex flex-col bg-[#1a1a1a] rounded-t-2xl sm:rounded-xl overflow-hidden mx-0 sm:mx-4 border border-gold/10 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 p-4 sm:p-6 border-b border-gold/10 shrink-0">
              <div>
                <h2 className="font-heading text-xl text-gold mb-0">{pinMode === 'change' ? 'Change Kiosk PIN' : 'Set Kiosk PIN'}</h2>
                <p className="text-offwhite/40 text-xs mt-1">Provide a numeric 4-digit passcode for quick logins</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPinForm(false)}
                className="text-offwhite/40 hover:text-offwhite text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handlePinSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {pinMode === 'change' && (
                <div>
                  <label className="text-offwhite/50 text-xs uppercase tracking-wider block mb-2">Current PIN Code</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={pinForm.current_pin}
                    onChange={e => setPinForm({ ...pinForm, current_pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    placeholder="••••"
                    className="w-full p-3 text-offwhite bg-offwhite/10 border border-offwhite/20 rounded-lg focus:border-gold focus:outline-none tracking-widest text-center text-xl"
                  />
                </div>
              )}

              <div>
                <label className="text-offwhite/50 text-xs uppercase tracking-wider block mb-2">New 4-Digit PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pinForm.new_pin}
                  onChange={e => setPinForm({ ...pinForm, new_pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  placeholder="Enter new PIN"
                  className="w-full p-3 text-offwhite bg-offwhite/10 border border-offwhite/20 rounded-lg focus:border-gold focus:outline-none tracking-widest text-center text-xl"
                />
              </div>

              <div>
                <label className="text-offwhite/50 text-xs uppercase tracking-wider block mb-2">Confirm PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pinForm.confirm_pin}
                  onChange={e => setPinForm({ ...pinForm, confirm_pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  placeholder="Confirm new PIN"
                  className="w-full p-3 text-offwhite bg-offwhite/10 border border-offwhite/20 rounded-lg focus:border-gold focus:outline-none tracking-widest text-center text-xl"
                />
              </div>

              {pinError && <p className="text-red-400 text-sm text-center">{pinError}</p>}
              {pinSuccess && <p className="text-green-400 text-sm text-center">{pinSuccess}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPinForm(false)} className="flex-1 py-3 bg-[#0B0B0C] text-offwhite text-sm rounded-xl hover:bg-white/10 transition-colors">Cancel</button>
                <button type="submit" disabled={pinLoading} className="flex-1 py-3 bg-gold text-charcoal rounded-xl hover:bg-gold/90 transition-colors font-medium text-sm disabled:opacity-50">
                  {pinLoading ? 'Saving...' : 'Save PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}