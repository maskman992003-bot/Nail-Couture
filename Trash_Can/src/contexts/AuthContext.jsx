import { createContext, useContext, useState, useEffect } from 'react';
import { isStaffRole } from '../utils/routes';

const AuthContext = createContext(null);

const STORAGE_KEY = 'salon_user_data';

function normalizeUser(profile) {
  const role = profile.role || 'customer';
  return {
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email || '',
    nail_goal: profile.nail_goal || '',
    refreshment_pref: profile.refreshment_pref || '',
    phone: profile.phone || '',
    birthday: profile.birthday || '',
    loyalty_points: profile.loyalty_points ?? 0,
    referral_code: profile.referral_code || '',
    avatar_url: profile.avatar_url || '',
    sms_reminders: profile.sms_reminders !== false,
    email_promotions: profile.email_promotions !== false,
    preferred_contact: profile.preferred_contact || 'phone',
    role,
    is_staff: isStaffRole(role),
  };
}

function getStoredUser() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
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
