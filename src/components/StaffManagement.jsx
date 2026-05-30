import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

export default function StaffManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ full_name: '', email: '', phone: '', role: 'technician' });
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!['admin', 'super_admin', 'owner', 'partner'].includes(user.role)) {
      navigate(user.role === 'technician' ? '/technician' : '/portal');
      return;
    }
    fetchStaff();
  }, [user, navigate]);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'cashier', 'technician'])
        .order('full_name', { ascending: true });

      if (error) throw error;
      setStaff(data || []);
    } catch (err) {
      console.error('Staff Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!addForm.full_name || !addForm.phone) {
      setAddError('Name and phone number are required');
      return;
    }

    setAddLoading(true);
    setAddError('');

    try {
      const cleanPhone = addForm.phone.replace(/\D/g, '');
      const { error } = await supabase.from('profiles').insert({
        full_name: addForm.full_name,
        email: addForm.email || null,
        phone: cleanPhone,
        role: addForm.role,
      });

      if (error) throw error;

      setShowAddModal(false);
      setAddForm({ full_name: '', email: '', phone: '', role: 'technician' });
      fetchStaff();
    } catch (err) {
      setAddError(err.message || 'Failed to add staff member');
    } finally {
      setAddLoading(false);
    }
  };

  const filteredStaff = staff.filter((member) => {
    const search = searchTerm.toLowerCase();
    return (
      (member.full_name || '').toLowerCase().includes(search) ||
      (member.email || '').toLowerCase().includes(search) ||
      (member.phone || '').includes(search)
    );
  });

const getStaffPath = (role) => {
  switch (role) {
    case 'super_admin': return '/superadmin/staff';
    case 'owner': return '/owner/staff';
    case 'partner': return '/partner/staff';
    case 'admin': return '/admin/staff';
    default: return '/admin/staff';
  }
};

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading staff...</div>
        </div>
      </div>
    );
  }

  const staffPath = getStaffPath(user?.role);

  return (
    <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
        <div className="px-4 sm:px-6 lg:px-8 py-6 border-b" style={{ borderColor: 'rgba(197, 160, 89, 0.1)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-3xl text-gold">Staff Management</h1>
              <p className="text-offwhite/60 text-sm mt-1">Manage your team members and roles</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-gold text-charcoal rounded-lg hover:bg-gold/90 transition-colors font-medium"
            >
              + Add Staff
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="rounded-xl p-6 mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(197, 160, 89, 0.1)' }}>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, or phone..."
                  className="w-full p-3 bg-offwhite/10 border border-offwhite/20 text-offwhite focus:border-gold focus:outline-none rounded-lg"
                />
              </div>
              <div className="flex items-center px-6 py-3 rounded-lg" style={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="font-heading text-2xl text-gold mr-3">{staff.length}</div>
                <div className="text-xs text-offwhite/60">Total Staff</div>
              </div>
            </div>
          </div>

          {filteredStaff.length === 0 ? (
            <div className="rounded-xl p-12 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="text-offwhite/40 text-4xl mb-4">&#128100;</div>
              <h2 className="font-heading text-2xl text-offwhite mb-2">No Staff Found</h2>
              <p className="text-offwhite/50">
                {searchTerm ? 'No staff match your search criteria.' : 'No staff members found in the system.'}
              </p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="text-offwhite/50 text-sm border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    <tr>
                      <th className="px-6 py-4 text-left font-medium">Name</th>
                      <th className="px-6 py-4 text-left font-medium">Contact</th>
                      <th className="px-6 py-4 text-left font-medium">Role</th>
                      <th className="px-6 py-4 text-center font-medium">Status</th>
                      <th className="px-6 py-4 text-center font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map((member) => (
                      <tr key={member.id} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center">
                              <span className="text-gold font-heading">
                                {(member.full_name || '??').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <div className="text-offwhite font-medium">{member.full_name || 'Unknown'}</div>
                              {member.email && <div className="text-xs text-offwhite/40">{member.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-offwhite/80">{member.email || 'No email'}</div>
                          <div className="text-xs text-offwhite/40">{member.phone || 'No phone'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-xs border rounded-full ${roleColors[member.role] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                            {roleLabels[member.role] || member.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 text-sm text-green-400">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Active
                          </span>
                        </td>
                          <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-3">
                                <Link to={`${staffPath}/${member.id}/schedule`} className="text-blue-400 hover:underline text-sm">
                                  Schedule
                                </Link>
                                <Link to={`${staffPath}/${member.id}`} className="text-gold hover:underline text-sm">
                                  Edit
                                </Link>
                              </div>
                            </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
          <div className="w-full max-w-md rounded-xl p-6" style={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(197, 160, 89, 0.2)' }}>
            <h2 className="font-heading text-2xl text-gold mb-6">Add New Staff</h2>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="text-offwhite/50 text-xs uppercase tracking-wider block mb-2">Full Name *</label>
                <input
                  type="text"
                  value={addForm.full_name}
                  onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                  placeholder="Enter full name"
                  className="w-full p-3 bg-offwhite/10 border border-offwhite/20 text-offwhite focus:border-gold focus:outline-none rounded-lg"
                />
              </div>
              <div>
                <label className="text-offwhite/50 text-xs uppercase tracking-wider block mb-2">Email</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="Enter email (optional)"
                  className="w-full p-3 bg-offwhite/10 border border-offwhite/20 text-offwhite focus:border-gold focus:outline-none rounded-lg"
                />
              </div>
              <div>
                <label className="text-offwhite/50 text-xs uppercase tracking-wider block mb-2">Phone Number *</label>
                <input
                  type="tel"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  placeholder="Enter phone number"
                  className="w-full p-3 bg-offwhite/10 border border-offwhite/20 text-offwhite focus:border-gold focus:outline-none rounded-lg"
                />
              </div>
              <div>
                <label className="text-offwhite/50 text-xs uppercase tracking-wider block mb-2">Role</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                  className="w-full p-3 bg-offwhite/10 border border-offwhite/20 text-offwhite focus:border-gold focus:outline-none rounded-lg"
                >
                  <option value="technician">Technician</option>
                  <option value="cashier">Cashier</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {addError && <p className="text-red-400 text-sm">{addError}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setAddError(''); }}
                  className="flex-1 py-3 bg-offwhite/10 text-offwhite rounded-lg hover:bg-offwhite/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 py-3 bg-gold text-charcoal rounded-lg hover:bg-gold/90 transition-colors font-medium disabled:opacity-50"
                >
                  {addLoading ? 'Adding...' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}