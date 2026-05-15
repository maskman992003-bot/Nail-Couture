import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function ClientRegister() {
  const [searchParams] = useSearchParams();
  const urlReferralCode = searchParams.get('ref') || '';

  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
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

    if (!formData.full_name || !formData.phone_number || !formData.email) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.phone_number.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cleanPhone = formData.phone_number.replace(/\D/g, '');

      const { data: existing, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone_number', cleanPhone)
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
          phone_number: cleanPhone,
          email: formData.email,
          is_staff: false,
          role: 'customer',
          referral_code: referralCode,
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
      setTimeout(() => navigate('/portal'), 1500);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

          {success ? (
            <div className="text-center">
              <div className="text-gold text-4xl mb-4">✓</div>
              <h2 className="text-xl font-heading text-charcoal mb-2">Welcome!</h2>
              <p className="text-charcoal/60">Your account has been created. Redirecting to your portal...</p>
            </div>
          ) : (
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
                  name="phone_number"
                  value={formData.phone_number}
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
          )}

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