import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';

const roleColors = {
  super_admin: 'bg-purple-900/50 text-purple-300 border-purple-700',
  owner: 'bg-purple-900/50 text-purple-300 border-purple-700',
  partner: 'bg-indigo-900/50 text-indigo-300 border-indigo-700',
  admin: 'bg-blue-900/50 text-blue-300 border-blue-700',
  cashier: 'bg-green-900/50 text-green-300 border-green-700',
  technician: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
};

const roleLabels = {
  super_admin: 'Super Admin',
  owner: 'Owner',
  partner: 'Partner',
  admin: 'Admin',
  cashier: 'Cashier',
  technician: 'Technician',
};

export default function StaffProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cashierActivity, setCashierActivity] = useState([]);
  const [todayStats, setTodayStats] = useState({ servicesCompleted: 0, revenueProcessed: 0 });
  const [weekStats, setWeekStats] = useState({ servicesCompleted: 0, revenueProcessed: 0 });
  const [updatingRole, setUpdatingRole] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!['admin', 'super_admin', 'owner', 'partner'].includes(user.role)) {
      navigate(user.role === 'technician' ? '/technician' : '/portal');
      return;
    }
    fetchProfile();
    fetchCashierActivity();
    fetchPerformanceStats();
  }, [user, id, navigate]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      navigate(getStaffPath(user?.role));
    } finally {
      setLoading(false);
    }
  };

  const fetchCashierActivity = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('*, services(name), customer:profiles!appointments_profile_id_fkey(full_name)')
      .eq('cashier_id', id)
      .order('completed_at', { ascending: false })
      .limit(10);

    setCashierActivity(data || []);
  };

  const fetchPerformanceStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);

    const { count: todayCount } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('cashier_id', id)
      .eq('status', 'completed')
      .gte('completed_at', today.toISOString());

    const { data: todayRevenue } = await supabase
      .from('appointments')
      .select('final_price')
      .eq('cashier_id', id)
      .eq('status', 'completed')
      .gte('completed_at', today.toISOString());

    const todayTotal = todayRevenue?.reduce((sum, a) => sum + (a.final_price || 0), 0) || 0;

    const { count: weekCount } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('cashier_id', id)
      .eq('status', 'completed')
      .gte('completed_at', weekStart.toISOString());

    const { data: weekRevenue } = await supabase
      .from('appointments')
      .select('final_price')
      .eq('cashier_id', id)
      .eq('status', 'completed')
      .gte('completed_at', weekStart.toISOString());

    const weekTotal = weekRevenue?.reduce((sum, a) => sum + (a.final_price || 0), 0) || 0;

    setTodayStats({ servicesCompleted: todayCount || 0, revenueProcessed: todayTotal });
    setWeekStats({ servicesCompleted: weekCount || 0, revenueProcessed: weekTotal });
  };

  const handleRoleChange = async (newRole) => {
    setUpdatingRole(true);
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', id);

    if (!error) {
      setProfile((prev) => ({ ...prev, role: newRole }));
    }
    setUpdatingRole(false);
  };

  const getStaffPath = (role) => {
    if (['super_admin', 'owner', 'partner'].includes(role)) return '/superadmin/staff';
    return '/admin/staff';
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

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.charAt(0).toUpperCase() || '?';

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-8 py-6 border-b" style={{ borderColor: 'rgba(197, 160, 89, 0.1)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-3xl text-gold">Staff Profile</h1>
              <p className="text-offwhite/60 text-sm mt-1">{profile?.full_name}</p>
            </div>
            <button
              onClick={() => navigate(getStaffPath(user?.role))}
              className="px-4 py-2 bg-offwhite/10 text-offwhite/60 rounded-lg hover:bg-offwhite/20 transition-colors text-sm"
            >
              &#8592; Back to Staff
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="rounded-xl p-8 text-center lg:w-64 flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-24 h-24 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gold font-heading text-3xl">{initials}</span>
              </div>
              <h2 className="font-heading text-2xl text-offwhite mb-1">{profile?.full_name || 'Unknown'}</h2>
              <p className="text-offwhite/50 mb-4">{profile?.email || 'No email'}</p>
              <span className={`px-4 py-2 text-sm border rounded-full inline-block ${roleColors[profile?.role] || ''}`}>
                {roleLabels[profile?.role] || profile?.role}
              </span>
            </div>

            <div className="flex-1 space-y-6">
              <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 className="font-heading text-xl text-gold mb-4">Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-lg p-4 border border-green-900/50" style={{ backgroundColor: 'rgba(22, 101, 52, 0.2)' }}>
                    <div className="text-green-400 text-sm mb-1">Today</div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-2xl font-heading text-offwhite">{todayStats.servicesCompleted}</div>
                        <div className="text-xs text-offwhite/50">Services Completed</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-heading text-gold">${todayStats.revenueProcessed.toFixed(0)}</div>
                        <div className="text-xs text-offwhite/50">Revenue</div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg p-4 border border-blue-900/50" style={{ backgroundColor: 'rgba(30, 58, 138, 0.2)' }}>
                    <div className="text-blue-400 text-sm mb-1">This Week</div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-2xl font-heading text-offwhite">{weekStats.servicesCompleted}</div>
                        <div className="text-xs text-offwhite/50">Services Completed</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-heading text-gold">${weekStats.revenueProcessed.toFixed(0)}</div>
                        <div className="text-xs text-offwhite/50">Revenue</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 className="font-heading text-xl text-gold mb-4">Role Management</h3>
                <div className="flex items-center gap-4">
                  <label className="text-offwhite/50 text-sm">Change Role:</label>
                  <select
                    value={profile?.role || ''}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    disabled={updatingRole}
                    className="flex-1 max-w-xs px-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg"
                  >
                    <option value="technician">Technician</option>
                    <option value="cashier">Cashier</option>
                    <option value="admin">Admin</option>
                  </select>
                  <span className="text-xs text-offwhite/40">
                    {updatingRole ? 'Saving...' : 'Changes apply immediately'}
                  </span>
                </div>
              </div>

              <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 className="font-heading text-xl text-gold mb-4">Activity Log</h3>
                {cashierActivity.length === 0 ? (
                  <p className="text-offwhite/40 text-center py-8">No checkout activity recorded</p>
                ) : (
                  <div className="space-y-3">
                    {cashierActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <div>
                          <div className="text-offwhite font-medium">{activity.services?.name || 'Service'}</div>
                          <div className="text-xs text-offwhite/50">
                            {activity.customer?.full_name || activity.customer?.email || 'Unknown'} - {new Date(activity.completed_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-gold font-heading">${activity.final_price?.toFixed(2)}</div>
                          <div className="text-xs text-offwhite/50">{activity.payment_method}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}