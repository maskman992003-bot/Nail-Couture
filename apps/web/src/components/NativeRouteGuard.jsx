import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMobileBridge } from '../hooks/useMobileBridge';
import { getHomePath } from '@nail-couture/shared/utils/routes';
import { isNativeBlockedPublicPath } from '../utils/nativeShell';

export default function NativeRouteGuard({ children }) {
  const { isNativeShell } = useMobileBridge();
  const { user, loading } = useAuth();
  const location = useLocation();

  if (!isNativeShell) {
    return children;
  }

  if (loading) {
    return children;
  }

  if (isNativeBlockedPublicPath(location.pathname)) {
    if (user) {
      return <Navigate to={getHomePath(user.role)} replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children;
}
