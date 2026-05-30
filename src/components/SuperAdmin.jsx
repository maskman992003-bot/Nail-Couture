import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';

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

export default function SuperAdmin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ todayRevenue: 0, activeTechnicians: 0, waitingCustomers: 0, completedToday: 0 });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!['super_admin', 'owner', 'partner'].includes(user.role)) { 
      navigate(getHomeRoute(user.role)); 
      return; 
    }
    fetchData();
  }, [user, navigate]);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/staff') || path.endsWith('/staff')) {
      setActiveTab('staff');
    } else {
      setActiveTab('dashboard');
    }
  }, [location.pathname]);

  const getHomeRoute = (role) => {
    switch (role) {
      case 'admin': return '/admin';
      case 'cashier': return '/cashier';
      case 'technician': return '/technician';
      default: return '/portal';
    }
  };

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const [apptsRes, waitingRes, staffRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('*, services(name, price), customer:profiles!appointments_client_id_fkey(full_name)')
          .gte('checked_in_at', `${today}T00:00:00`)
          .order('checked_in_at', { ascending: false }),
        supabase
          .from('appointments')
          .select('id, status', { count: 'exact', head: true })
          .eq('status', 'waiting'),
        supabase
          .from('profiles')
          .select('*')
          .in('role', ['admin', 'cashier', 'technician'])
          .order('full_name'),
      ]);
      
      const appointments = apptsRes.data;
      const staffData = staffRes.data;
      const waitingCount = waitingRes.count || 0;

      if (appointments) {
        const completed = appointments.filter(a => a.status === 'completed');
        const revenue = completed.reduce((sum, a) => sum + (a.final_price || a.services?.price || 0), 0);
        
        setStats({
          todayRevenue: revenue,
          activeTechnicians: staffData?.filter(s => s.role === 'technician').length || 5,
          waitingCustomers: waitingCount,
          completedToday: completed.length,
        });
        setRecentAppointments(appointments.slice(0, 10));
      }
      
      if (staffData) setStaff(staffData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading Dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
         <div className="px-4 sm:px-6 lg:px-8 py-6 border-b" style={{ borderColor: 'rgba(197, 160, 89, 0.1)' }}>
        <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading text-3xl text-gold">
                  {user?.role === 'owner' ? 'Owner Dashboard' : user?.role === 'partner' ? 'Partner Dashboard' : 'Super Admin'}
                </h1>
                <p className="text-offwhite/60 text-sm mt-1">Welcome back, {user?.full_name}</p>
              </div>
             <div className="text-offwhite/50 text-sm">
               {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
             </div>
           </div>
         </div>

         {user?.role !== 'owner' && (
           <div className="px-4 sm:px-6 lg:px-8 py-4 flex gap-2 border-b" style={{ borderColor: 'rgba(197, 160, 89, 0.1)' }}>
             <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-gold text-charcoal' : 'bg-offwhite/10 text-offwhite/60 hover:bg-offwhite/20'}`}>
               Dashboard
             </button>
             <button onClick={() => setActiveTab('staff')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'staff' ? 'bg-gold text-charcoal' : 'bg-offwhite/10 text-offwhite/60 hover:bg-offwhite/20'}`}>
               Staff
             </button>
           </div>
         )}

        <div className="flex-1 overflow-y-auto p-8 pb-24 lg:pb-8">
          {activeTab === 'dashboard' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-offwhite/5 border border-gold/20 p-6 rounded-xl">
                  <div className="text-offwhite/50 text-sm mb-1">Today's Revenue</div>
                  <div className="text-3xl font-heading text-gold">${stats.todayRevenue.toFixed(0)}</div>
                </div>
                <div className="bg-offwhite/5 border border-gold/20 p-6 rounded-xl">
                  <div className="text-offwhite/50 text-sm mb-1">Active Technicians</div>
                  <div className="text-3xl font-heading text-offwhite">{stats.activeTechnicians}</div>
                </div>
                <div className="bg-offwhite/5 border border-gold/20 p-6 rounded-xl">
                  <div className="text-offwhite/50 text-sm mb-1">Waiting</div>
                  <div className="text-3xl font-heading text-yellow-400">{stats.waitingCustomers}</div>
                </div>
                <div className="bg-offwhite/5 border border-gold/20 p-6 rounded-xl">
                  <div className="text-offwhite/50 text-sm mb-1">Completed</div>
                  <div className="text-3xl font-heading text-green-400">{stats.completedToday}</div>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-offwhite/5 border border-gold/20 rounded-xl p-6">
<div className="flex items-center justify-between mb-4">
  <h2 className="font-heading text-xl text-offwhite">Today's Activity</h2>
  <Link to={user?.role === 'owner' ? '/owner/lobby' : user?.role === 'partner' ? '/partner/lobby' : '/superadmin/lobby'} className="text-gold text-sm hover:underline">View Lobby</Link>
</div>
               <div className="space-y-3">
                     {recentAppointments.length > 0 ? recentAppointments.map((appt) => (
                        <Link to={`/${user.role}/customers?customerId=${appt.customer_id}`} key={appt.id} className="flex items-center justify-between p-3 bg-offwhite/5 rounded-lg block mb-0">
                          <div>
                            <div className="text-offwhite font-medium">{appt.customer?.full_name || 'Guest'}</div>
                            <div className="text-offwhite/50 text-sm">{appt.add_ons || appt.services?.name || 'Service'}</div>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 text-xs border rounded ${statusColors[appt.status]}`}>
                              {statusLabels[appt.status]}
                            </span>
                            <div className="text-gold text-sm mt-1">${appt.final_price || appt.services?.price}</div>
                          </div>
                        </Link>
                     )) : (
                       <p className="text-offwhite/40 text-center py-8">No appointments today</p>
                     )}
                   </div>
                </div>

                <div className="bg-offwhite/5 border border-gold/20 rounded-xl p-6">
                  <h2 className="font-heading text-xl text-offwhite mb-4">Quick Actions</h2>
                   <div className="space-y-3">
                     <Link to={user?.role === 'owner' ? '/owner/lobby' : user?.role === 'partner' ? '/partner/lobby' : '/superadmin/lobby'} className="block p-4 bg-gold/10 border border-gold/30 rounded-lg hover:bg-gold/20 transition-colors">
                       <div className="text-gold font-heading">Manage Lobby</div>
                       <div className="text-offwhite/50 text-sm">Assign customers to technicians</div>
                     </Link>
                     <Link to={user?.role === 'owner' ? '/owner/services' : user?.role === 'partner' ? '/partner/services' : '/superadmin/services'} className="block p-4 bg-offwhite/5 border border-offwhite/20 rounded-lg hover:bg-offwhite/10 transition-colors">
                       <div className="text-offwhite font-heading">Services</div>
                       <div className="text-offwhite/50 text-sm">Manage pricing</div>
                     </Link>
                     <Link to={user?.role === 'owner' ? '/owner/reports' : user?.role === 'partner' ? '/partner/reports' : '/superadmin/reports'} className="block p-4 bg-offwhite/5 border border-offwhite/20 rounded-lg hover:bg-offwhite/10 transition-colors">
                       <div className="text-offwhite font-heading">View Reports</div>
                       <div className="text-offwhite/50 text-sm">Analytics and insights</div>
                     </Link>
                   </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'staff' && (
            <div className="bg-offwhite/5 border border-gold/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-xl text-offwhite">Staff Management</h2>
                <Link to="/superadmin/staff/new" className="px-4 py-2 bg-gold text-charcoal rounded-lg hover:bg-gold/90 transition-colors">
                  + Add Staff
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-offwhite/50 text-sm border-b border-offwhite/10">
                      <th className="text-left py-3 px-4">Name</th>
                      <th className="text-left py-3 px-4">Role</th>
                      <th className="text-left py-3 px-4">Phone</th>
                      <th className="text-left py-3 px-4">Email</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((member) => (
                      <tr key={member.id} className="border-b border-offwhite/5 hover:bg-offwhite/5">
                        <td className="py-3 px-4 text-offwhite font-medium">{member.full_name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded ${
                            member.role === 'technician' ? 'bg-blue-500/20 text-blue-400' :
                            member.role === 'cashier' ? 'bg-green-500/20 text-green-400' :
                            member.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-offwhite/10 text-offwhite/60'
                          }`}>
                            {member.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-offwhite/60">{member.phone}</td>
                        <td className="py-3 px-4 text-offwhite/60">{member.email || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400">Active</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Link to={`/superadmin/schedule?staff=${member.id}`} className="text-blue-400 hover:underline text-sm">
                              Schedule
                            </Link>
                            <Link to={`/superadmin/staff/${member.id}`} className="text-gold hover:underline text-sm">
                              Edit
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {staff.length === 0 && (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-offwhite/40">No staff members found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}