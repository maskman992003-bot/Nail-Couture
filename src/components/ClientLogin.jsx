import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ClientLogin() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('phone_number', cleanPhone)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (!profile) {
        setError('No account found with this phone number. Please check in at the kiosk first.');
        setLoading(false);
        return;
      }

      const redirectTo = `${window.location.origin}/portal`;
      
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: cleanPhone,
        options: { shouldCreateUser: false }
      });

      if (otpError) throw otpError;

      setSuccess(true);
      setTimeout(() => {
        navigate('/portal');
      }, 2000);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white border border-charcoal/10 p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 text-3xl">✓</span>
            </div>
            <h2 className="font-heading text-2xl text-charcoal mb-2">Check Your Phone</h2>
            <p className="text-charcoal/60">We sent a verification code to {phone}</p>
          </div>
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
            <p className="text-charcoal/60 mt-2">Client Portal Login</p>
          </div>

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
              {loading ? 'Sending Code...' : 'Access Portal'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-charcoal/50 hover:text-charcoal">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}