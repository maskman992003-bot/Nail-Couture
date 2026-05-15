import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from './Navbar';
import UniversalNav from './UniversalNav';

const statusColors = {
  waiting: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  assigned_pending: 'bg-blue-100 text-blue-800 border-blue-300',
  serving: 'bg-green-100 text-green-800 border-green-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
};

const statusLabels = {
  waiting: 'Waiting',
  assigned_pending: 'Assigned',
  serving: 'In Chair',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const tierBenefits = {
  Silver: '5% off all services',
  Gold: '10% off + free refreshment',
  Platinum: '15% off + priority booking + free refreshment',
  Diamond: '20% off + VIP priority + free premium service',
};

const getTierInfo = (points) => {
  if (points >= 1000) {
    return { name: 'Diamond', color: 'text-cyan-400', bg: 'from-cyan-200/30 to-blue-200/30', border: 'border-cyan-400', benefit: tierBenefits.Diamond, nextTier: null, nextThreshold: null, progress: 100 };
  }
  if (points >= 500) {
    return { name: 'Platinum', color: 'text-gray-300', bg: 'from-gray-200/30 to-gray-300/30', border: 'border-gray-400', benefit: tierBenefits.Platinum, nextTier: 'Diamond', nextThreshold: 1000, progress: ((points - 500) / 500) * 100 };
  }
  if (points >= 100) {
    return { name: 'Gold', color: 'text-gold', bg: 'from-gold/20 to-amber-100/30', border: 'border-gold', benefit: tierBenefits.Gold, nextTier: 'Platinum', nextThreshold: 500, progress: ((points - 100) / 400) * 100 };
  }
  return { name: 'Silver', color: 'text-gray-400', bg: 'from-gray-100/30 to-gray-200/30', border: 'border-gray-400', benefit: tierBenefits.Silver, nextTier: 'Gold', nextThreshold: 100, progress: (points / 100) * 100 };
};

export default function ClientPortal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('appointments');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [redeeming, setRedeeming] = useState(null);
  const [confirmationCode, setConfirmationCode] = useState(null);
  const { user, logout, loading: authLoading } = useAuth();

  const fetchUserData = useCallback(async () => {
    const currentUser = localStorage.getItem('salon_user_data');
    const userId = currentUser ? JSON.parse(currentUser).id : null;
    if (!userId) { navigate('/login'); return; }

    try {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (profileData) {
        setProfile(profileData);
        if (!profileData.referral_code) {
          const cleanName = (profileData.full_name || 'USER').replace(/\s+/g, '').toUpperCase().slice(0, 4);
          const random = Math.random().toString(36).substring(2, 6).toUpperCase();
          const newCode = `${cleanName}${random}`;
          await supabase.from('profiles').update({ referral_code: newCode }).eq('id', profileData.id);
          setProfile({ ...profileData, referral_code: newCode });
          localStorage.setItem('salon_user_data', JSON.stringify({ ...profileData, referral_code: newCode }));
        }
      }
      const { data: appointmentsData } = await supabase.from('appointments').select('*, services(name, price, duration_minutes)').eq('profile_id', userId).order('check_in_time', { ascending: false });
      setAppointments(appointmentsData || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    fetchUserData();
  }, [user, authLoading, navigate, fetchUserData]);

  const handleNavigate = (page) => { if (page === 'home') navigate('/'); };
  const handleLogout = () => { logout(); navigate('/'); };

  const startEditProfile = () => {
    setEditForm({ full_name: profile.full_name || '', email: profile.email || '', phone_number: profile.phone_number || '', nail_goal: profile.nail_goal || '', refreshment_pref: profile.refreshment_pref || '' });
    setEditingProfile(true);
  };

  const cancelEditProfile = () => { setEditingProfile(false); setEditForm({}); };

  const saveProfile = async () => {
    setSaving(true);
    const { data } = await supabase.from('profiles').update({ full_name: editForm.full_name, email: editForm.email, phone_number: editForm.phone_number.replace(/\D/g, ''), nail_goal: editForm.nail_goal || null, refreshment_pref: editForm.refreshment_pref || null }).eq('id', profile.id).select();
    if (data && data[0]) { setProfile(data[0]); localStorage.setItem('salon_user_data', JSON.stringify(data[0])); }
    setEditingProfile(false);
    setSaving(false);
  };

  const generateConfirmationCode = () => Math.random().toString(36).substring(2, 8).toUpperCase() + Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleRedeem = async (pointsCost, rewardName) => {
    if ((profile.loyalty_points || 0) < pointsCost) return;
    setRedeeming(pointsCost);
    const newPoints = (profile.loyalty_points || 0) - pointsCost;
    const { error } = await supabase.from('profiles').update({ loyalty_points: newPoints }).eq('id', profile.id);
    if (!error) {
      const code = generateConfirmationCode();
      setConfirmationCode({ code, reward: rewardName, points: pointsCost });
      setProfile({ ...profile, loyalty_points: newPoints });
      localStorage.setItem('salon_user_data', JSON.stringify({ ...profile, loyalty_points: newPoints }));
    }
    setRedeeming(null);
  };

  const closeConfirmation = () => setConfirmationCode(null);

  if (authLoading || loading) {
    return <div className="min-h-screen flex" style={{ backgroundColor: '#0a0a0a' }}><UniversalNav /><div className="flex-1 flex items-center justify-center"><div className="text-gold animate-pulse">Loading...</div></div></div>;
  }

  if (!profile) {
    return <div className="min-h-screen flex" style={{ backgroundColor: '#0a0a0a' }}><UniversalNav /><div className="flex-1 flex items-center justify-center"><div className="text-center"><p className="text-offwhite/60 mb-4">Unable to load profile</p><button onClick={handleLogout} className="px-4 py-2 bg-gold text-charcoal">Return to Login</button></div></div></div>;
  }

  const initials = profile.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '??';
  const tabs = [{ id: 'appointments', label: 'Appointments', icon: '📅' }, { id: 'profile', label: 'Profile', icon: '👤' }, { id: 'loyalty', label: 'Rewards', icon: '⭐' }];
  const currentAppointment = appointments.find(a => ['waiting', 'assigned_pending', 'serving'].includes(a.status));
  const upcomingAppointments = appointments.filter(a => a.status === 'waiting');
  const pastAppointments = appointments.filter(a => ['completed', 'cancelled'].includes(a.status));

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0a0a0a' }}>
      <UniversalNav />
      <div className="flex-1 overflow-x-hidden">
        <Navbar currentPage="portal" onNavigate={handleNavigate} />
        <div className="max-w-7xl mx-auto px-6 py-8 pb-24 lg:pb-8 flex-1">
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="lg:w-64 flex-shrink-0 hidden lg:block">
              <div className="bg-offwhite border border-charcoal/10 p-6 mb-6">
                <div className="text-center mb-4">
                  <div className="w-20 h-20 bg-gold rounded-full flex items-center justify-center mx-auto mb-3"><span className="text-charcoal font-heading text-2xl">{initials}</span></div>
                  <h3 className="font-heading text-charcoal text-lg">Welcome, {profile.full_name}</h3>
                  <p className="text-charcoal/50 text-sm">{profile.email}</p>
                  {profile.nail_goal && <p className="text-gold/70 text-xs mt-1">Goal: {profile.nail_goal}</p>}
                </div>
              </div>
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${activeTab === tab.id ? 'bg-offwhite text-charcoal' : 'text-offwhite/60 hover:bg-offwhite/5 hover:text-offwhite'}`}>
                    <span>{tab.icon}</span><span className="text-sm tracking-wide">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </aside>

            <main className="flex-1">
              {activeTab === 'appointments' && (
                <div className="space-y-8">
                  {currentAppointment && (
                    <div className="bg-gradient-to-r from-gold/20 to-amber-10 border-2 border-gold p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="font-heading text-offwhite text-xl">Current Appointment</h2>
                        <span className={`px-3 py-1 text-sm border ${statusColors[currentAppointment.status]}`}>{statusLabels[currentAppointment.status]}</span>
                      </div>
                      <div className="text-offwhite font-medium text-lg">{currentAppointment.services?.name || 'Service'}</div>
                      {currentAppointment.services?.duration_minutes && <p className="text-offwhite/60 text-sm mt-1">Estimated time: ~{currentAppointment.services.duration_minutes} min</p>}
                      {currentAppointment.start_time && <p className="text-green-400 text-sm mt-2">Started at: {new Date(currentAppointment.start_time).toLocaleTimeString()}</p>}
                    </div>
                  )}
                  <div className="bg-white border border-charcoal/10 p-6" style={{ backgroundColor: '#1a1a1a' }}>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-heading text-offwhite text-xl">Upcoming Appointments</h2>
                      <Link to="/booking" className="text-gold text-sm hover:underline">Book New</Link>
                    </div>
                    {upcomingAppointments.length > 0 ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        {upcomingAppointments.map((booking) => (
                          <div key={booking.id} className="border border-offwhite/10 p-4" style={{ backgroundColor: '#252525' }}>
                            <div className="flex justify-between items-start mb-2">
                              <div><div className="text-sm text-offwhite/50">{new Date(booking.check_in_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div><div className="text-sm text-offwhite/50">{new Date(booking.check_in_time).toLocaleTimeString()}</div></div>
                              <span className={`px-2 py-1 text-xs border ${statusColors[booking.status]}`}>{statusLabels[booking.status]}</span>
                            </div>
                            <div className="text-offwhite font-medium">{booking.services?.name || 'Service'}</div>
                            {booking.services?.price && <div className="text-gold font-heading mt-2">${booking.services.price}</div>}
                          </div>
                        ))}
                      </div>
                    ) : (<p className="text-offwhite/50">No upcoming appointments. <Link to="/booking" className="text-gold hover:underline ml-1">Book one now</Link></p>)}
                  </div>
                  <div className="bg-white border border-charcoal/10 p-6" style={{ backgroundColor: '#1a1a1a' }}>
                    <h2 className="font-heading text-offwhite text-xl mb-4">Appointment History</h2>
                    {pastAppointments.length > 0 ? (
                      <div className="space-y-4">
                        {pastAppointments.map((booking) => (
                          <div key={booking.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border border-offwhite/10" style={{ backgroundColor: '#252525' }}>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-1 text-xs border ${statusColors[booking.status]}`}>{statusLabels[booking.status]}</span>
                                <span className="text-offwhite/50 text-sm">{new Date(booking.check_in_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </div>
                              <h4 className="font-heading text-offwhite">{booking.services?.name || 'Service'}</h4>
                              {booking.cancel_reason && <p className="text-red-400 text-sm mt-1">Cancelled: {booking.cancel_reason}</p>}
                              {booking.start_time && booking.end_time && <p className="text-offwhite/50 text-sm">{Math.round((new Date(booking.end_time) - new Date(booking.start_time)) / 60000)} min</p>}
                            </div>
                            <div className="text-right">{booking.services?.price && <div className="font-heading text-offwhite text-xl mb-2">${booking.services.price}</div>}</div>
                          </div>
                        ))}
                      </div>
                    ) : (<p className="text-offwhite/40">No past appointments</p>)}
                  </div>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="bg-white border border-charcoal/10 p-6" style={{ backgroundColor: '#1a1a1a' }}>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="font-heading text-offwhite text-xl">Profile Information</h2>
                      {!editingProfile && <button onClick={startEditProfile} className="px-4 py-2 bg-gold text-charcoal text-sm font-medium hover:bg-gold/90 transition-colors">Edit Profile</button>}
                    </div>
                    {editingProfile ? (
                      <div className="grid md:grid-cols-2 gap-6">
                        <div><label className="text-xs text-offwhite/50 uppercase tracking-wider block mb-2">Full Name</label><input type="text" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="w-full p-3 border border-offwhite/20 text-offwhite bg-transparent focus:border-gold focus:outline-none" /></div>
                        <div><label className="text-xs text-offwhite/50 uppercase tracking-wider block mb-2">Email</label><input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full p-3 border border-offwhite/20 text-offwhite bg-transparent focus:border-gold focus:outline-none" /></div>
                        <div><label className="text-xs text-offwhite/50 uppercase tracking-wider block mb-2">Phone</label><input type="tel" value={editForm.phone_number} onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })} className="w-full p-3 border border-offwhite/20 text-offwhite bg-transparent focus:border-gold focus:outline-none" /></div>
                        <div><label className="text-xs text-offwhite/50 uppercase tracking-wider block mb-2">Nail Goal</label><select value={editForm.nail_goal} onChange={(e) => setEditForm({ ...editForm, nail_goal: e.target.value })} className="w-full p-3 border border-offwhite/20 text-offwhite bg-transparent focus:border-gold focus:outline-none"><option value="">Select a goal</option><option value="Healthy Natural Nails">Healthy Natural Nails</option><option value="Long Extensions">Long Extensions</option><option value="Intricate Art">Intricate Art</option><option value="Gel Polish">Gel Polish</option><option value="Acrylic Nails">Acrylic Nails</option></select></div>
                        <div className="md:col-span-2 flex gap-3 mt-4">
                          <button onClick={saveProfile} disabled={saving} className="px-6 py-3 bg-gold text-charcoal font-medium hover:bg-gold/90 transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
                          <button onClick={cancelEditProfile} className="px-6 py-3 border border-offwhite/20 text-offwhite/60 hover:text-offwhite transition-colors">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-6">
                        <div><label className="text-xs text-offwhite/50 uppercase tracking-wider block mb-2">Full Name</label><p className="text-offwhite">{profile.full_name || 'Not set'}</p></div>
                        <div><label className="text-xs text-offwhite/50 uppercase tracking-wider block mb-2">Email</label><p className="text-offwhite">{profile.email || 'Not set'}</p></div>
                        <div><label className="text-xs text-offwhite/50 uppercase tracking-wider block mb-2">Phone</label><p className="text-offwhite">{profile.phone_number || 'Not set'}</p></div>
                        <div><label className="text-xs text-offwhite/50 uppercase tracking-wider block mb-2">Nail Goal</label><p className="text-offwhite">{profile.nail_goal || 'Not set'}</p></div>
                        {profile.refreshment_pref && <div><label className="text-xs text-offwhite/50 uppercase tracking-wider block mb-2">Refreshment Preference</label><p className="text-offwhite">{profile.refreshment_pref}</p></div>}
                      </div>
                    )}
                  </div>
                  <div className="bg-charcoal/20 border border-offwhite/10 p-6"><div className="flex items-center justify-between"><div><h3 className="font-heading text-offwhite text-lg mb-1">Total Visits</h3><p className="text-offwhite/50 text-sm">Your appointment count</p></div><div className="text-4xl font-heading text-gold">{pastAppointments.length}</div></div></div>
                </div>
              )}

              {activeTab === 'loyalty' && (
                <div className="space-y-6">
                  <div className={`bg-gradient-to-r ${getTierInfo(profile.loyalty_points || 0).bg} border-2 ${getTierInfo(profile.loyalty_points || 0).border} rounded-xl p-6`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3"><span className="text-3xl">⭐</span><div><h2 className="font-heading text-offwhite text-xl">Loyalty Rewards</h2><p className={`font-heading text-lg ${getTierInfo(profile.loyalty_points || 0).color}`}>{getTierInfo(profile.loyalty_points || 0).name} Member</p></div></div>
                      <div className="text-right"><div className="text-3xl font-heading text-gold">{profile.loyalty_points || 0}</div><div className="text-offwhite/50 text-sm">Points</div></div>
                    </div>
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-offwhite/50 mb-1"><span>Progress to {getTierInfo(profile.loyalty_points || 0).nextTier || 'Max Tier'}</span><span>{profile.loyalty_points || 0} / {getTierInfo(profile.loyalty_points || 0).nextThreshold || '∞'} pts</span></div>
                      <div className="w-full bg-offwhite/20 rounded-full h-3"><div className={`h-3 rounded-full ${getTierInfo(profile.loyalty_points || 0).color.replace('text-', 'bg-')}`} style={{ width: `${getTierInfo(profile.loyalty_points || 0).progress}%` }}></div></div>
                    </div>
                    <div className="bg-offwhite/20 rounded-lg p-4"><div className="text-offwhite/50 text-sm mb-1">Current Tier Perk:</div><div className="text-offwhite font-medium text-lg">{getTierInfo(profile.loyalty_points || 0).benefit}</div></div>
                    <div className="mt-6 pt-4 border-t border-offwhite/20">
                      <h4 className="font-heading text-offwhite text-sm mb-3">Tier Roadmap</h4>
                      <div className="space-y-2">
                        {['Silver', 'Gold', 'Platinum', 'Diamond'].map((tier) => {
                          const currentTier = getTierInfo(profile.loyalty_points || 0).name;
                          const tierOrder = ['Silver', 'Gold', 'Platinum', 'Diamond'];
                          const isUnlocked = tierOrder.indexOf(currentTier) >= tierOrder.indexOf(tier);
                          const isCurrent = tier === currentTier;
                          return (
                            <div key={tier} className={`flex items-center gap-3 p-2 rounded-lg ${isCurrent ? 'bg-offwhite/10' : 'bg-offwhite/5'}`}>
                              {isUnlocked ? <span className="text-gold text-lg">✓</span> : <span className="text-gray-400 text-lg">🔒</span>}
                              <div className="flex-1"><span className={`font-medium ${isCurrent ? 'text-gold' : isUnlocked ? 'text-offwhite' : 'text-offwhite/40'}`}>{tier}</span>{isCurrent && <span className="text-xs text-gold ml-2">(Current)</span>}</div>
                              <span className={`text-xs ${isUnlocked ? 'text-offwhite/50' : 'text-offwhite/30'}`}>{tierBenefits[tier]}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-charcoal/10 p-6" style={{ backgroundColor: '#1a1a1a' }}>
                    <h3 className="font-heading text-offwhite text-lg mb-4">How to Earn Points</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-offwhite/5"><span className="text-gold text-xl">💰</span><div><div className="text-offwhite font-medium">Earn 1 Point Per $1 Spent</div><div className="text-offwhite/50 text-sm">On every service payment</div></div></div>
                      <div className="flex items-center gap-3 p-3 bg-offwhite/5"><span className="text-gold text-xl">🎁</span><div><div className="text-offwhite font-medium">Refer a Friend</div><div className="text-offwhite/50 text-sm">Get 50 points when they sign up</div></div></div>
                    </div>
                  </div>

                  <div className="bg-white border border-charcoal/10 p-6" style={{ backgroundColor: '#1a1a1a' }}>
                    <h3 className="font-heading text-offwhite text-lg mb-4">Share & Earn</h3>
                    <p className="text-offwhite/50 text-sm mb-4">Share your referral code with friends. They get $10 off their first visit, and you earn 50 loyalty points!</p>
                    <div className="bg-gold/10 border border-gold/30 p-4 flex items-center justify-between">
                      <div><div className="text-xs text-offwhite/50 uppercase tracking-wider">Your Referral Code</div><div className="text-2xl font-heading text-gold">{profile.referral_code || 'N/A'}</div></div>
                      <button onClick={() => { const code = profile.referral_code || ''; const shareUrl = `${window.location.origin}/register?ref=${code}`; navigator.clipboard.writeText(shareUrl); alert('Referral link copied!'); }} className="px-4 py-2 bg-gold text-charcoal text-sm font-medium hover:bg-gold/90 transition-colors">Share Code</button>
                    </div>
                  </div>

                  <div className="bg-white border border-charcoal/10 p-6" style={{ backgroundColor: '#1a1a1a' }}>
                    <h3 className="font-heading text-offwhite text-lg mb-4">Points Redemption</h3>
                    {confirmationCode && (
                      <div className="mb-6 p-4 bg-gold/20 border border-gold/30 text-center">
                        <div className="text-offwhite/50 text-sm mb-2">Your Redemption Code</div>
                        <div className="text-3xl font-heading text-gold tracking-widest">{confirmationCode.code}</div>
                        <div className="text-offwhite mt-2">{confirmationCode.reward}</div>
                        <div className="text-offwhite/50 text-sm mt-1">Show this code to redeem</div>
                        <button onClick={closeConfirmation} className="mt-4 px-4 py-2 bg-gold text-charcoal text-sm hover:bg-gold/90">Got it!</button>
                      </div>
                    )}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-offwhite/5"><div><div className="text-offwhite font-medium">Free Basic Nail Art</div><div className="text-offwhite/50 text-sm">100 points</div></div><button onClick={() => handleRedeem(100, 'Free Basic Nail Art')} disabled={(profile.loyalty_points || 0) < 100} className="px-4 py-2 bg-gold text-charcoal text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gold/90">Redeem</button></div>
                      <div className="flex justify-between items-center p-3 bg-offwhite/5"><div><div className="text-offwhite font-medium">Free Refreshment & Hand Massage</div><div className="text-offwhite/50 text-sm">200 points</div></div><button onClick={() => handleRedeem(200, 'Free Refreshment & Hand Massage')} disabled={(profile.loyalty_points || 0) < 200} className="px-4 py-2 bg-gold text-charcoal text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gold/90">Redeem</button></div>
                      <div className="flex justify-between items-center p-3 bg-offwhite/5"><div><div className="text-offwhite font-medium">$25 Voucher for Premium Service</div><div className="text-offwhite/50 text-sm">500 points</div></div><button onClick={() => handleRedeem(500, '$25 Voucher for Premium Service')} disabled={(profile.loyalty_points || 0) < 500} className="px-4 py-2 bg-gold text-charcoal text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gold/90">Redeem</button></div>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}