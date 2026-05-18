import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const getHomePath = (role) => {
  switch (role) {
    case 'super_admin':
    case 'owner':
    case 'partner': return '/superadmin';
    case 'admin': return '/admin';
    case 'cashier': return '/cashier';
    case 'technician': return '/technician';
    case 'customer': return '/portal';
    default: return '/portal';
  }
};

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

  const handlePinDigit = (digit) => {
    if (pinInput.length < 4 && /^\d$/.test(digit)) {
      setPinInput(pinInput + digit);
      setPinError('');
    }
  };

  const handlePinBackspace = () => {
    setPinInput(pinInput.slice(0, -1));
    setPinError('');
  };

  const handlePinVerify = async () => {
    if (pinInput.length !== 4) {
      setPinError('Enter your 4-digit PIN');
      return;
    }
    setPinLoading(true);
    setPinError('');

    try {
      const { data } = await supabase
        .from('profiles')
        .select('pin')
        .eq('id', profile.id)
        .single();

      if (data?.pin && data.pin === pinInput) {
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

  const doLogin = (profileData) => {
    login(profileData);
    const isStaff = profileData.role && ['super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician'].includes(profileData.role);
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
        .eq('phone_number', cleanPhone)
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-heading text-xl text-gold mb-1 text-center">
              Welcome back
            </h3>
            <p className="text-offwhite/60 text-sm mb-6 text-center">
              {profile?.full_name ? `Hello, ${profile.full_name.split(' ')[0]}` : 'Enter your PIN to continue'}
            </p>

            <div className="flex justify-center gap-4 mb-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-14 h-14 rounded-xl bg-[#0B0B0C] border border-offwhite/20 flex items-center justify-center text-2xl font-heading"
                >
                  <span className={pinInput[i - 1] ? 'text-white' : 'text-transparent'}>●</span>
                </div>
              ))}
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
                      type="button"
                      onClick={handlePinBackspace}
                      className="h-12 bg-[#0B0B0C] rounded-xl text-offwhite hover:bg-white/10 transition-colors text-lg"
                    >{key}</button>
                  );
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePinDigit(key)}
                    className="h-12 bg-[#0B0B0C] rounded-xl text-offwhite hover:bg-white/10 transition-colors text-xl font-heading"
                  >{key}</button>
                );
              })}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={handlePinCancel}
                className="flex-1 py-3 rounded-xl border border-offwhite/20 text-offwhite hover:bg-white/5 transition-colors text-sm"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handlePinVerify}
                disabled={pinLoading || pinInput.length !== 4}
                className="flex-1 py-3 rounded-xl bg-gold text-[#0B0B0C] font-heading text-sm hover:bg-gold/90 transition-colors disabled:opacity-40"
              >
                {pinLoading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}