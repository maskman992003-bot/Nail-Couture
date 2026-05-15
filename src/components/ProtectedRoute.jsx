import { Navigate, useLocation } from 'react-router-dom';
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
    default: return '/login';
  }
};

export function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();
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
    if (location.pathname !== redirectPath) {
      return <Navigate to={redirectPath} replace />;
    }
  }

  return children;
}