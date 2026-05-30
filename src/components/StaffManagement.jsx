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
  const [addForm, setAddForm] = useState({ phone: '', full_name: '', role: 'technician' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!['admin', 'super_admin', 'owner', 'partner'].includes(user.role)) {
      navigate('/portal');
      return;
    }
    fetchStaff();
  }, [user, navigate]);

  const fetchStaff = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['admin', 'cashier', 'technician', 'owner', 'partner'])
      .order('full_name');
    if (data) setStaff(data);
    setLoading(false);
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setAddError('');
    if (!addForm.phone || !addForm.full_name) {
      setAddError('Please fill out all fields');
      return;
    }

    let cleanPhone = addForm.phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) cleanPhone = '1' + cleanPhone;
    if (cleanPhone.length !== 11) {
      setAddError('Please enter a valid 10 or 11 digit US phone number');
      return;
    }
    const formattedPhone = `+${cleanPhone}`;

    setAddLoading(true);
    try {
      const { error } = await supabase.rpc('add_staff_member', {
        p_phone: formattedPhone,
        p_full_name: addForm.full_name,
        p_role: addForm.role,
        p_admin_phone: user.phone
      });

      if (error) throw error;

      setShowAddModal(false);
      setAddForm({ phone: '', full_name: '', role: 'technician' });
      fetchStaff();
    } catch (err) {
      setAddError(err.message || 'Failed to add staff member');
    } finally {
      setAddLoading(false);
    }
  };

  const filteredStaff = staff.filter(member => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      (member.full_name || '').toLowerCase().includes(term) ||
      (member.phone || '').toLowerCase().includes(term) ||
      (roleLabels[member.role] || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
      <Sidebar />
      <style>{`.staff-mgmt select, .staff-mgmt option { background: #1a1a1a; color: #fff; }`}</style>

      <div className="staff-mgmt p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gold/10 pb-6 mb-6">
          <div>
            <h1 className="font-heading text-3xl text-gold tracking-wide">Staff Management</h1>
            <p className="text-xs text-offwhite/40 mt-1">Register salon team members and view access tier permissions</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-gold text-charcoal rounded-xl hover:bg-gold/90 transition-all font-medium text-sm shadow-lg shadow-gold/10 self-start sm:self-auto"
          >
            + Add Staff Member
          </button>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search staff by name, phone, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md px-4 py-2.5 bg-offwhite/5 border border-white/10 text-offwhite rounded-xl focus:border-gold focus:outline-none text-sm placeholder-offwhite/30"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-gold animate-pulse tracking-widest text-sm">LOADING TEAM DIRECTORY...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStaff.map((member) => (
              <div
                key={member.id}
                className="bg-offwhite/5 border border-white/5 rounded-2xl p-5 flex flex-col justify-between hover:border-gold/20 transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center font-heading text-gold text-sm uppercase shrink-0">
                        {(member.full_name || '??').split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-offwhite font-medium text-base truncate group-hover:text-gold transition-colors">{member.full_name}</h3>
                        <p className="text-offwhite/40 text-xs mt-0.5">{member.phone}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border shrink-0 ${roleColors[member.role] || 'bg-gray-900 text-gray-400 border-gray-700'}`}>
                      {roleLabels[member.role] || member.role}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                  <span className="text-[11px] text-offwhite/30">
                    Registered {member.created_at ? new Date(member.created_at).toLocaleDateString() : '—'}
                  </span>
                  <div className="flex items-center gap-3">
                    {member.role !== 'owner' && (
                      <Link
                        to={`/${user.role}/staff/schedule?staff=${member.id}`}
                        className="text-gold text-xs font-medium hover:underline flex items-center gap-1"
                      >
                        Schedule →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredStaff.length === 0 && (
              <div className="col-span-full text-center py-12 bg-offwhite/5 border border-white/5 rounded-2xl">
                <p className="text-offwhite/40 text-sm">No matching team members found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm" onClick={() => { setShowAddModal(false); setAddError(''); }}>
          <form
            className="w-full max-w-md h-[85vh] sm:h-auto sm:max-h-[90vh] flex flex-col bg-[#1a1a1a] rounded-t-2xl sm:rounded-xl overflow-hidden mx-0 sm:mx-4 border border-gold/10 shadow-2xl"
            style={{ border: '1px solid rgba(197, 160, 89, 0.2)' }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleAddStaff}
          >
            <div className="flex items-center justify-between gap-4 p-4 sm:p-6 border-b border-gold/10 shrink-0">
              <div>
                <h2 className="font-heading text-xl text-gold mb-0">Add Staff Member</h2>
                <p className="text-offwhite/40 text-xs mt-1">Create authorization for a team role</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setAddError(''); }}
                className="text-offwhite/40 hover:text-offwhite text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div>
                <label className="text-offwhite/50 text-xs uppercase tracking-wider block mb-2">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={addForm.full_name}
                  onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                  className="w-full p-3 bg-offwhite/10 border border-offwhite/20 text-offwhite focus:border-gold focus:outline-none rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="text-offwhite/50 text-xs uppercase tracking-wider block mb-2">Mobile Phone Number</label>
                <input
                  type="tel"
                  placeholder="(555) 000-0000"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  className="w-full p-3 bg-offwhite/10 border border-offwhite/20 text-offwhite focus:border-gold focus:outline-none rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="text-offwhite/50 text-xs uppercase tracking-wider block mb-2">Role</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                  className="w-full p-3 bg-offwhite/10 border border-offwhite/20 text-offwhite focus:border-gold focus:outline-none rounded-lg text-sm"
                >
                  <option value="technician">Technician</option>
                  <option value="cashier">Cashier</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {addError && <p className="text-red-400 text-xs text-center">{addError}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setAddError(''); }}
                  className="flex-1 py-3 bg-[#0B0B0C] text-offwhite text-sm rounded-xl hover:bg-white/10 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 py-3 bg-gold text-charcoal text-sm rounded-xl hover:bg-gold/90 transition-colors font-medium shadow-lg shadow-gold/20 disabled:opacity-50"
                >
                  {addLoading ? 'Adding...' : 'Add Staff'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}