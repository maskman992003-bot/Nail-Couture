import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useReloadPageRefresh } from '../hooks/useReloadPageRefresh';
import BrandLogo from './BrandLogo.jsx';
import ScrollSelect from './ScrollSelect';
import clsx from 'clsx';
import { claimPendingGiftCards, getGiftCardClaimPreview, maskPhoneForDisplay } from '@nail-couture/shared/utils/giftCards';

const MONTHS = [
  { value: '', label: 'Month' },
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const DAYS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1).padStart(2, '0'),
  label: String(i + 1).padStart(2, '0'),
}));

const REDIRECT_DELAY_SEC = 6;
const REGISTRATION_PENDING_KEY = 'nc_registration_pending';

const Sparkle = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(12)].map((_, i) => (
      <div
        key={i}
        className="absolute w-2 h-2 bg-gold rounded-full animate-ping"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 2}s`,
          animationDuration: `${1 + Math.random()}s`
        }}
      />
    ))}
  </div>
);

const SubmittingOverlay = ({ theme }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/85 backdrop-blur-sm px-6">
    <div className="text-center max-w-xs animate-fade-in">
      <div className="w-14 h-14 border-[3px] border-gold border-t-transparent rounded-full animate-spin mx-auto mb-6" />
      <p className="font-heading text-xl text-gold tracking-wide">Creating your account</p>
      <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-offwhite/60' : 'text-charcoal/60'}`}>
        Setting everything up for you…
      </p>
    </div>
  </div>
);

