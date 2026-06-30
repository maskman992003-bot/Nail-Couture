import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getHomePath } from '@nail-couture/shared/utils/routes';

export function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading, logout } = useAuth();

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
    if (redirectPath === '/login') {
      try { logout(); } catch (e) { /* ignore */ }
      return <Navigate to="/login" replace />;
    }
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}
