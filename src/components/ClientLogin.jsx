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
  const navigate = useNavigate();
  const { login } = useAuth();

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
      console.log('Looking up phone:', cleanPhone);
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone_number', cleanPhone)
        .single()

      console.log('Profile lookup result:', profile, profileError);

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (!profile) {
        setError('No account found with this phone number. Please check in at the kiosk first.');
        setLoading(false);
        return;
      }

      console.log('Profile role:', profile.role, 'is_staff:', profile.role && ['super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician'].includes(profile.role));
      
      login(profile);
      
      const isStaff = profile.role && ['super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician'].includes(profile.role);
      const redirectTo = isStaff ? getHomePath(profile.role) : '/portal';
      
      console.log('Login successful, navigating to', redirectTo);
      navigate(redirectTo);
    } catch (err) {
      console.error('Login error:', err);
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
              {loading ? 'Verifying...' : 'Access Portal'}
            </button>
          </form>

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
        </div>
      </div>
    </div>
  );
}