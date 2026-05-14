import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'salon_user_data';

function getStoredUser() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const user = JSON.parse(stored);
      console.log('Synchronous Session Check:', user?.id, user?.full_name);
      return user;
    }
  } catch (err) {
    console.error('Error parsing stored user:', err);
  }
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(!!getStoredUser());

  useEffect(() => {
    console.log('AuthContext mounted, user:', user);
    if (user) {
      setLoading(false);
    }
  }, [user]);

  const login = (profile) => {
    console.log('Login - Saving to localStorage:', profile.id, profile.full_name);
    const userData = {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email || '',
      nail_goal: profile.nail_goal || '',
      refreshment_pref: profile.refreshment_pref || '',
      phone_number: profile.phone_number || '',
      role: profile.role || 'customer',
      is_staff: ['super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician'].includes(profile.role)
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
    setLoading(false);
  };

  const logout = () => {
    console.log('Logout - Clearing localStorage');
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
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