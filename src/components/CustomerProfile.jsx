import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';

export default function CustomerProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [refreshments, setRefreshments] = useState([]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.is_staff) { navigate(`/${user.role}`); return; }
    fetchProfile();
    fetchRefreshments();
  }, [user, navigate]);

  const fetchProfile = async () => {
    const currentUser = localStorage.getItem('salon_user_data');
    const userId = currentUser ? JSON.parse(currentUser).id : null;
    if (!userId) { navigate('/login'); return; }

    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) {
        setProfile(data);
        setForm({
          full_name: data.full_name || '',
          email: data.email || '',
          phone_number: data.phone_number || '',
          nail_goal: data.nail_goal || '',
          refreshment_pref: data.refreshment_pref || '',
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRefreshments = async () => {
    try {
      const { data } = await supabase
        .from('stock')
        .select('name')
        .eq('category', 'refreshment')
        .gt('quantity', 0)
        .order('name');
      setRefreshments(data || []);
    } catch (err) {
      console.error('Error fetching refreshments:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { data } = await supabase.from('profiles').update({
      full_name: form.full_name,
      email: form.email,
      phone_number: form.phone_number.replace(/\D/g, ''),
      nail_goal: form.nail_goal || null,
      refreshment_pref: form.refreshment_pref || null,
    }).eq('id', profile.id).select();
    if (data && data[0]) setProfile(data[0]);
    setEditing(false);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen" style={{ backgroundColor: '#0a0a0a' }}>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gold animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-screen" style={{ backgroundColor: '#0a0a0a' }}>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-offwhite/60 mb-4">Unable to load profile</p>
            <Link to="/login" className="px-4 py-2 bg-gold text-charcoal rounded-lg">Return to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 pb-24 lg:pb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link to="/portal" className="text-offwhite/40 hover:text-gold text-sm">Home</Link>
              <span className="text-offwhite/30">/</span>
              <span className="text-gold font-heading text-sm">My Profile</span>
            </div>
            <h1 className="font-heading text-4xl text-gold">My Profile</h1>
            <p className="text-offwhite/50 text-sm mt-1">Manage your personal account information</p>
          </div>

          <div className="rounded-2xl p-8 border-2" style={{ background: 'linear-gradient(135deg, rgba(197, 160, 89, 0.05) 0%, rgba(26, 26, 26, 1) 100%)', borderColor: 'rgba(197, 160, 89, 0.3)' }}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c5a059, #f0d78c)', boxShadow: '0 0 20px rgba(197, 160, 89, 0.3)' }}>
                  <span className="text-charcoal font-heading text-xl font-bold">{profile.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</span>
                </div>
                <div>
                  <h2 className="font-heading text-2xl text-offwhite">{profile.full_name}</h2>
                  <p className="text-offwhite/50 text-sm">{profile.email}</p>
                </div>
              </div>
              {!editing && (
                <button onClick={() => setEditing(true)} className="px-5 py-2 border rounded-lg text-sm transition-colors hover:border-gold/50 whitespace-nowrap" style={{ borderColor: 'rgba(197, 160, 89, 0.3)', color: '#c5a059' }}>
                  Edit Profile
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-2">Full Name</div>
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      className="w-full p-4 text-offwhite border rounded-xl focus:border-gold focus:outline-none bg-transparent"
                      style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                    />
                  </div>
                  <div>
                    <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-2">Email</div>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full p-4 text-offwhite border rounded-xl focus:border-gold focus:outline-none bg-transparent"
                      style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                    />
                  </div>
                  <div>
                    <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-2">Phone Number</div>
                    <input
                      type="tel"
                      value={form.phone_number}
                      onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                      className="w-full p-4 text-offwhite border rounded-xl focus:border-gold focus:outline-none bg-transparent"
                      style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-2">Nail Goal</div>
                  <input
                    type="text"
                    value={form.nail_goal}
                    onChange={(e) => setForm({ ...form, nail_goal: e.target.value })}
                    placeholder="e.g. Long stiletto, natural gel, nail art"
                    className="w-full p-4 text-offwhite border rounded-xl focus:border-gold focus:outline-none bg-transparent"
                    style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                  />
                </div>
                <div>
                  <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-2">Refreshment Preference</div>
                  {refreshments.length > 0 ? (
                    <select
                      value={form.refreshment_pref}
                      onChange={(e) => setForm({ ...form, refreshment_pref: e.target.value })}
                      className="w-full p-3 text-offwhite border rounded-lg focus:border-gold focus:outline-none appearance-none cursor-pointer"
                      style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' }}
                    >
                      <option value="">None</option>
                      {refreshments.map((item) => (
                        <option key={item.name} value={item.name} style={{ backgroundColor: '#111' }}>{item.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="py-4 text-offwhite/30 text-sm italic">No refreshments available at this time</div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-gold text-charcoal font-heading text-sm rounded-xl hover:bg-gold/90 disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button onClick={() => {
                    setEditing(false);
                    setForm({
                      full_name: profile.full_name,
                      email: profile.email,
                      phone_number: profile.phone_number,
                      nail_goal: profile.nail_goal,
                      refreshment_pref: profile.refreshment_pref,
                    });
                  }} className="px-6 py-3 border text-offwhite/60 text-sm rounded-xl hover:border-gold/30" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-2">Full Name</div>
                    <div className="text-offwhite font-heading text-lg">{profile.full_name || 'Not set'}</div>
                  </div>
                  <div>
                    <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-2">Email</div>
                    <div className="text-offwhite font-heading text-lg">{profile.email || 'Not set'}</div>
                  </div>
                  <div>
                    <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-2">Phone Number</div>
                    <div className="text-offwhite font-heading text-lg">{profile.phone_number || 'Not set'}</div>
                  </div>
                  <div>
                    <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-2">Loyalty Points</div>
                    <div className="text-gold font-heading text-2xl">{profile.loyalty_points || 0}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <div>
                    <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-2">Nail Goal</div>
                    <div className="text-offwhite font-heading text-base">{profile.nail_goal || 'Not set'}</div>
                  </div>
                  <div>
                    <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-2">Refreshment Preference</div>
                    <div className="text-offwhite font-heading text-base">{profile.refreshment_pref || 'Not set'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {profile.referral_code && (
            <div className="rounded-2xl p-6 border text-center" style={{ borderColor: 'rgba(197, 160, 89, 0.15)', backgroundColor: '#111' }}>
              <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-2">Your Referral Code</div>
              <div className="font-heading text-2xl text-gold tracking-widest">{profile.referral_code}</div>
              <div className="text-offwhite/40 text-sm mt-2">Share with friends to earn bonus loyalty points!</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}