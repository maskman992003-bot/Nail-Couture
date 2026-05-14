import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Navbar from './Navbar';
import StaffNav from './StaffNav';

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
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const handleNavigate = (page) => {
    if (page === 'home') navigate('/');
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_staff', true)
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Staff Fetch Error:', error);
    }

    setStaff(data || []);
    setLoading(false);
  };

  const filteredStaff = staff.filter((member) => {
    const search = searchTerm.toLowerCase();
    const displayName = member.full_name || member.email || '';
    return (
      displayName.toLowerCase().includes(search) ||
      (member.email?.toLowerCase().includes(search) ?? false) ||
      (member.phone_number?.includes(search) ?? false)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex" style={{ backgroundColor: '#0a0a0a' }}>
        <StaffNav />
        <div className="flex-1 overflow-x-hidden">
          <Navbar currentPage="admin" onNavigate={handleNavigate} />
          <div className="flex items-center justify-center py-20 px-6">
            <div className="text-gold animate-pulse">Loading staff...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0a0a0a' }}>
      <StaffNav />
      <div className="flex-1 overflow-x-hidden">
        <Navbar currentPage="admin" onNavigate={handleNavigate} />
        <div className="max-w-7xl mx-auto px-6 py-8 pb-24 lg:pb-8">
          <div className="mb-8">
            <h1 className="font-heading text-3xl text-gold mb-2">Staff Management</h1>
            <p className="text-offwhite/60">Manage your team members and roles</p>
          </div>

          <div className="rounded-xl p-6 mb-8" style={{ backgroundColor: '#1a1a1a' }}>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-offwhite/50 text-xs uppercase tracking-wider block mb-2">
                  Search Staff
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, or phone..."
                  className="w-full p-3 bg-offwhite/10 border border-offwhite/20 text-offwhite focus:border-gold focus:outline-none rounded-lg"
                />
              </div>
              <div className="flex items-end">
                <div className="text-center px-6 py-3 bg-charcoal text-gold rounded-lg">
                  <div className="font-heading text-2xl">{staff.length}</div>
                  <div className="text-xs text-offwhite/60">Total Staff</div>
                </div>
              </div>
            </div>
          </div>

          {filteredStaff.length === 0 ? (
            <div className="rounded-xl p-12 text-center" style={{ backgroundColor: '#1a1a1a' }}>
              <div className="text-6xl mb-4">&#128100;</div>
              <h2 className="font-heading text-2xl text-offwhite mb-2">No Staff Found</h2>
              <p className="text-offwhite/50">
                {searchTerm ? 'No staff match your search criteria.' : 'No staff members found in the system.'}
              </p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1a1a1a' }}>
              <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-charcoal text-offwhite">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-medium">Contact</th>
                    <th className="px-6 py-4 text-left text-sm font-medium">Role</th>
                    <th className="px-6 py-4 text-center text-sm font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-offwhite/10">
                  {filteredStaff.map((member) => {
                    return (
                      <tr
                        key={member.id}
                        className="hover:bg-offwhite/5 transition-colors cursor-pointer"
                        onClick={() => navigate(`/admin/staff/${member.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center">
                              <span className="text-gold font-heading">
                                {(member.full_name || member.email || '??').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <div className="text-offwhite font-medium">{member.full_name || member.email || 'Unknown'}</div>
                              {member.email && member.full_name && (
                                <div className="text-xs text-offwhite/40">{member.email}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-offwhite/80">{member.email || 'No email'}</div>
                          <div className="text-xs text-offwhite/40">{member.phone_number || 'No phone'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-xs border-2 rounded-full ${roleColors[member.role] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                            {roleLabels[member.role] || member.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 text-sm text-green-400">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Active
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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