const RegistrationSuccessScreen = ({
  theme,
  fullName,
  giftClaimCount,
  hasReferralCode,
  redirectSeconds,
  onGoToPortal,
}) => {
  const progress = ((REDIRECT_DELAY_SEC - redirectSeconds) / REDIRECT_DELAY_SEC) * 100;
  const mutedText = theme === 'dark' ? 'text-offwhite/70' : 'text-charcoal/70';

  return (
    <div className={`min-h-[100dvh] w-full overflow-y-auto flex relative ${theme === 'dark' ? 'bg-charcoal' : 'bg-cream'}`}>
      <Sparkle />
      <div className="m-auto w-full max-w-md px-4 py-6 sm:p-8 relative z-10 text-center animate-fade-in shrink-0">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-6 sm:mb-8 ring-2 ring-gold/40">
          <svg className="w-12 h-12 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-gold/80 mb-3">Account created</p>
        <h2 className="font-heading text-3xl sm:text-4xl text-gold mb-4 tracking-wide">Welcome to the Club</h2>
        <p className={`font-heading text-xl sm:text-2xl mb-6 ${theme === 'dark' ? 'text-offwhite' : 'text-charcoal'}`}>{fullName}</p>
        {giftClaimCount > 0 && (
          <p className={`text-xl mb-4 ${mutedText}`}>
            Your <span className="text-gold">gift card{giftClaimCount > 1 ? 's are' : ' is'}</span> in your wallet.
          </p>
        )}
        {hasReferralCode && (
          <p className={`text-xl mb-4 ${mutedText}`}>
            Your <span className="text-gold">50 loyalty points</span> are being added.
          </p>
        )}
        <p className={`text-sm ${mutedText}`}>
          {redirectSeconds > 0
            ? `Taking you to your portal in ${redirectSeconds}s…`
            : 'Opening your portal…'}
        </p>
        <div className="w-56 h-1.5 bg-offwhite/10 rounded-full mx-auto mt-4 overflow-hidden">
          <div
            className="h-full bg-gold transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-8 flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <span className={`text-sm ${mutedText}`}>Preparing your home page</span>
        </div>
        <div className="mt-8 animate-fade-in">
          <button
            type="button"
            onClick={onGoToPortal}
            className="min-w-[140px] px-5 py-3 rounded-full bg-gold text-charcoal text-sm font-heading uppercase tracking-[0.24em] hover:bg-gold/90 transition-all shadow-[0_0_40px_rgba(197,160,89,0.18)]"
          >
            Go now
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ClientRegister() {
  useReloadPageRefresh();

  const [searchParams] = useSearchParams();
  const urlReferralCode = searchParams.get('ref') || '';
  const giftToken = searchParams.get('gift') || '';

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    birthday_month: '',
    birthday_day: '',
    referral_code: urlReferralCode
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [giftPreview, setGiftPreview] = useState(null);
  const [giftClaimCount, setGiftClaimCount] = useState(0);
  const [phoneLocked, setPhoneLocked] = useState(false);
  const [redirectSeconds, setRedirectSeconds] = useState(REDIRECT_DELAY_SEC);
  const hasNavigatedRef = useRef(false);
  const registeredNameRef = useRef('');
  const pendingProfileRef = useRef(null);
  const redirectCleanupRef = useRef(null);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, themeConfig } = useTheme();

  const cardClass = theme === 'dark'
    ? 'bg-[#111] border border-gold/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl w-full'
    : 'bg-white border border-gold/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl w-full';

  const inputClass = theme === 'dark'
    ? 'w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg bg-offwhite/10 border border-offwhite/20 text-offwhite placeholder-offwhite/30 focus:outline-none focus:border-gold transition-colors text-base'
    : 'w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg bg-charcoal/5 border border-charcoal/10 text-charcoal placeholder-charcoal/30 focus:outline-none focus:border-gold transition-colors text-base';

  const labelClass = `text-xs tracking-wider uppercase block mb-2 ${theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50'}`;

  const btnPrimaryClass = 'w-full py-3 rounded-full bg-gold text-charcoal text-sm font-heading uppercase tracking-[0.24em] hover:bg-gold/90 transition-all disabled:opacity-50 shadow-[0_0_40px_rgba(197,160,89,0.18)]';

  const subtitleClass = theme === 'dark' ? 'text-offwhite/60 mt-2' : 'text-charcoal/60 mt-2';

  const completeRegistration = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    redirectCleanupRef.current?.();

    const profile = pendingProfileRef.current;
    if (profile) {
      login(profile);
      claimPendingGiftCards(profile.id).catch(() => undefined);
    }

    try {
      sessionStorage.removeItem(REGISTRATION_PENDING_KEY);
      sessionStorage.setItem('nc_registration_welcome', '1');
    } catch {
      // ignore storage errors
    }

    navigate('/portal', {
      replace: true,
      state: { fromRegistration: true, name: registeredNameRef.current },
    });
  }, [login, navigate]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(REGISTRATION_PENDING_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed?.profile || !parsed?.expiresAt || parsed.expiresAt < Date.now()) {
        sessionStorage.removeItem(REGISTRATION_PENDING_KEY);
        return;
      }
      pendingProfileRef.current = parsed.profile;
      registeredNameRef.current = parsed.name || parsed.profile.full_name || '';
      setSuccess(true);
    } catch {
      sessionStorage.removeItem(REGISTRATION_PENDING_KEY);
    }
  }, []);

  useEffect(() => {
    if (!success) {
      hasNavigatedRef.current = false;
      setRedirectSeconds(REDIRECT_DELAY_SEC);
      return undefined;
    }

    hasNavigatedRef.current = false;
    setRedirectSeconds(REDIRECT_DELAY_SEC);

    const tick = window.setInterval(() => {
      setRedirectSeconds((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    const redirect = window.setTimeout(() => {
      completeRegistration();
    }, REDIRECT_DELAY_SEC * 1000);

    const cleanup = () => {
      window.clearInterval(tick);
      window.clearTimeout(redirect);
    };
    redirectCleanupRef.current = cleanup;

    return cleanup;
  }, [success, completeRegistration]);

  useEffect(() => {
    if (!giftToken) return;
    let cancelled = false;
    (async () => {
      const preview = await getGiftCardClaimPreview(giftToken);
      if (cancelled) return;
      if (preview?.success && preview.phone_for_registration) {
        setGiftPreview(preview);
        setFormData((prev) => ({
          ...prev,
          phone: preview.phone_for_registration,
        }));
        setPhoneLocked(true);
      } else if (preview?.error === 'account_exists') {
        setError(preview.message || 'An account already exists for this gift. Please log in.');
      }
    })();
    return () => { cancelled = true; };
  }, [giftToken]);

  const handleChange = (e) => {
    if (e.target.name === 'phone' && phoneLocked) return;
    const value = e.target.name === 'phone'
      ? e.target.value.replace(/\D/g, '').slice(0, 10)
      : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
    setError('');
  };

  const generateReferralCode = (name) => {
    const cleanName = name.replace(/\s+/g, '').toUpperCase().slice(0, 4);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${cleanName}${random}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.full_name || !formData.phone || !formData.email || !formData.birthday_month || !formData.birthday_day) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.phone.length !== 10) {
      setError('Please enter a 10-digit phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cleanPhone = formData.phone;

      const { data: existing, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', cleanPhone)
        .single();

      if (existing) {
        setError('An account with this phone number already exists. Please login instead.');
        setLoading(false);
        return;
      }

      const referralCode = formData.referral_code.trim().toUpperCase();
      let initialPoints = 0;
      let referredById = null;

      if (referralCode) {
        const { data: referrer } = await supabase
          .from('profiles')
          .select('id, loyalty_points')
          .eq('referral_code', referralCode)
          .single();

        if (referrer) {
          referredById = referrer.id;
          initialPoints = 50;
          await supabase.rpc('award_loyalty_points', {
            p_profile_id: referrer.id,
            p_points: 50,
            p_description: 'Referral bonus — friend signed up',
            p_type: 'referral_bonus',
          }).catch(() => {
            supabase
              .from('profiles')
              .update({ loyalty_points: (referrer.loyalty_points || 0) + 50 })
              .eq('id', referrer.id);
          });
        }
      }

      const birthday = formData.birthday_month && formData.birthday_day
        ? `${formData.birthday_month}-${formData.birthday_day}`
        : null;

      const { data, error: insertError } = await supabase
        .from('profiles')
        .insert({
          full_name: formData.full_name,
          phone: cleanPhone,
          email: formData.email,
          birthday,

          role: 'customer',
          referral_code: generateReferralCode(formData.full_name),
          referral_by: referredById,
          loyalty_points: initialPoints
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      registeredNameRef.current = formData.full_name;
      pendingProfileRef.current = data;
      try {
        sessionStorage.setItem(REGISTRATION_PENDING_KEY, JSON.stringify({
          profile: data,
          name: formData.full_name,
          expiresAt: Date.now() + 120000,
        }));
      } catch {
        // ignore storage errors
      }
      setSuccess(true);

      claimPendingGiftCards(data.id)
        .then((claimResult) => {
          if (claimResult?.count > 0) {
            setGiftClaimCount(claimResult.count);
          }
        })
        .catch(() => undefined);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <RegistrationSuccessScreen
        theme={theme}
        fullName={formData.full_name}
        giftClaimCount={giftClaimCount}
        hasReferralCode={Boolean(formData.referral_code?.trim())}
        redirectSeconds={redirectSeconds}
        onGoToPortal={completeRegistration}
      />
    );
  }

  return (
    <div className={`min-h-[100dvh] w-full overflow-y-auto flex ${theme === 'dark' ? 'bg-charcoal' : 'bg-cream'}`}>
      {loading && <SubmittingOverlay theme={theme} />}
      <div className="m-auto w-full max-w-md px-3 sm:px-4 py-4 sm:py-8 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0">
        <div className={cardClass}>
          <div className="text-center mb-4 sm:mb-6 md:mb-8">
            <Link to="/" className="inline-flex justify-center w-full">
              <div
                className="flex items-center justify-center rounded-full p-1 sm:p-1.5"
                style={{ boxShadow: `0 0 0 1px ${themeConfig.borderColor}` }}
              >
                <BrandLogo className="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28" />
              </div>
            </Link>
            <p className={subtitleClass}>Create Your Account</p>
            {giftPreview?.success && (
              <p className={theme === 'dark' ? 'text-gold text-sm mt-2 font-medium' : 'text-gold text-sm mt-2 font-medium'}>
                {giftPreview.buyer_first_name
                  ? `${giftPreview.buyer_first_name} sent you a $${Number(giftPreview.amount || 0).toFixed(0)} gift card!`
                  : `Claim your $${Number(giftPreview.amount || 0).toFixed(0)} gift card`}
                {' '}Register with {maskPhoneForDisplay(giftPreview.phone_for_registration)}.
              </p>
            )}
            {formData.referral_code && (
              <p className={theme === 'dark' ? 'text-green-400 text-sm mt-2 font-medium' : 'text-green-600 text-sm mt-2 font-medium'}>
                You have a referral code! You'll earn 50 loyalty points after signup.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-3 sm:mb-4">
              <label className={labelClass}>
                Full Name
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className={inputClass}
              />
            </div>

            <div className="mb-3 sm:mb-4">
              <label className={labelClass}>
                Phone Number
              </label>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="10-digit phone number"
                readOnly={phoneLocked}
                className={clsx(inputClass, phoneLocked && 'opacity-80 cursor-not-allowed')}
              />
              {phoneLocked && (
                <p className={theme === 'dark' ? 'text-offwhite/40 text-xs mt-1' : 'text-charcoal/40 text-xs mt-1'}>
                  Phone is locked to match your gift card.
                </p>
              )}
            </div>

            <div className="mb-3 sm:mb-4 md:mb-6">
              <label className={labelClass}>
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className={inputClass}
              />
            </div>

            <div className="mb-3 sm:mb-4">
              <label className={labelClass}>
                Birthday
              </label>
              <div className="flex gap-2 sm:gap-3">
                <ScrollSelect
                  value={formData.birthday_month}
                  onChange={(v) => setFormData({ ...formData, birthday_month: v })}
                  options={MONTHS}
                  placeholder="Month"
                  className="flex-1"
                  theme={theme}
                />
                <ScrollSelect
                  value={formData.birthday_day}
                  onChange={(v) => setFormData({ ...formData, birthday_day: v })}
                  options={DAYS}
                  placeholder="Day"
                  className="flex-1"
                  theme={theme}
                />
              </div>
            </div>

            <div className="mb-4 sm:mb-6">
              <label className={labelClass}>
                Referral Code <span className={theme === 'dark' ? 'text-offwhite/30' : 'text-charcoal/30'}>(Optional)</span>
              </label>
              <input
                type="text"
                name="referral_code"
                value={formData.referral_code}
                onChange={handleChange}
                placeholder="Enter friend's referral code"
                className={`${inputClass} uppercase`}
              />
            </div>

            {error && <p className={theme === 'dark' ? 'text-red-400 text-sm mb-4' : 'text-red-500 text-sm mb-4'}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className={btnPrimaryClass}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-4 sm:mt-6 text-center">
            <Link to="/login" className="text-sm text-gold hover:text-gold/80">
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}