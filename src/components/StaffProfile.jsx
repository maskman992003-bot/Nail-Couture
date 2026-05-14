import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from './Navbar';

const roleColors = {
  super_admin: 'bg-purple-100 text-purple-800 border-purple-300',
  owner: 'bg-purple-100 text-purple-800 border-purple-300',
  partner: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  admin: 'bg-blue-100 text-blue-800 border-blue-300',
  cashier: 'bg-green-100 text-green-800 border-green-300',
  technician: 'bg-yellow-100 text-yellow-800 border-yellow-300',
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

  const handleNavigate = (page) => {
    if (page === 'home') navigate('/');
  };

  useEffect(() => {
    fetchProfile();
    fetchCashierActivity();
    fetchPerformanceStats();
  }, [id]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      navigate('/admin/staff');
      return;
    }
    setProfile(data);
    setLoading(false);
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
      setProfile(prev => ({ ...prev, role: newRole }));
    }
    setUpdatingRole(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-offwhite w-full overflow-x-hidden">
        <Navbar currentPage="admin" onNavigate={handleNavigate} />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading profile...</div>
        </div>
      </div>
    );
  }

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '??';

  return (
    <div className="min-h-screen bg-offwhite w-full overflow-x-hidden">
      <Navbar currentPage="admin" onNavigate={handleNavigate} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <Link
            to="/admin/staff"
            className="text-charcoal/60 hover:text-charcoal text-sm mb-4 inline-block"
          >
            ← Back to Staff Management
          </Link>
          
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="bg-white border border-charcoal/10 rounded-xl p-8 text-center lg:w-64">
              <div className="w-24 h-24 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gold font-heading text-3xl">{initials}</span>
              </div>
              <h2 className="font-heading text-charcoal text-2xl mb-1">{profile?.full_name || 'Unknown'}</h2>
              <p className="text-charcoal/60 mb-4">{profile?.email || 'No email'}</p>
              <span className={`px-4 py-2 text-sm border-2 rounded-full inline-block ${roleColors[profile?.role] || ''}`}>
                {roleLabels[profile?.role] || profile?.role}
              </span>
            </div>

            <div className="flex-1 space-y-6">
              <div className="bg-white border border-charcoal/10 rounded-xl p-6">
                <h3 className="font-heading text-charcoal text-xl mb-4">Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-green-700 text-sm mb-1">Today</div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-2xl font-heading text-charcoal">{todayStats.servicesCompleted}</div>
                        <div className="text-xs text-charcoal/60">Services Completed</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-heading text-gold">${todayStats.revenueProcessed.toFixed(0)}</div>
                        <div className="text-xs text-charcoal/60">Revenue</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-blue-700 text-sm mb-1">This Week</div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-2xl font-heading text-charcoal">{weekStats.servicesCompleted}</div>
                        <div className="text-xs text-charcoal/60">Services Completed</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-heading text-gold">${weekStats.revenueProcessed.toFixed(0)}</div>
                        <div className="text-xs text-charcoal/60">Revenue</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-charcoal/10 rounded-xl p-6">
                <h3 className="font-heading text-charcoal text-xl mb-4">Role Management</h3>
                <div className="flex items-center gap-4">
                  <label className="text-charcoal/60 text-sm">Change Role:</label>
                  <select
                    value={profile?.role || ''}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    disabled={updatingRole}
                    className="flex-1 max-w-xs px-4 py-3 bg-offwhite border border-charcoal/10 text-charcoal rounded-lg"
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="owner">Owner</option>
                    <option value="partner">Partner</option>
                    <option value="admin">Admin</option>
                    <option value="cashier">Cashier</option>
                    <option value="technician">Technician</option>
                  </select>
                  <span className="text-xs text-charcoal/50">
                    {updatingRole ? 'Saving...' : 'Changes apply immediately'}
                  </span>
                </div>
              </div>

              <div className="bg-white border border-charcoal/10 rounded-xl p-6">
                <h3 className="font-heading text-charcoal text-xl mb-4">Activity Log</h3>
                {cashierActivity.length === 0 ? (
                  <p className="text-charcoal/50 text-center py-8">No checkout activity recorded</p>
                ) : (
                  <div className="space-y-3">
                    {cashierActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between py-3 border-b border-charcoal/10 last:border-0">
                        <div>
                          <div className="text-charcoal font-medium">{activity.services?.name || 'Service'}</div>
                          <div className="text-xs text-charcoal/50">
                            {activity.customer?.full_name} • {new Date(activity.completed_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-gold font-heading">${activity.final_price?.toFixed(2)}</div>
                          <div className="text-xs text-charcoal/50">{activity.payment_method}</div>
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