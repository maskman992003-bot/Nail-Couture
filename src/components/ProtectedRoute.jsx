import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const getHomePath = (role) => {
  switch (role) {
    case 'super_admin': return '/superadmin';
    case 'owner': return '/owner';
    case 'partner': return '/partner';
    case 'admin': return '/admin';
    case 'cashier': return '/cashier';
    case 'technician': return '/technician';
    case 'customer': return '/portal';
    default: return '/login';
  }
};

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

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const redirectPath = getHomePath(user.role);
    // If the user's role is unknown, log them out and send to login
    if (redirectPath === '/login') {
      try { logout(); } catch (e) { /* ignore */ }
      return <Navigate to="/login" replace />;
    }
    if (location.pathname !== redirectPath) {
      return <Navigate to={redirectPath} replace />;
    }
  }

  return children;
}