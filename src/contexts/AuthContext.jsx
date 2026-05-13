import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'salon_user_id';
const NAME_KEY = 'salon_user_name';
const EMAIL_KEY = 'salon_user_email';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUserId = localStorage.getItem(STORAGE_KEY);
    const savedUserName = localStorage.getItem(NAME_KEY);
    const savedUserEmail = localStorage.getItem(EMAIL_KEY);

    console.log('Session Check:', savedUserId);
    console.log('Session Name:', savedUserName);

    if (savedUserId) {
      setUser({
        id: savedUserId,
        full_name: savedUserName,
        email: savedUserEmail
      });
    }
    setLoading(false);
  }, []);

  const login = (profile) => {
    console.log('Login - Saving to localStorage:', profile.id, profile.full_name);
    localStorage.setItem(STORAGE_KEY, profile.id);
    localStorage.setItem(NAME_KEY, profile.full_name);
    localStorage.setItem(EMAIL_KEY, profile.email || '');
    setUser({
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email
    });
  };

  const logout = () => {
    console.log('Logout - Clearing localStorage');
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(NAME_KEY);
    localStorage.removeItem(EMAIL_KEY);
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