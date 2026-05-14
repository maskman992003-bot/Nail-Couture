import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ allowedRoles, children, blockStaff }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (!user && loading) {
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center">
        <div className="text-gold animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const redirectPath = getRedirectPath(user.role);
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  if (blockStaff && user.is_staff) {
    const redirectPath = getRedirectPath(user.role);
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  return children;
}

function getRedirectPath(role) {
  switch (role) {
    case 'super_admin':
    case 'owner':
    case 'partner':
      return '/admin';
    case 'admin':
      return '/admin/lobby';
    case 'cashier':
      return '/checkout';
    case 'customer':
    default:
      return '/portal';
  }
}