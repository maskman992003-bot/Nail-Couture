import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_STORAGE_KEY, normalizeUser } from '@nail-couture/shared/auth/user.js';

type User = ReturnType<typeof normalizeUser>;

type AuthContextValue = {
  user: User | null;
  login: (profile: Record<string, unknown>) => void;
  logout: () => void;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function getStoredUser(): Promise<User | null> {
  try {
    const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      return normalizeUser(JSON.parse(stored));
    }
  } catch (err) {
    console.error('Error parsing stored user:', err);
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getStoredUser().then((stored) => {
      if (!mounted) return;
      if (stored) setUser(stored);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback((profile: Record<string, unknown>) => {
    const userData = normalizeUser(profile);
    AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
    setLoading(false);
  }, []);

  const value = useMemo(
    () => ({ user, login, logout, loading }),
    [user, login, logout, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
