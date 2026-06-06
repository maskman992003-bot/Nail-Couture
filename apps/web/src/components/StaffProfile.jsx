import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Sidebar from './Sidebar';
import clsx from 'clsx';

const roleColorsDark = {
  super_admin: 'bg-purple-900/50 text-purple-300 border-purple-700',
  owner: 'bg-purple-900/50 text-purple-300 border-purple-700',
  partner: 'bg-indigo-900/50 text-indigo-300 border-indigo-700',
  admin: 'bg-blue-900/50 text-blue-300 border-blue-700',
  cashier: 'bg-green-900/50 text-green-300 border-green-700',
  technician: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
};

const roleColorsLight = {
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
  const { theme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cashierActivity, setCashierActivity] = useState([]);
  const [todayStats, setTodayStats] = useState({ servicesCompleted: 0, revenueProcessed: 0 });
  const [weekStats, setWeekStats] = useState({ servicesCompleted: 0, revenueProcessed: 0 });
  const [updatingRole, setUpdatingRole] = useState(false);

  const roleColors = theme === 'dark' ? roleColorsDark : roleColorsLight;

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
      .from('payment_transactions')
      .select('*, appointments(*, services(name), customer:profiles!appointments_client_id_fkey(full_name))')
      .eq('cashier_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    setCashierActivity((data || []).map(t => ({ ...t.appointments, payment: t })));
  };

  const fetchPerformanceStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);

    const { count: todayCount } = await supabase
      .from('payment_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('cashier_id', id)
      .eq('status', 'completed')
      .gte('created_at', today.toISOString());

    const { data: todayRevenue } = await supabase
      .from('payment_transactions')
      .select('final_amount')
      .eq('cashier_id', id)
      .eq('status', 'completed')
      .gte('created_at', today.toISOString());

    const todayTotal = todayRevenue?.reduce((sum, a) => sum + (a.final_amount || 0), 0) || 0;

    const { count: weekCount } = await supabase
      .from('payment_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('cashier_id', id)
      .eq('status', 'completed')
      .gte('created_at', weekStart.toISOString());

    const { data: weekRevenue } = await supabase
      .from('payment_transactions')
      .select('final_amount')
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
     switch (role) {
       case 'super_admin': return '/superadmin/staff';
       case 'owner': return '/owner/staff';
       case 'partner': return '/partner/staff';
       case 'admin': return '/admin/staff';
       default: return '/admin/staff';
     }
   };

  const containerClass = clsx(
    'min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64',
    theme === 'dark' ? 'bg-[#0B0B0C] text-white' : 'bg-white text-charcoal'
  );

  const headerBorderClass = clsx(
    'px-4 sm:px-6 lg:px-8 py-6 border-b',
    theme === 'dark' ? 'border-gold/10' : 'border-gold/30'
  );

  const subtextClass = clsx(
    'text-sm mt-1',
    theme === 'dark' ? 'text-offwhite/60' : 'text-charcoal/60'
  );

  const backBtnClass = clsx(
    'px-4 py-2 rounded-lg hover:bg-offwhite/20 transition-colors text-sm',
    theme === 'dark' ? 'bg-offwhite/10 text-offwhite/60' : 'bg-charcoal/10 text-charcoal/60'
  );

  const profileCardClass = clsx(
    'rounded-xl p-8 text-center lg:w-64 flex-shrink-0 border',
    theme === 'dark' ? 'bg-offwhite/5 border-white/10' : 'bg-charcoal/5 border-charcoal/10'
  );

  const profileNameClass = clsx(
    'font-heading text-2xl mb-1',
    theme === 'dark' ? 'text-offwhite' : 'text-charcoal'
  );

  const profileEmailClass = clsx(
    'mb-4',
    theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50'
  );

  const statCardClass = clsx(
    'rounded-lg p-4 border',
    theme === 'dark' ? 'bg-offwhite/5 border-white/10' : 'bg-charcoal/5 border-charcoal/10'
  );

  const todayStatCardClass = clsx(
    statCardClass,
    theme === 'dark' ? 'border-green-900/50 bg-green-900/20' : 'border-green-200 bg-green-50'
  );

  const weekStatCardClass = clsx(
    statCardClass,
    theme === 'dark' ? 'border-blue-900/50 bg-blue-900/20' : 'border-blue-200 bg-blue-50'
  );

  const statTextClass = clsx(
    'text-2xl font-heading',
    theme === 'dark' ? 'text-offwhite' : 'text-charcoal'
  );

  const statSubtextClass = clsx(
    'text-xs',
    theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50'
  );

  const sectionCardClass = clsx(
    'rounded-xl p-6 border',
    theme === 'dark' ? 'bg-offwhite/5 border-white/10' : 'bg-charcoal/5 border-charcoal/10'
  );

  const selectClass = clsx(
    'flex-1 max-w-xs px-4 py-3 border rounded-lg',
    theme === 'dark'
      ? 'bg-offwhite/10 border-offwhite/20 text-offwhite'
      : 'bg-charcoal/5 border-charcoal/20 text-charcoal'
  );

  const labelClass = clsx(
    'text-sm',
    theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50'
  );

  const activityRowClass = clsx(
    'flex items-center justify-between py-3 border-b last:border-0',
    theme === 'dark' ? 'border-white/10' : 'border-charcoal/10'
  );

  const activityNameClass = clsx(
    'font-medium',
    theme === 'dark' ? 'text-offwhite' : 'text-charcoal'
  );

  const activitySubtextClass = clsx(
    'text-xs',
    theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50'
  );

  const emptyActivityText = clsx(
    'text-center py-8',
    theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40'
  );

  if (loading) {
    return (
      <div className={containerClass}>
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.charAt(0).toUpperCase() || '?';

  return (
    <div className={containerClass}>
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
        <div className={headerBorderClass}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-3xl text-gold">Staff Profile</h1>
              <p className={subtextClass}>{profile?.full_name}</p>
            </div>
            <button
              onClick={() => navigate(getStaffPath(user?.role))}
              className={backBtnClass}
            >
              ← Back to Staff
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className={profileCardClass}>
              <div className="w-24 h-24 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gold font-heading text-3xl">{initials}</span>
              </div>
              <h2 className={profileNameClass}>{profile?.full_name || 'Unknown'}</h2>
              <p className={profileEmailClass}>{profile?.email || 'No email'}</p>
              <span className={`px-4 py-2 text-sm border rounded-full inline-block ${roleColors[profile?.role] || ''}`}>
                {roleLabels[profile?.role] || profile?.role}
              </span>
            </div>

            <div className="flex-1 space-y-6">
              <div className={sectionCardClass}>
                <h3 className="font-heading text-xl text-gold mb-4">Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={todayStatCardClass}>
                    <div className="text-green-400 text-sm mb-1">Today</div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className={statTextClass}>{todayStats.servicesCompleted}</div>
                        <div className={statSubtextClass}>Services Completed</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-heading text-gold">${todayStats.revenueProcessed.toFixed(0)}</div>
                        <div className={statSubtextClass}>Revenue</div>
                      </div>
                    </div>
                  </div>
                  <div className={weekStatCardClass}>
                    <div className="text-blue-400 text-sm mb-1">This Week</div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className={statTextClass}>{weekStats.servicesCompleted}</div>
                        <div className={statSubtextClass}>Services Completed</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-heading text-gold">${weekStats.revenueProcessed.toFixed(0)}</div>
                        <div className={statSubtextClass}>Revenue</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={sectionCardClass}>
                <h3 className="font-heading text-xl text-gold mb-4">Role Management</h3>
                <div className="flex items-center gap-4">
                  <label className={labelClass}>Change Role:</label>
                  <select
                    value={profile?.role || ''}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    disabled={updatingRole}
                    className={selectClass}
                  >
                    <option value="technician">Technician</option>
                    <option value="cashier">Cashier</option>
                    <option value="admin">Admin</option>
                  </select>
                  <span className={statSubtextClass}>
                    {updatingRole ? 'Saving...' : 'Changes apply immediately'}
                  </span>
                </div>
              </div>

              <div className={sectionCardClass}>
                <h3 className="font-heading text-xl text-gold mb-4">Activity Log</h3>
                {cashierActivity.length === 0 ? (
                  <p className={emptyActivityText}>No checkout activity recorded</p>
                ) : (
                  <div className="space-y-3">
                    {cashierActivity.map((activity) => (
                      <div key={activity.id} className={activityRowClass}>
                        <div>
                          <div className={activityNameClass}>{activity.services?.name || 'Service'}</div>
                          <div className={activitySubtextClass}>
                            {activity.customer?.full_name || activity.customer?.email || 'Unknown'} - {activity.payment?.created_at ? new Date(activity.payment.created_at).toLocaleDateString() : '—'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-gold font-heading">${activity.final_price?.toFixed(2)}</div>
                          <div className={activitySubtextClass}>{activity.payment_method}</div>
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
