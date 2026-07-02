import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getHomePath } from '@nail-couture/shared/utils/routes';
import { needsRegistrationCompletion } from '@nail-couture/shared/auth/registration.js';

export function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-gold animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (
    user.role === 'customer'
    && needsRegistrationCompletion(user)
    && !location.pathname.startsWith('/register')
  ) {
    const phoneDigits = (user.phone || '').replace(/\D/g, '');
    return (
      <Navigate
        to={`/register?complete=1&phone=${encodeURIComponent(phoneDigits)}`}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const redirectPath = getHomePath(user.role);
    if (redirectPath === '/login') {
      try { logout(); } catch (e) { /* ignore */ }
      return <Navigate to="/login" replace />;
    }
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}
