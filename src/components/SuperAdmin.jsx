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
    if (path.includes('/services')) {
      setActiveTab('services');
    } else if (path.includes('/staff') || path.endsWith('/staff')) {
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
              <h1 className="font-heading text-3xl text-gold">Super Admin</h1>
              <p className="text-offwhite/60 text-sm mt-1">Welcome back, {user?.full_name}</p>
            </div>
            <div className="text-offwhite/50 text-sm">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-4 flex gap-2 border-b" style={{ borderColor: 'rgba(197, 160, 89, 0.1)' }}>
          <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-gold text-charcoal' : 'bg-offwhite/10 text-offwhite/60 hover:bg-offwhite/20'}`}>
            Dashboard
          </button>
          <button onClick={() => setActiveTab('staff')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'staff' ? 'bg-gold text-charcoal' : 'bg-offwhite/10 text-offwhite/60 hover:bg-offwhite/20'}`}>
            Staff
          </button>
          <button onClick={() => setActiveTab('services')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'services' ? 'bg-gold text-charcoal' : 'bg-offwhite/10 text-offwhite/60 hover:bg-offwhite/20'}`}>
            Services
          </button>
        </div>

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
                    <Link to="/superadmin/lobby" className="text-gold text-sm hover:underline">View Lobby</Link>
                  </div>
                  <div className="space-y-3">
                    {recentAppointments.length > 0 ? recentAppointments.map((appt) => (
                      <div key={appt.id} className="flex items-center justify-between p-3 bg-offwhite/5 rounded-lg">
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
                      </div>
                    )) : (
                      <p className="text-offwhite/40 text-center py-8">No appointments today</p>
                    )}
                  </div>
                </div>

                <div className="bg-offwhite/5 border border-gold/20 rounded-xl p-6">
                  <h2 className="font-heading text-xl text-offwhite mb-4">Quick Actions</h2>
                  <div className="space-y-3">
                    <Link to="/superadmin/lobby" className="block p-4 bg-gold/10 border border-gold/30 rounded-lg hover:bg-gold/20 transition-colors">
                      <div className="text-gold font-heading">Manage Lobby</div>
                      <div className="text-offwhite/50 text-sm">Assign customers to technicians</div>
                    </Link>
                    <Link to="/superadmin/services" className="block p-4 bg-offwhite/5 border border-offwhite/20 rounded-lg hover:bg-offwhite/10 transition-colors">
                      <div className="text-offwhite font-heading">Services</div>
                      <div className="text-offwhite/50 text-sm">Manage pricing</div>
                    </Link>
                    <Link to="/superadmin/reports" className="block p-4 bg-offwhite/5 border border-offwhite/20 rounded-lg hover:bg-offwhite/10 transition-colors">
                      <div className="text-offwhite font-heading">View Reports</div>
                      <div className="text-offwhite/50 text-sm">Analytics and insights</div>
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'services' && <ServicesManager />}

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

function ServicesManager() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', duration_minutes: '', category: 'Nails', is_addon: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchServices(); }, []);

  const fetchServices = async () => {
    setLoading(true);
    const { data } = await supabase.from('services').select('*').order('category').order('name');
    if (data) setServices(data);
    setLoading(false);
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', price: '', duration_minutes: '', category: 'Nails', is_addon: false });
    setShowForm(true);
  };

  const openEdit = (svc) => {
    setEditing(svc.id);
    setForm({ name: svc.name, price: String(svc.price || ''), duration_minutes: String(svc.duration_minutes || ''), category: svc.category || 'Nails', is_addon: svc.is_addon || false });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    setSaving(true);
    const payload = { name: form.name, price: parseFloat(form.price), duration_minutes: parseInt(form.duration_minutes) || 0, category: form.category, is_addon: form.is_addon };
    if (editing) {
      await supabase.from('services').update(payload).eq('id', editing);
    } else {
      await supabase.from('services').insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    fetchServices();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this service? This cannot be undone.')) return;
    await supabase.from('services').delete().eq('id', id);
    fetchServices();
  };

  if (loading) return <div className="text-offwhite/40 text-center py-12">Loading services...</div>;

  return (
    <div className="bg-offwhite/5 border border-gold/20 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-xl text-offwhite">Services Management</h2>
        <button onClick={openAdd} className="px-4 py-2 bg-gold text-charcoal rounded-lg hover:bg-gold/90 transition-colors">+ Add Service</button>
      </div>

      {showForm && (
        <div className="mb-6 p-4 bg-offwhite/10 rounded-xl border border-gold/30">
          <h3 className="text-gold font-heading mb-4">{editing ? 'Edit Service' : 'Add Service'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-offwhite/60 text-xs mb-1">Name</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg text-sm" placeholder="Service name" />
            </div>
            <div>
              <label className="block text-offwhite/60 text-xs mb-1">Price</label>
              <input type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full px-3 py-2 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg text-sm" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-offwhite/60 text-xs mb-1">Duration (min)</label>
              <input type="number" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: e.target.value})} className="w-full px-3 py-2 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg text-sm" placeholder="60" />
            </div>
            <div>
              <label className="block text-offwhite/60 text-xs mb-1">Category</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-3 py-2 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg text-sm">
                <option value="Nails">Nails</option>
                <option value="Pedicure">Pedicure</option>
                <option value="Waxing">Waxing</option>
                <option value="Lashes">Lashes</option>
                <option value="Brows">Brows</option>
                <option value="Packages">Packages</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_addon} onChange={e => setForm({...form, is_addon: e.target.checked})} className="accent-gold" />
                <span className="text-offwhite/60 text-sm">Add-on</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving || !form.name || !form.price} className="px-6 py-2 bg-gold text-charcoal rounded-lg hover:bg-gold/90 disabled:opacity-50 transition-colors">{saving ? 'Saving...' : 'Save'}</button>
            <button onClick={() => setShowForm(false)} className="px-6 py-2 border border-offwhite/30 text-offwhite/60 hover:text-offwhite rounded-lg transition-colors">Cancel</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-offwhite/50 text-sm border-b border-offwhite/10">
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Category</th>
              <th className="text-left py-3 px-4">Price</th>
              <th className="text-left py-3 px-4">Duration</th>
              <th className="text-left py-3 px-4">Type</th>
              <th className="text-left py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.map(svc => (
              <tr key={svc.id} className="border-b border-offwhite/5 hover:bg-offwhite/5">
                <td className="py-3 px-4 text-offwhite font-medium">{svc.name}</td>
                <td className="py-3 px-4 text-offwhite/60">{svc.category || '—'}</td>
                <td className="py-3 px-4 text-gold">${parseFloat(svc.price).toFixed(2)}</td>
                <td className="py-3 px-4 text-offwhite/60">{svc.duration_minutes || svc.duration || 0} min</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 text-xs rounded ${svc.is_addon ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {svc.is_addon ? 'Add-on' : 'Main'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => openEdit(svc)} className="text-gold hover:underline text-sm">Edit</button>
                    <button onClick={() => handleDelete(svc.id)} className="text-red-400 hover:underline text-sm">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr><td colSpan="6" className="py-8 text-center text-offwhite/40">No services found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}