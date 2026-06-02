import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Sidebar from './Sidebar';
import AppModal, {
  modalLabelClass,
  modalInputClass,
  modalSelectClass,
  modalBtnSecondary,
  modalBtnPrimary,
} from './AppModal';
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

export default function StaffManagement() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ phone: '', full_name: '', role: 'technician' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  const roleColors = theme === 'dark' ? roleColorsDark : roleColorsLight;

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

  const containerClass = clsx(
    'min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64',
    theme === 'dark' ? 'bg-[#0B0B0C] text-white' : 'bg-white text-charcoal'
  );

  const headerBorderClass = clsx(
    'flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6 mb-6',
    theme === 'dark' ? 'border-gold/10' : 'border-gold/30'
  );

  const subtextClass = clsx(
    'text-xs mt-1',
    theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40'
  );

  const searchInputClass = clsx(
    'w-full max-w-md px-4 py-2.5 border rounded-xl focus:border-gold focus:outline-none text-sm',
    theme === 'dark'
      ? 'bg-offwhite/5 border-white/10 text-offwhite placeholder-offwhite/30'
      : 'bg-charcoal/5 border-charcoal/10 text-charcoal placeholder-charcoal/30'
  );

  const staffCardClass = clsx(
    'border rounded-2xl p-5 flex flex-col justify-between hover:border-gold/20 transition-all group',
    theme === 'dark' ? 'bg-offwhite/5 border-white/5' : 'bg-charcoal/5 border-charcoal/5'
  );

  const staffNameClass = clsx(
    'font-medium text-base truncate group-hover:text-gold transition-colors',
    theme === 'dark' ? 'text-offwhite' : 'text-charcoal'
  );

  const emptyStateClass = clsx(
    'col-span-full text-center py-12 border rounded-2xl',
    theme === 'dark' ? 'bg-offwhite/5 border-white/5' : 'bg-charcoal/5 border-charcoal/5'
  );

  return (
    <div className={containerClass}>
      <Sidebar />
      <style>{`.staff-mgmt select, .staff-mgmt option { ${theme === 'dark' ? 'background: #1a1a1a; color: #fff;' : 'background: #fff; color: #1a1a1a;'} }`}</style>

      <div className="staff-mgmt p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl mx-auto">
        <div className={headerBorderClass}>
          <div>
            <h1 className="font-heading text-3xl text-gold tracking-wide">Staff Management</h1>
            <p className={subtextClass}>Register salon team members and view access tier permissions</p>
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
            className={searchInputClass}
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-gold animate-pulse tracking-widest text-sm">LOADING TEAM DIRECTORY...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStaff.map((member) => (
              <div
                key={member.id}
                className={staffCardClass}
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center font-heading text-gold text-sm uppercase shrink-0">
                        {(member.full_name || '??').split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <h3 className={staffNameClass}>{member.full_name}</h3>
                        <p className={subtextClass}>{member.phone}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border shrink-0 ${roleColors[member.role] || (theme === 'dark' ? 'bg-gray-900 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-600 border-gray-300')}`}>
                      {roleLabels[member.role] || member.role}
                    </span>
                  </div>
                </div>

                <div className={clsx('flex items-center justify-between border-t pt-4 mt-2', theme === 'dark' ? 'border-white/5' : 'border-charcoal/5')}>
                  <span className={subtextClass}>
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
              <div className={emptyStateClass}>
                <p className={subtextClass}>No matching team members found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <AppModal
          open
          onClose={() => { setShowAddModal(false); setAddError(''); }}
          title="Add Staff Member"
          subtitle="Create authorization for a team role"
          maxWidth="max-w-md"
          zIndex="z-50"
          footer={
            <>
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setAddError(''); }}
                className={modalBtnSecondary}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-staff-form"
                disabled={addLoading}
                className={modalBtnPrimary}
              >
                {addLoading ? 'Adding...' : 'Add Staff'}
              </button>
            </>
          }
        >
          <form id="add-staff-form" onSubmit={handleAddStaff} className="space-y-4">
            <div>
              <label className={modalLabelClass}>Full Name</label>
              <input
                type="text"
                placeholder="e.g. Jane Doe"
                value={addForm.full_name}
                onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                className={modalInputClass}
              />
            </div>
            <div>
              <label className={modalLabelClass}>Mobile Phone Number</label>
              <input
                type="tel"
                placeholder="(555) 000-0000"
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                className={modalInputClass}
              />
            </div>
            <div>
              <label className={modalLabelClass}>Role</label>
              <select
                value={addForm.role}
                onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                className={modalSelectClass}
              >
                <option value="technician">Technician</option>
                <option value="cashier">Cashier</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {addError && <p className="text-red-500 text-xs text-center">{addError}</p>}
          </form>
        </AppModal>
      )}
    </div>
  );
}
