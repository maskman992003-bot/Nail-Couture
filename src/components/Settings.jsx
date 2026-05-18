import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinMode, setPinMode] = useState('set');
  const [pinStep, setPinStep] = useState(1);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSaving, setPinSaving] = useState(false);

  const handleNavigate = (page) => {
    if (page === 'home') navigate('/');
  };

  const openPinModal = (mode) => {
    setPinMode(mode);
    setPinStep(1);
    setOldPin('');
    setNewPin('');
    setConfirmPin('');
    setPinError('');
    setShowPinModal(true);
  };

  const handlePinDigit = (setter, current, digit) => {
    if (current.length < 4 && /^\d$/.test(digit)) {
      setter(current + digit);
    }
  };

  const handlePinBackspace = (setter, current) => {
    setter(current.slice(0, -1));
  };

  const handlePinStep1 = async () => {
    if (oldPin.length !== 4) {
      setPinError('Enter your current 4-digit PIN');
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('pin')
      .eq('id', profile.id)
      .single();
    if (!data?.pin || data.pin !== oldPin) {
      setPinError('Incorrect current PIN');
      return;
    }
    setPinError('');
    setPinStep(2);
  };

  const handlePinStep2 = () => {
    if (newPin.length !== 4) {
      setPinError('Enter a 4-digit PIN');
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      setPinError('PIN must be 4 numbers only');
      return;
    }
    setPinError('');
    setPinStep(3);
  };

  const handlePinStep3 = async () => {
    if (confirmPin !== newPin) {
      setPinError('PINs do not match');
      return;
    }
    setPinSaving(true);
    setPinError('');
    const { error } = await supabase
      .from('profiles')
      .update({ pin: newPin })
      .eq('id', profile.id);
    setPinSaving(false);
    if (error) {
      setPinError('Failed to update PIN. Try again.');
      return;
    }
    const updated = { ...profile, pin: newPin };
    localStorage.setItem('salon_user_data', JSON.stringify(updated));
    setShowPinModal(false);
    alert(pinMode === 'set' ? 'PIN set successfully!' : 'PIN changed successfully!');
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
      <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  const displayName = profile?.full_name || profile?.email || 'Staff Member';
  const initials = displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
      <Sidebar />
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

            <div className="pt-4 border-t border-offwhite/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-offwhite font-heading text-base">PIN Login</p>
                  <p className="text-offwhite/40 text-sm">
                    {profile?.pin ? 'Change your login PIN' : 'Set a 4-digit PIN for quick login'}
                  </p>
                </div>
<button
                    onClick={() => openPinModal(profile?.pin ? 'change' : 'set')}
                    className="flex items-center gap-2 bg-gold/10 border border-gold/30 text-gold px-4 py-2 rounded-lg hover:bg-gold/20 transition-colors text-sm font-heading"
                  >
                    {profile?.pin ? 'Change PIN' : 'Set PIN'}
                  </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-offwhite/40 text-sm">
            Contact your administrator to update account information.
          </p>
        </div>
      </div>

      {showPinModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4" onClick={() => setShowPinModal(false)}>
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-sm relative" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading text-xl text-gold mb-1">
              {pinMode === 'set' ? 'Set PIN' : 'Change PIN'}
            </h3>
            <p className="text-offwhite/50 text-sm mb-6">
              {pinStep === 1 && 'Enter your current PIN'}
              {pinStep === 2 && 'Enter a new 4-digit PIN'}
              {pinStep === 3 && 'Confirm your new PIN'}
            </p>

            <div className="flex justify-center gap-4 mb-4">
              {[1, 2, 3, 4].map((i) => {
                const val = pinStep === 1 ? oldPin : pinStep === 2 ? newPin : confirmPin;
                return (
                  <div
                    key={i}
                    className="w-14 h-14 rounded-xl bg-[#0B0B0C] border border-offwhite/20 flex items-center justify-center text-2xl font-heading"
                  >
                    {val[i - 1] ? '\u25CF' : ''}
                  </div>
                );
              })}
            </div>

            {pinError && <p className="text-red-400 text-sm text-center mb-4">{pinError}</p>}

            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key, idx) => {
                if (key === '') {
                  return <div key={idx} className="h-12" />;
                }
                if (key === '⌫') {
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (pinStep === 1) handlePinBackspace(setOldPin, oldPin);
                        else if (pinStep === 2) handlePinBackspace(setNewPin, newPin);
                        else handlePinBackspace(setConfirmPin, confirmPin);
                      }}
                      className="h-12 bg-[#0B0B0C] rounded-xl text-offwhite hover:bg-white/10 transition-colors text-lg"
                    >{key}</button>
                  );
                }
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (pinStep === 1) handlePinDigit(setOldPin, oldPin, key);
                      else if (pinStep === 2) handlePinDigit(setNewPin, newPin, key);
                      else handlePinDigit(setConfirmPin, confirmPin, key);
                    }}
                    className="h-12 bg-[#0B0B0C] rounded-xl text-offwhite hover:bg-white/10 transition-colors text-xl font-heading"
                  >{key}</button>
                );
              })}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowPinModal(false); setPinStep(1); }}
                className="flex-1 py-3 rounded-xl border border-offwhite/20 text-offwhite hover:bg-white/5 transition-colors text-sm"
              >Cancel</button>
              <button
                onClick={() => {
                  if (pinStep === 1) handlePinStep1();
                  else if (pinStep === 2) handlePinStep2();
                  else handlePinStep3();
                }}
                disabled={pinSaving}
                className="flex-1 py-3 rounded-xl bg-gold text-[#0B0B0C] font-heading text-sm hover:bg-gold/90 transition-colors disabled:opacity-50"
              >
                {pinSaving ? 'Saving...' : pinStep === 3 ? 'Confirm' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}