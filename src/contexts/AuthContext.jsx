import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedProfileId = localStorage.getItem('portal_profile_id');
    const storedProfileName = localStorage.getItem('portal_profile_name');
    const storedEmail = localStorage.getItem('portal_profile_email');

    if (storedProfileId) {
      setUser({
        id: storedProfileId,
        full_name: storedProfileName,
        email: storedEmail
      });
    }
    setLoading(false);
  }, []);

  const login = (profile) => {
    localStorage.setItem('portal_profile_id', profile.id);
    localStorage.setItem('portal_profile_name', profile.full_name);
    localStorage.setItem('portal_profile_email', profile.email || '');
    setUser({
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email
    });
  };

  const logout = () => {
    localStorage.removeItem('portal_profile_id');
    localStorage.removeItem('portal_profile_name');
    localStorage.removeItem('portal_profile_email');
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