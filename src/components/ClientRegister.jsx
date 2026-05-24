import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
    referral_code: urlReferralCode
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

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

    if (!formData.full_name || !formData.phone || !formData.email) {
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
          await supabase
            .from('profiles')
            .update({ loyalty_points: (referrer.loyalty_points || 0) + 50 })
            .eq('id', referrer.id);
        }
      }

      const { data, error: insertError } = await supabase
        .from('profiles')
        .insert({
          full_name: formData.full_name,
          phone: cleanPhone,
          email: formData.email,
          is_staff: false,
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
      <div className="min-h-screen bg-charcoal flex items-center justify-center p-8 relative overflow-hidden">
        <Sparkle />
        <div className="relative z-10 text-center animate-fade-in">
          <div className="w-24 h-24 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-8">
            <svg className="w-12 h-12 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <h2 className="font-heading text-4xl text-gold mb-4 tracking-wide">Welcome to the Club</h2>
          <p className="font-heading text-2xl text-offwhite mb-6">{formData.full_name}</p>
          {formData.referral_code && (
            <p className="text-xl text-offwhite/70">
              Your <span className="text-gold">50 loyalty points</span> are being added
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-offwhite flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-charcoal/10 p-8">
          <div className="text-center mb-8">
            <Link to="/" className="block">
              <img src="/NC.jpg" alt="Nail Couture" className="h-28 w-auto mx-auto" />
            </Link>
            <p className="text-charcoal/60 mt-2">Create Your Account</p>
            {formData.referral_code && (
              <p className="text-green-600 text-sm mt-2 font-medium">
                You have a referral code! You'll earn 50 loyalty points after signup.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="text-xs text-charcoal/50 tracking-wider uppercase block mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="w-full p-3 border border-charcoal/10 focus:border-gold focus:outline-none"
              />
            </div>

            <div className="mb-4">
              <label className="text-xs text-charcoal/50 tracking-wider uppercase block mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                 name="phone"
                 value={formData.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
                className="w-full p-3 border border-charcoal/10 focus:border-gold focus:outline-none"
              />
            </div>

            <div className="mb-6">
              <label className="text-xs text-charcoal/50 tracking-wider uppercase block mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className="w-full p-3 border border-charcoal/10 focus:border-gold focus:outline-none"
              />
            </div>

            <div className="mb-6">
              <label className="text-xs text-charcoal/50 tracking-wider uppercase block mb-2">
                Referral Code <span className="text-charcoal/30">(Optional)</span>
              </label>
              <input
                type="text"
                name="referral_code"
                value={formData.referral_code}
                onChange={handleChange}
                placeholder="Enter friend's referral code"
                className="w-full p-3 border border-charcoal/10 focus:border-gold focus:outline-none uppercase"
              />
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-charcoal py-3 font-heading tracking-wider hover:bg-gold/90 transition-colors disabled:opacity-50"
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