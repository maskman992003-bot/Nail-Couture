import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { fetchLoyaltyHistory } from '@nail-couture/shared/utils/loyaltyTransactions';
import DigitalWallet from '../features/wallet/DigitalWallet';
import LoyaltyPointsHistoryPanel from './customer/LoyaltyPointsHistoryPanel';
import useRegisterPullToRefresh from '../hooks/useRegisterPullToRefresh';

export default function CustomerLoyalty() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [loyaltyHistory, setLoyaltyHistory] = useState({ rows: [], available: false });

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user && ['super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician'].includes(user.role)) {
      navigate(`/${user.role}`);
      return;
    }
    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    const userId = user?.id;
    if (!userId) { navigate('/login'); return; }

    try {
      const [{ data }, history] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        fetchLoyaltyHistory(userId, null),
      ]);
      if (data) setProfile(data);
      setLoyaltyHistory(history);
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useRegisterPullToRefresh(fetchProfile);

  const handleCopyReferral = () => {
    if (!profile?.referral_code) return;
    navigator.clipboard.writeText(profile.referral_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const shellClass = `min-h-screen w-full transition-all duration-300 pl-sidebar ${theme === 'dark' ? 'bg-primary text-primary' : 'bg-white text-charcoal'}`;
  const borderStyle = { borderColor: 'rgba(197, 160, 89, 0.3)', backgroundColor: theme === 'dark' ? '#111' : '#fff' };
  const labelMuted = theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40';
  const textMuted = theme === 'dark' ? 'text-offwhite/60' : 'text-charcoal/60';

  if (loading) {
    return (
      <div className={shellClass}>
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={shellClass}>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className={`${textMuted} mb-4`}>Unable to load profile</p>
            <Link to="/login" className="px-4 py-2 bg-gold text-charcoal rounded-lg">Return to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <div className="p-4 md:p-6 lg:p-8 mobile-page space-y-10">
        <DigitalWallet />

        {profile.referral_code && (
          <div className="rounded-2xl p-8 border" style={borderStyle}>
            <div className={`${labelMuted} text-xs uppercase tracking-widest mb-4`}>Your Referral Code</div>
            <div className="flex items-center justify-center gap-4 flex-wrap mb-4">
              <div className="font-heading text-3xl text-gold tracking-widest">{profile.referral_code}</div>
              <button
                type="button"
                onClick={handleCopyReferral}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: 'rgba(197, 160, 89, 0.15)', color: '#c5a059', border: '1px solid rgba(197, 160, 89, 0.3)' }}
              >
                {copiedCode ? '✓ Copied' : 'Copy'}
              </button>
              <a
                href={`https://wa.me/?text=Use%20code%20${profile.referral_code}%20at%20Nail%20Couture%20for%20an%20exclusive%20discount!`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                style={{ backgroundColor: 'rgba(37, 211, 102, 0.15)', color: '#25D366', border: '1px solid rgba(37, 211, 102, 0.3)' }}
              >
                Share via WhatsApp
              </a>
            </div>
            <p className={`${labelMuted} text-sm text-center max-w-md mx-auto`}>
              Share the luxury. Friends get a discount on their first visit, and you earn bonus loyalty points!
            </p>
          </div>
        )}

        {loyaltyHistory.available && loyaltyHistory.rows.length > 0 && (
          <div className="rounded-2xl p-8 border" style={{ borderColor: 'rgba(197, 160, 89, 0.15)', backgroundColor: theme === 'dark' ? '#111' : '#fff' }}>
            <LoyaltyPointsHistoryPanel rows={loyaltyHistory.rows} theme={theme} />
          </div>
        )}
      </div>
    </div>
  );
}
