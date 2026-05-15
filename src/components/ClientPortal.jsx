import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from './Navbar';

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

export default function ClientPortal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('appointments');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const { user, logout, loading: authLoading } = useAuth();

  console.log('ClientPortal render - user:', user?.id, 'authLoading:', authLoading);

  const fetchUserData = useCallback(async () => {
    const currentUser = localStorage.getItem('salon_user_data');
    const userId = currentUser ? JSON.parse(currentUser).id : null;
    
    if (!userId) {
      console.log('No userId found, redirecting to login');
      navigate('/login');
      return;
    }

    console.log('Fetching user data for:', userId);

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError);
      } else {
        console.log('Profile loaded:', profileData);
        setProfile(profileData);
      }

      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*, services(name, price, duration_minutes)')
        .eq('profile_id', userId)
        .order('check_in_time', { ascending: false })

      if (appointmentsError) {
        console.error('Appointments fetch error:', appointmentsError);
      } else {
        console.log('Appointments loaded:', appointmentsData?.length);
        setAppointments(appointmentsData || []);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (authLoading) {
      console.log('Auth still loading, waiting...');
      return;
    }

    if (!user) {
      console.log('No user after auth loaded, redirecting to login');
      navigate('/login');
      return;
    }

    console.log('User authenticated, fetching data...');
    fetchUserData();
  }, [user, authLoading, navigate, fetchUserData]);

  useEffect(() => {
    const currentUser = localStorage.getItem('salon_user_data');
    const userId = currentUser ? JSON.parse(currentUser).id : null;
    
    if (!userId) return;

    const channel = supabase
      .channel('client-portal-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'appointments', filter: `profile_id=eq.${userId}` },
        () => {
          console.log('Real-time update received, refetching...');
          fetchUserData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUserData]);

  const handleLogout = () => {
    console.log('Logout clicked');
    logout();
    navigate('/');
  };

  const handleNavigate = (page) => {
    if (page === 'home') navigate('/');
  };

  const startEditProfile = () => {
    setEditForm({
      full_name: profile.full_name || '',
      email: profile.email || '',
      phone_number: profile.phone_number || '',
      nail_goal: profile.nail_goal || '',
      refreshment_pref: profile.refreshment_pref || ''
    });
    setEditingProfile(true);
  };

  const cancelEditProfile = () => {
    setEditingProfile(false);
    setEditForm({});
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const cleanPhone = editForm.phone_number.replace(/\D/g, '');
      const updateData = {
        full_name: editForm.full_name,
        email: editForm.email,
        phone_number: cleanPhone,
        nail_goal: editForm.nail_goal || null,
        refreshment_pref: editForm.refreshment_pref || null
      };
      console.log('Saving profile with id:', profile.id, 'data:', updateData);

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile.id);

      console.log('Update error:', updateError);

      if (updateError) {
        console.error('Profile update error:', updateError);
        alert('Failed to save: ' + updateError.message);
      } else {
        const { data: verifyData, error: verifyError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profile.id)
          .single();
        console.log('Verification - data:', verifyData, 'error:', verifyError);
        if (verifyData) {
          setProfile(verifyData);
          localStorage.setItem('salon_user_data', JSON.stringify(verifyData));
          setEditingProfile(false);
          setEditForm({});
        } else {
          console.error('Verification fetch failed:', verifyError);
          alert('Update may have failed - please refresh and try again');
        }
      }
    } catch (err) {
      console.error('Error saving profile:', err);
    }
    setSaving(false);
  };

  const currentAppointment = appointments.find(a => 
    ['waiting', 'assigned_pending', 'serving'].includes(a.status)
  );

  const upcomingAppointments = appointments.filter(a => 
    a.status === 'waiting'
  );

  const pastAppointments = appointments.filter(a => 
    ['completed', 'cancelled'].includes(a.status)
  );

  if (authLoading) {
    console.log('Showing auth loading state');
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center">
        <div className="text-gold animate-pulse">Checking session...</div>
      </div>
    );
  }

  if (loading) {
    console.log('Showing data loading state');
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center">
        <div className="text-gold animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    console.log('No profile, showing error state');
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center">
        <div className="text-center">
          <p className="text-charcoal/60 mb-4">Unable to load profile</p>
          <button onClick={handleLogout} className="px-4 py-2 bg-gold text-charcoal">Return to Login</button>
        </div>
      </div>
    );
  }

  const initials = profile.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '??';

  const tabs = [
    { id: 'appointments', label: 'Appointments', icon: '📅' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'loyalty', label: 'Rewards', icon: '⭐' },
  ];

  return (
    <div className="min-h-screen bg-offwhite">
      <Navbar currentPage="portal" onNavigate={handleNavigate} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-white border border-charcoal/10 p-6 mb-6">
              <div className="text-center mb-4">
                <div className="w-20 h-20 bg-gold rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-charcoal font-heading text-2xl">{initials}</span>
                </div>
                <h3 className="font-heading text-charcoal text-lg">Welcome, {profile.full_name}</h3>
                <p className="text-charcoal/50 text-sm">{profile.email}</p>
                {profile.nail_goal && (
                  <p className="text-gold/70 text-xs mt-1">Goal: {profile.nail_goal}</p>
                )}
              </div>
            </div>

            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${activeTab === tab.id ? 'bg-charcoal text-offwhite' : 'text-charcoal/60 hover:bg-white hover:text-charcoal'}`}
                >
                  <span>{tab.icon}</span>
                  <span className="text-sm tracking-wide">{tab.label}</span>
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
                      <h2 className="font-heading text-charcoal text-xl">Current Appointment</h2>
                      <span className={`px-3 py-1 text-sm border ${statusColors[currentAppointment.status]}`}>
                        {statusLabels[currentAppointment.status]}
                      </span>
                    </div>
                    <div className="text-charcoal font-medium text-lg">
                      {currentAppointment.services?.name || 'Service'}
                    </div>
                    {currentAppointment.services?.duration_minutes && (
                      <p className="text-charcoal/60 text-sm mt-1">
                        Estimated time: ~{currentAppointment.services.duration_minutes} min
                      </p>
                    )}
                    {currentAppointment.start_time && (
                      <p className="text-green-600 text-sm mt-2">
                        Started at: {new Date(currentAppointment.start_time).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                )}

                <div className="bg-white border border-charcoal/10 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-heading text-charcoal text-xl">Upcoming Appointments</h2>
                    <Link to="/booking" className="text-gold text-sm hover:underline">Book New</Link>
                  </div>
                  {upcomingAppointments.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {upcomingAppointments.map((booking) => (
                        <div key={booking.id} className="border border-charcoal/10 p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="text-sm text-charcoal/50">
                                {new Date(booking.check_in_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                              </div>
                              <div className="text-sm text-charcoal/50">
                                {new Date(booking.check_in_time).toLocaleTimeString()}
                              </div>
                            </div>
                            <span className={`px-2 py-1 text-xs border ${statusColors[booking.status]}`}>
                              {statusLabels[booking.status]}
                            </span>
                          </div>
                          <div className="text-charcoal font-medium">
                            {booking.services?.name || 'Service'}
                          </div>
                          {booking.services?.price && (
                            <div className="text-charcoal font-heading mt-2">
                              ${booking.services.price}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-charcoal/60">No upcoming appointments. 
                      <Link to="/booking" className="text-gold hover:underline ml-1">Book one now</Link>
                    </p>
                  )}
                </div>

                <div className="bg-white border border-charcoal/10 p-6">
                  <h2 className="font-heading text-charcoal text-xl mb-4">Appointment History</h2>
                  {pastAppointments.length > 0 ? (
                    <div className="space-y-4">
                      {pastAppointments.map((booking) => (
                        <div key={booking.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border border-charcoal/10">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-1 text-xs border ${statusColors[booking.status]}`}>
                                {statusLabels[booking.status]}
                              </span>
                              <span className="text-charcoal/50 text-sm">
                                {new Date(booking.check_in_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                            <h4 className="font-heading text-charcoal">
                              {booking.services?.name || 'Service'}
                            </h4>
                            {booking.cancel_reason && (
                              <p className="text-red-500 text-sm mt-1">
                                Cancelled: {booking.cancel_reason}
                              </p>
                            )}
                            {booking.start_time && booking.end_time && (
                              <p className="text-charcoal/60 text-sm">
                                Service time: {Math.round((new Date(booking.end_time) - new Date(booking.start_time)) / 60000)} min
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            {booking.services?.price && (
                              <div className="font-heading text-charcoal text-xl mb-2">
                                ${booking.services.price}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-charcoal/50">No past appointments</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="bg-white border border-charcoal/10 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-heading text-charcoal text-xl">Profile Information</h2>
                    {!editingProfile && (
                      <button
                        onClick={startEditProfile}
                        className="px-4 py-2 bg-gold text-charcoal text-sm font-medium hover:bg-gold/90 transition-colors"
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>

                  {editingProfile ? (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs text-charcoal/50 uppercase tracking-wider block mb-2">Full Name</label>
                        <input
                          type="text"
                          value={editForm.full_name}
                          onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                          className="w-full p-3 border border-charcoal/10 focus:border-gold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-charcoal/50 uppercase tracking-wider block mb-2">Email</label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="w-full p-3 border border-charcoal/10 focus:border-gold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-charcoal/50 uppercase tracking-wider block mb-2">Phone</label>
                        <input
                          type="tel"
                          value={editForm.phone_number}
                          onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                          className="w-full p-3 border border-charcoal/10 focus:border-gold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-charcoal/50 uppercase tracking-wider block mb-2">Nail Goal</label>
                        <select
                          value={editForm.nail_goal}
                          onChange={(e) => setEditForm({ ...editForm, nail_goal: e.target.value })}
                          className="w-full p-3 border border-charcoal/10 focus:border-gold focus:outline-none"
                        >
                          <option value="">Select a goal</option>
                          <option value="Healthy Natural Nails">Healthy Natural Nails</option>
                          <option value="Long Extensions">Long Extensions</option>
                          <option value="Intricate Art">Intricate Art</option>
                          <option value="Gel Polish">Gel Polish</option>
                          <option value="Acrylic Nails">Acrylic Nails</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-charcoal/50 uppercase tracking-wider block mb-2">Refreshment Preference</label>
                        <select
                          value={editForm.refreshment_pref}
                          onChange={(e) => setEditForm({ ...editForm, refreshment_pref: e.target.value })}
                          className="w-full p-3 border border-charcoal/10 focus:border-gold focus:outline-none"
                        >
                          <option value="">Select preference</option>
                          <option value="Water">Water</option>
                          <option value="Tea">Tea</option>
                          <option value="Coffee">Coffee</option>
                          <option value="Juice">Juice</option>
                          <option value="No drink">No drink</option>
                        </select>
                      </div>
                      <div className="md:col-span-2 flex gap-3 mt-4">
                        <button
                          onClick={saveProfile}
                          disabled={saving}
                          className="px-6 py-3 bg-gold text-charcoal font-medium hover:bg-gold/90 transition-colors disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={cancelEditProfile}
                          className="px-6 py-3 border border-charcoal/20 text-charcoal/60 hover:text-charcoal transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs text-charcoal/50 uppercase tracking-wider block mb-2">Full Name</label>
                        <p className="text-charcoal">{profile.full_name || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-xs text-charcoal/50 uppercase tracking-wider block mb-2">Email</label>
                        <p className="text-charcoal">{profile.email || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-xs text-charcoal/50 uppercase tracking-wider block mb-2">Phone</label>
                        <p className="text-charcoal">{profile.phone_number || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-xs text-charcoal/50 uppercase tracking-wider block mb-2">Nail Goal</label>
                        <p className="text-charcoal">{profile.nail_goal || 'Not set'}</p>
                      </div>
                      {profile.refreshment_pref && (
                        <div>
                          <label className="text-xs text-charcoal/50 uppercase tracking-wider block mb-2">Refreshment Preference</label>
                          <p className="text-charcoal">{profile.refreshment_pref}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-charcoal/5 border border-charcoal/20 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-heading text-charcoal text-lg mb-1">Total Visits</h3>
                      <p className="text-charcoal/60 text-sm">Your appointment count</p>
                    </div>
                    <div className="text-4xl font-heading text-gold">{pastAppointments.length}</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'loyalty' && (
              <div className="space-y-6">
                <div className="bg-white border border-charcoal/10 p-6">
                  <h2 className="font-heading text-charcoal text-xl mb-6">Loyalty Rewards</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-r from-gold/20 to-amber-100 border-2 border-gold p-6 text-center">
                      <div className="text-charcoal/60 text-sm mb-1">Your Points</div>
                      <div className="text-5xl font-heading text-gold mb-2">{profile.loyalty_points || 0}</div>
                      <div className="text-charcoal/60 text-sm">Earn 1 point per $1 spent</div>
                    </div>
                    <div className="bg-charcoal/5 border border-charcoal/20 p-6 text-center">
                      <div className="text-charcoal/60 text-sm mb-1">Your Tier</div>
                      <div className="text-3xl font-heading text-charcoal mb-2">{profile.tier || 'Silver'}</div>
                      <div className="text-charcoal/60 text-sm">100+ points = Gold</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-charcoal/10 p-6">
                  <h3 className="font-heading text-charcoal text-lg mb-4">Share & Earn</h3>
                  <p className="text-charcoal/60 text-sm mb-4">
                    Share your referral code with friends. They get $10 off their first visit, and you earn 50 loyalty points!
                  </p>
                  <div className="bg-gold/10 border border-gold/30 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-charcoal/50 uppercase tracking-wider">Your Referral Code</div>
                      <div className="text-2xl font-heading text-gold">{profile.referral_code || 'N/A'}</div>
                    </div>
                    <button
                      onClick={() => {
                        const code = profile.referral_code || '';
                        const shareUrl = `${window.location.origin}/register?ref=${code}`;
                        const shareText = `Get $10 off your first visit at Nail Couture! Use my code: ${code}`;
                        if (navigator.share) {
                          navigator.share({
                            title: 'Nail Couture Referral',
                            text: shareText,
                            url: shareUrl
                          });
                        } else {
                          navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
                          alert('Referral link copied to clipboard!');
                        }
                      }}
                      className="px-4 py-2 bg-gold text-charcoal text-sm font-medium hover:bg-gold/90 transition-colors"
                    >
                      Share Code
                    </button>
                  </div>
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => {
                        const code = profile.referral_code || '';
                        const shareUrl = `${window.location.origin}/register?ref=${code}`;
                        navigator.clipboard.writeText(shareUrl);
                        alert('Referral link copied!');
                      }}
                      className="text-sm text-gold hover:text-gold/80 underline"
                    >
                      Copy referral link
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-charcoal/10 p-6">
                  <h3 className="font-heading text-charcoal text-lg mb-4">Points Redemption</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-charcoal/5">
                      <div>
                        <div className="text-charcoal font-medium">$5 off</div>
                        <div className="text-charcoal/50 text-sm">100 points</div>
                      </div>
                      <button
                        disabled={(profile.loyalty_points || 0) < 100}
                        className="px-4 py-2 bg-gold text-charcoal text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gold/90"
                      >
                        Redeem
                      </button>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-charcoal/5">
                      <div>
                        <div className="text-charcoal font-medium">$10 off</div>
                        <div className="text-charcoal/50 text-sm">200 points</div>
                      </div>
                      <button
                        disabled={(profile.loyalty_points || 0) < 200}
                        className="px-4 py-2 bg-gold text-charcoal text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gold/90"
                      >
                        Redeem
                      </button>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-charcoal/5">
                      <div>
                        <div className="text-charcoal font-medium">$25 off</div>
                        <div className="text-charcoal/50 text-sm">500 points</div>
                      </div>
                      <button
                        disabled={(profile.loyalty_points || 0) < 500}
                        className="px-4 py-2 bg-gold text-charcoal text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gold/90"
                      >
                        Redeem
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}