import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
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
      .from('staff_profiles')
      .select('*')
      .order('full_name');

    if (error) {
      console.error('Error fetching staff:', error);
    }
    setStaff(data || []);
    setLoading(false);
  };

  const filteredStaff = staff.filter((member) => {
    const search = searchTerm.toLowerCase();
    return (
      member.full_name?.toLowerCase().includes(search) ||
      member.email?.toLowerCase().includes(search) ||
      member.phone_number?.includes(search)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-offwhite w-full overflow-x-hidden">
        <Navbar currentPage="admin" onNavigate={handleNavigate} />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading staff...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-offwhite w-full overflow-x-hidden">
      <Navbar currentPage="admin" onNavigate={handleNavigate} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="font-heading text-charcoal text-3xl mb-2">Staff Management</h1>
            <p className="text-charcoal/60">Manage your team members and roles</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="px-4 py-2 border border-charcoal/20 text-charcoal/60 hover:border-charcoal hover:text-charcoal text-sm"
            >
              Back to Admin
            </Link>
          </div>
        </div>

        <div className="bg-white border border-charcoal/10 rounded-xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-xs text-charcoal/50 uppercase tracking-wider block mb-2">
                Search Staff
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or phone..."
                className="w-full p-3 border border-charcoal/10 focus:border-gold focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <div className="text-center px-6 py-3 bg-charcoal text-gold">
                <div className="font-heading text-2xl">{staff.length}</div>
                <div className="text-xs text-offwhite/60">Total Staff</div>
              </div>
            </div>
          </div>
        </div>

        {filteredStaff.length === 0 ? (
          <div className="bg-white border border-charcoal/10 rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">&#128100;</div>
            <h2 className="font-heading text-charcoal text-2xl mb-2">No Staff Found</h2>
            <p className="text-charcoal/60">
              {searchTerm ? 'No staff match your search criteria.' : 'No staff members found in the system.'}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-charcoal/10 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-charcoal text-offwhite">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-medium">Contact</th>
                  <th className="px-6 py-4 text-left text-sm font-medium">Role</th>
                  <th className="px-6 py-4 text-center text-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/10">
                {filteredStaff.map((member) => {
                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-offwhite/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/staff/${member.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center">
                            <span className="text-gold font-heading">
                              {member.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase() || '??'}
                            </span>
                          </div>
                          <div>
                            <div className="text-charcoal font-medium">{member.full_name || 'Unknown'}</div>
                            {member.nail_goal && (
                              <div className="text-xs text-charcoal/50">{member.nail_goal}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-charcoal">{member.email || 'No email'}</div>
                        <div className="text-xs text-charcoal/50">{member.phone_number || 'No phone'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs border-2 rounded-full ${roleColors[member.role] || 'bg-gray-100 text-gray-800'}`}>
                          {roleLabels[member.role] || member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-sm text-green-600">
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
        )}
      </div>
    </div>
  );
}