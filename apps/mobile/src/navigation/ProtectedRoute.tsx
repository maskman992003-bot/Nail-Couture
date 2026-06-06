import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { getHomePath } from '@nail-couture/shared/utils/routes.js';
import { useThemeStyles } from '../theme/useThemeStyles';

type ProtectedRouteProps = {
  allowedRoles?: string[];
  children: ReactNode;
  onUnauthorized: () => void;
  onRoleRedirect: (screen: string) => void;
};

export function ProtectedRoute({
  allowedRoles,
  children,
  onUnauthorized,
  onRoleRedirect,
}: ProtectedRouteProps) {
  const { user, loading, logout } = useAuth();
  const { tokens, screen } = useThemeStyles();

  if (loading) {
    return (
      <View style={[screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={tokens.goldStrong} />
      </View>
    );
  }

  if (!user) {
    onUnauthorized();
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const redirectPath = getHomePath(user.role);
    if (redirectPath === '/login') {
      try {
        logout();
      } catch {
        // ignore
      }
      onUnauthorized();
      return null;
    }
    onRoleRedirect('Home');
    return null;
  }

  return <>{children}</>;
}
