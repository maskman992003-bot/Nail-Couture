import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getHomePath, isCheckInRole } from '@nail-couture/shared/utils/routes';
import { verifyKioskPin } from '@nail-couture/shared/constants/kiosk';
import { CLIENT_LOGIN_PHONE_NOT_FOUND_MESSAGE } from '@nail-couture/shared/constants/clientAuth';
import { claimPendingGiftCards } from '@nail-couture/shared/utils/giftCards';
import { useTheme } from '../contexts/ThemeContext';
import { useReloadPageRefresh } from '../hooks/useReloadPageRefresh';
import BrandLogo from './BrandLogo.jsx';
import KioskPinKeypad from './KioskPinKeypad.jsx';

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
  const { user, login } = useAuth();
  const { theme, themeConfig } = useTheme();

  useReloadPageRefresh();

  useEffect(() => {
    if (user && isCheckInRole(user.role)) {
      navigate('/check-in', { replace: true });
    }
  }, [user, navigate]);

  const cardClass = theme === 'dark'
    ? 'bg-[#111] border border-gold/20 rounded-2xl p-8 shadow-xl'
    : 'bg-white border border-gold/30 rounded-2xl p-8 shadow-xl';

  const inputClass = theme === 'dark'
    ? 'w-full px-4 py-3 rounded-lg bg-offwhite/10 border border-offwhite/20 text-offwhite placeholder-offwhite/30 focus:outline-none focus:border-gold transition-colors'
    : 'w-full px-4 py-3 rounded-lg bg-charcoal/5 border border-charcoal/10 text-charcoal placeholder-charcoal/30 focus:outline-none focus:border-gold transition-colors';

  const labelClass = `text-xs tracking-wider uppercase block mb-2 ${theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50'}`;

  const btnPrimaryClass = 'w-full py-3 rounded-full bg-gold text-charcoal text-sm font-heading uppercase tracking-[0.24em] hover:bg-gold/90 transition-all disabled:opacity-50 shadow-[0_0_40px_rgba(197,160,89,0.18)]';

  const subtitleClass = theme === 'dark' ? 'text-offwhite/60 mt-2' : 'text-charcoal/60 mt-2';

  const linkMutedClass = theme === 'dark' ? 'text-offwhite/50 hover:text-offwhite' : 'text-charcoal/50 hover:text-charcoal';

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
      const success = await verifyKioskPin(supabase, profile.id, pin);
      if (success) {
        doLogin(profile);
      } else {
        setPinError('Incorrect PIN. Please try again.');
        setPinInput('');
      }
    } catch {
      setPinError('Verification failed. Please try again.');
      setPinInput('');
    } finally {
      setPinLoading(false);
    }
  };

  const handlePinBackspace = () => {
    setPinInput(pinInput.slice(0, -1));
    setPinError('');
  };

  const doLogin = (profileData) => {
    if (profileData?.role === 'customer' && profileData?.id) {
      claimPendingGiftCards(profileData.id).catch(() => {});
    }
    login(profileData);
    navigate(getHomePath(profileData.role || 'customer'));
  };

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (phone.length !== 10) {
      setError('Please enter a 10-digit phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cleanPhone = phone;
       const { data, error: profileError } = await supabase
         .from('profiles')
         .select('*')
         .eq('phone', cleanPhone)
         .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (!data) {
        setError(CLIENT_LOGIN_PHONE_NOT_FOUND_MESSAGE);
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

  if (step === 'pin' && isCheckInRole(profile?.role)) {
    return (
      <KioskPinKeypad
        title="KIOSK LOGIN"
        subtitle="Enter your 4-digit PIN"
        onVerify={(pin) => verifyKioskPin(supabase, profile.id, pin)}
        onSuccess={() => doLogin(profile)}
        onCancel={handlePinCancel}
      />
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${theme === 'dark' ? 'bg-charcoal' : 'bg-cream'}`}>
      <div className="w-full max-w-md">
        <div className={cardClass}>
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex justify-center">
              <div
                className="flex items-center justify-center rounded-full p-1.5"
                style={{ boxShadow: `0 0 0 1px ${themeConfig.borderColor}` }}
              >
                <BrandLogo className="h-28 w-28" />
              </div>
            </Link>
            <p className={subtitleClass}>Client Portal Login</p>
          </div>

          {step === 'phone' && (
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className={labelClass}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="10-digit phone number"
                  className={inputClass}
                />
                {error && <p className={theme === 'dark' ? 'text-red-400 text-sm mt-2' : 'text-red-500 text-sm mt-2'}>{error}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className={btnPrimaryClass}
              >
                {loading ? 'Verifying...' : 'Login'}
              </button>
            </form>
          )}
        </div>

        {step === 'phone' && (
          <>
            <div className="mt-6 text-center">
              <span className={`text-sm ${theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50'}`}>New customer? </span>
              <Link to="/register" className="text-sm text-gold hover:text-gold/80 font-medium">
                Register here
              </Link>
            </div>

            <div className="mt-4 text-center">
              <Link to="/" className={`text-sm ${linkMutedClass}`}>
                ← Back to Home
              </Link>
            </div>
          </>
        )}
      </div>

      {step === 'pin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className={`w-full max-w-sm flex flex-col max-h-[min(90dvh,calc(100dvh-2rem))] rounded-2xl overflow-hidden mx-0 sm:mx-4 border shadow-2xl ${theme === 'dark' ? 'bg-[#1a1a1a] border-gold/20' : 'bg-white border-gold/30'}`}>
            <div className={`p-4 sm:p-6 border-b ${theme === 'dark' ? 'border-gold/10' : 'border-gold/20'}`}>
              <div className="text-center mb-2">
                <h3 className={`font-heading text-2xl mb-2 ${theme === 'dark' ? 'text-offwhite' : 'text-charcoal'}`}>
                  {profile?.full_name ? `Hello, ${profile.full_name.split(' ')[0]}` : 'Enter PIN'}
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50'}`}>Enter your 4-digit PIN</p>
              </div>
            </div>

            <div className="flex justify-center gap-5 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                    pinLoading 
                      ? `${theme === 'dark' ? 'bg-white/30' : 'bg-charcoal/30'} animate-pulse` 
                      : pinInput[i - 1] 
                        ? 'bg-gold scale-110 shadow-[0_0_12px_rgba(197,160,89,0.5)]' 
                        : theme === 'dark' ? 'bg-white/30' : 'bg-charcoal/30'
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
                      className={`h-16 flex items-center justify-center transition-colors ${theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-charcoal/60 hover:text-charcoal'}`}
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
                    className={`h-16 rounded-full text-2xl font-light transition-all active:scale-95 ${theme === 'dark' ? 'bg-white/10 text-white hover:bg-white/20 active:bg-white/30' : 'bg-charcoal/10 text-charcoal hover:bg-charcoal/20 active:bg-charcoal/30'}`}
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
                className={`w-full py-4 text-sm transition-colors ${theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-charcoal/60 hover:text-charcoal'}`}
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
