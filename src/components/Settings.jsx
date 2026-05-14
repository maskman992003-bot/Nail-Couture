import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from './Navbar';
import StaffNav from './StaffNav';

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const handleNavigate = (page) => {
    if (page === 'home') navigate('/');
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const storedUser = localStorage.getItem('salon_user_data');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setProfile(userData);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex" style={{ backgroundColor: '#0a0a0a' }}>
        <StaffNav />
        <div className="flex-1 overflow-x-hidden">
          <Navbar currentPage="admin" onNavigate={handleNavigate} />
          <div className="flex items-center justify-center py-20 px-6">
            <div className="text-gold animate-pulse">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  const displayName = profile?.full_name || profile?.email || 'Staff Member';
  const initials = displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0a0a0a' }}>
      <StaffNav />
      <div className="flex-1 overflow-x-hidden">
        <Navbar currentPage="admin" onNavigate={handleNavigate} />
        <div className="max-w-2xl mx-auto px-6 py-8 pb-24 lg:pb-8">
          <div className="mb-8">
            <h1 className="font-heading text-3xl text-gold mb-2">Account Settings</h1>
            <p className="text-offwhite/60">View your account information</p>
          </div>

          <div className="rounded-xl p-6" style={{ backgroundColor: '#1a1a1a' }}>
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-offwhite/10">
              <div className="w-16 h-16 bg-gold/20 rounded-full flex items-center justify-center">
                <span className="text-gold font-heading text-2xl">{initials || '??'}</span>
              </div>
              <div>
                <h2 className="text-offwhite font-heading text-xl">{displayName}</h2>
                <p className="text-offwhite/50 text-sm">{profile?.email || 'No email'}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-offwhite/40 text-xs uppercase tracking-wider block mb-2">Email</label>
                <p className="text-offwhite text-lg">{profile?.email || 'Not set'}</p>
              </div>

              <div>
                <label className="text-offwhite/40 text-xs uppercase tracking-wider block mb-2">Role</label>
                <div className="mt-1">
                  <span className="inline-block px-4 py-2 bg-gold/20 text-gold border border-gold/30 rounded-full text-sm font-heading">
                    {profile?.role ? profile.role.replace('_', ' ').toUpperCase() : 'STAFF'}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-offwhite/40 text-xs uppercase tracking-wider block mb-2">Access Level</label>
                <p className="text-offwhite">
                  {profile?.is_staff ? 'Staff Member' : 'Client'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-offwhite/40 text-sm">
              Contact your administrator to update account information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}