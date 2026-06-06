import { createContext, useContext, useState, useEffect } from 'react';
import { AUTH_STORAGE_KEY, normalizeUser } from '@nail-couture/shared/auth/user.js';

const AuthContext = createContext(null);

function getStoredUser() {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return normalizeUser(parsed);
    }
  } catch (err) {
    console.error('Error parsing stored user:', err);
  }
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
    }
    setLoading(false);
  }, []);

  const login = (profile) => {
    const userData = normalizeUser(profile);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
