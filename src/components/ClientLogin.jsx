import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getHomePath, isStaffRole } from '../utils/routes';

export default function ClientLogin() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('phone');
  const [profile, setProfile] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handlePinDigit = async (digit) => {
    if (pinInput.length < 4 && /^\d$/.test(digit)) {
      const newPin = pinInput + digit;
      setPinInput(newPin);
      setPinError('');

      if (newPin.length === 4) {
        await verifyPin(newPin);
      }
    }
  };

  const verifyPin = async (pin) => {
    setPinLoading(true);
    setPinError('');

    try {
      const { data } = await supabase
        .from('profiles')
        .select('pin')
        .eq('id', profile.id)
        .single();

      if (data?.pin && data.pin === pin) {
        doLogin(profile);
      } else {
        setPinError('Incorrect PIN. Please try again.');
        setPinInput('');
      }
    } catch (err) {
      setPinError('Verification failed. Please try again.');
    } finally {
      setPinLoading(false);
    }
  };

  const handlePinBackspace = () => {
    setPinInput(pinInput.slice(0, -1));
    setPinError('');
  };

  const doLogin = (profileData) => {
    login(profileData);
    const isStaff = profileData.role && isStaffRole(profileData.role);
    navigate(isStaff ? getHomePath(profileData.role) : '/portal');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cleanPhone = phone.replace(/\D/g, '');
       const { data, error: profileError } = await supabase
         .from('profiles')
         .select('*')
         .eq('phone', cleanPhone)
         .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (!data) {
        setError('No account found with this phone number. Please check in at the kiosk first.');
        setLoading(false);
        return;
      }

      if (data.pin) {
        setProfile(data);
        setStep('pin');
        setLoading(false);
      } else {
        doLogin(data);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePinCancel = () => {
    setStep('phone');
    setPinInput('');
    setPinError('');
    setProfile(null);
  };

  return (
    <div className="min-h-screen bg-offwhite flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-charcoal/10 p-8">
          <div className="text-center mb-8">
            <Link to="/" className="block">
              <img src="/NC.jpg" alt="Nail Couture" className="h-28 w-auto mx-auto" />
            </Link>
            <p className="text-charcoal/60 mt-2">Client Portal Login</p>
          </div>

          {step === 'phone' && (
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="text-xs text-charcoal/50 tracking-wider uppercase block mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter your phone number"
                  className="w-full p-3 border border-charcoal/10 focus:border-gold focus:outline-none"
                />
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gold text-charcoal py-3 font-heading tracking-wider hover:bg-gold/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Access Portal'}
              </button>
            </form>
          )}
        </div>

        {step === 'phone' && (
          <>
            <div className="mt-6 text-center">
              <span className="text-sm text-charcoal/50">New customer? </span>
              <Link to="/register" className="text-sm text-gold hover:text-gold/80 font-medium">
                Register here
              </Link>
            </div>

            <div className="mt-4 text-center">
              <Link to="/" className="text-sm text-charcoal/50 hover:text-charcoal">
                ← Back to Home
              </Link>
            </div>
          </>
        )}
      </div>

      {step === 'pin' && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <div className="w-full max-w-sm px-4">
            <div className="text-center mb-12">
              <h3 className="font-heading text-2xl text-white mb-2">
                {profile?.full_name ? `Hello, ${profile.full_name.split(' ')[0]}` : 'Enter PIN'}
              </h3>
              <p className="text-white/50 text-sm">Enter your 4-digit PIN</p>
            </div>

            <div className="flex justify-center gap-5 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                    pinLoading 
                      ? 'bg-white/30 animate-pulse' 
                      : pinInput[i - 1] 
                        ? 'bg-gold scale-110 shadow-[0_0_12px_rgba(212,175,55,0.5)]' 
                        : 'bg-white/30'
                  }`}
                />
              ))}
            </div>

            {pinError && <p className="text-red-400 text-sm text-center mb-6">{pinError}</p>}

            <div className="grid grid-cols-3 gap-6 max-w-[280px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'].map((key, idx) => {
                if (key === '') {
                  return <div key={idx} className="h-16" />;
                }
                if (key === 'delete') {
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={handlePinBackspace}
                      className="h-16 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                      </svg>
                    </button>
                  );
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePinDigit(key)}
                    className="h-16 rounded-full bg-white/10 text-white text-2xl font-light hover:bg-white/20 active:bg-white/30 transition-all active:scale-95"
                  >
                    {key}
                  </button>
                );
              })}
            </div>

            <div className="mt-12">
              <button
                type="button"
                onClick={handlePinCancel}
                className="w-full py-4 text-white/60 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}