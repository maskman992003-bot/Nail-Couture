import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import BrandLogo from './BrandLogo.jsx';
import ScrollSelect from './ScrollSelect';

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

export default function ClientRegister() {
  const [searchParams] = useSearchParams();
  const urlReferralCode = searchParams.get('ref') || '';

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
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme } = useTheme();

  const cardClass = theme === 'dark'
    ? 'bg-[#111] border border-gold/20 rounded-2xl p-8 shadow-xl'
    : 'bg-white border border-gold/30 rounded-2xl p-8 shadow-xl';

  const inputClass = theme === 'dark'
    ? 'w-full px-4 py-3 rounded-lg bg-offwhite/10 border border-offwhite/20 text-offwhite placeholder-offwhite/30 focus:outline-none focus:border-gold transition-colors'
    : 'w-full px-4 py-3 rounded-lg bg-charcoal/5 border border-charcoal/10 text-charcoal placeholder-charcoal/30 focus:outline-none focus:border-gold transition-colors';

  const labelClass = `text-xs tracking-wider uppercase block mb-2 ${theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50'}`;

  const btnPrimaryClass = 'w-full py-3 rounded-full bg-gold text-charcoal text-sm font-heading uppercase tracking-[0.24em] hover:bg-gold/90 transition-all disabled:opacity-50 shadow-[0_0_40px_rgba(197,160,89,0.18)]';

  const subtitleClass = theme === 'dark' ? 'text-offwhite/60 mt-2' : 'text-charcoal/60 mt-2';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

    if (formData.phone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cleanPhone = formData.phone.replace(/\D/g, '');

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

      setSuccess(true);
      login(data);
      setTimeout(() => navigate('/portal'), 5000);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-8 relative overflow-hidden ${theme === 'dark' ? 'bg-charcoal' : 'bg-cream'}`}>
        <Sparkle />
        <div className="relative z-10 text-center animate-fade-in">
          <div className="w-24 h-24 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-8">
            <svg className="w-12 h-12 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <h2 className="font-heading text-4xl text-gold mb-4 tracking-wide">Welcome to the Club</h2>
          <p className={`font-heading text-2xl mb-6 ${theme === 'dark' ? 'text-offwhite' : 'text-charcoal'}`}>{formData.full_name}</p>
          {formData.referral_code && (
            <p className={`text-xl ${theme === 'dark' ? 'text-offwhite/70' : 'text-charcoal/70'}`}>
              Your <span className="text-gold">50 loyalty points</span> are being added
            </p>
          )}
          <div className="mt-8 animate-fade-in">
            <button
              type="button"
              onClick={() => navigate('/portal')}
              className="min-w-[140px] px-5 py-3 rounded-full bg-gold text-charcoal text-sm font-heading uppercase tracking-[0.24em] hover:bg-gold/90 transition-all shadow-[0_0_40px_rgba(197,160,89,0.18)]"
            >
              Go to Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${theme === 'dark' ? 'bg-charcoal' : 'bg-cream'}`}>
      <div className="w-full max-w-md">
        <div className={cardClass}>
          <div className="text-center mb-8">
            <Link to="/" className="block">
              <BrandLogo className="h-28 w-auto mx-auto" rounded={false} />
            </Link>
            <p className={subtitleClass}>Create Your Account</p>
            {formData.referral_code && (
              <p className={theme === 'dark' ? 'text-green-400 text-sm mt-2 font-medium' : 'text-green-600 text-sm mt-2 font-medium'}>
                You have a referral code! You'll earn 50 loyalty points after signup.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
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

            <div className="mb-4">
              <label className={labelClass}>
                Phone Number
              </label>
              <input
                type="tel"
                 name="phone"
                 value={formData.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
                className={inputClass}
              />
            </div>

            <div className="mb-6">
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

            <div className="mb-4">
              <label className={labelClass}>
                Birthday
              </label>
              <div className="flex gap-3">
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

            <div className="mb-6">
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

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-gold hover:text-gold/80">
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}