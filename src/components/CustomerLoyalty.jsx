import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';

const getTierInfo = (points) => {
  if (points >= 1000) {
    return { name: 'Diamond', color: 'text-cyan-400', benefit: '20% off + VIP priority + free premium service', nextTier: null, nextThreshold: null, progress: 100 };
  }
  if (points >= 500) {
    return { name: 'Platinum', color: 'text-gray-300', benefit: '15% off + priority booking + free refreshment', nextTier: 'Diamond', nextThreshold: 1000, progress: ((points - 500) / 500) * 100 };
  }
  if (points >= 100) {
    return { name: 'Gold', color: 'text-gold', benefit: '10% off + free refreshment', nextTier: 'Platinum', nextThreshold: 500, progress: ((points - 100) / 400) * 100 };
  }
  return { name: 'Silver', color: 'text-gray-400', benefit: '5% off all services', nextTier: 'Gold', nextThreshold: 100, progress: (points / 100) * 100 };
};

const tierDetails = {
  Silver: { points: 0, next: 100, reward: 'Gold status (10% off + free refreshment)' },
  Gold: { points: 100, next: 500, reward: 'Platinum status (15% off + priority booking + free refreshment)' },
  Platinum: { points: 500, next: 1000, reward: 'Diamond status (20% off + VIP priority + free premium service)' },
  Diamond: { points: 1000, next: null, reward: 'Maximum tier — enjoy all premium perks!' },
};

export default function CustomerLoyalty() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [confirmationCode, setConfirmationCode] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user && ['super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician'].includes(user.role)) { navigate(`/${user.role}`); return; }
    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    const currentUser = localStorage.getItem('salon_user_data');
    const userId = currentUser ? JSON.parse(currentUser).id : null;
    if (!userId) { navigate('/login'); return; }

    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateConfirmationCode = () => Math.random().toString(36).substring(2, 8).toUpperCase() + Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleRedeem = async (pointsCost, rewardName) => {
    if (!profile || (profile.loyalty_points || 0) < pointsCost) return;
    const newPoints = profile.loyalty_points - pointsCost;
    const { error } = await supabase.from('profiles').update({ loyalty_points: newPoints }).eq('id', profile.id);
    if (!error) {
      setConfirmationCode({ code: generateConfirmationCode(), reward: rewardName, points: pointsCost });
      setProfile({ ...profile, loyalty_points: newPoints });
    }
  };

  const handleCopyReferral = () => {
    if (!profile?.referral_code) return;
    navigator.clipboard.writeText(profile.referral_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="text-offwhite/60 mb-4">Unable to load profile</p>
            <Link to="/login" className="px-4 py-2 bg-gold text-charcoal rounded-lg">Return to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  const tier = getTierInfo(profile.loyalty_points || 0);

  return (
    <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 space-y-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link to="/portal" className="text-offwhite/40 hover:text-gold text-sm">Home</Link>
              <span className="text-offwhite/30">/</span>
              <span className="text-gold font-heading text-sm">Loyalty Rewards</span>
            </div>
            <h1 className="font-heading text-4xl text-gold">Loyalty Rewards</h1>
            <p className="text-offwhite/50 text-sm mt-1">Your exclusive perks and how to unlock more</p>
          </div>

          <div className="rounded-2xl p-8 border-2 text-center" style={{ background: 'linear-gradient(135deg, rgba(197, 160, 89, 0.08) 0%, rgba(26, 26, 26, 1) 100%)', borderColor: 'rgba(197, 160, 89, 0.4)' }}>
            <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-3">Membership Card</div>
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c5a059, #f0d78c)', boxShadow: '0 0 20px rgba(197, 160, 89, 0.3)' }}>
                <span className="text-charcoal font-heading text-xl font-bold">{profile.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</span>
              </div>
            </div>
            <div className={`font-heading text-3xl mb-1 ${tier.color}`}>{tier.name} Member</div>
            <div className="text-5xl font-heading text-gold mb-3">{profile.loyalty_points || 0}</div>
            <div className="text-offwhite/50 text-sm">points</div>
            {tier.nextTier && (
              <div className="mt-4 max-w-sm mx-auto">
                <div className="flex justify-between text-xs text-offwhite/40 mb-1">
                  <span>Next: {tier.nextTier}</span>
                  <span>{profile.loyalty_points || 0} / {tier.nextThreshold}</span>
                </div>
                <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${tier.progress}%`, backgroundColor: '#c5a059' }}></div>
                </div>
              </div>
            )}
            <div className="mt-4 text-offwhite/60 text-sm">{tier.benefit}</div>
            {tier.nextTier && (
              <div className="mt-4 text-offwhite/50 text-sm">
                Need <span className="text-gold font-heading">{tier.nextThreshold - (profile.loyalty_points || 0)}</span> more points to unlock {tier.nextTier}
              </div>
            )}
          </div>

          {profile.referral_code && (
            <div className="rounded-2xl p-8 border" style={{ borderColor: 'rgba(197, 160, 89, 0.3)', backgroundColor: '#111' }}>
              <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-4">Your Referral Code</div>
              <div className="flex items-center justify-center gap-4 flex-wrap mb-4">
                <div className="font-heading text-3xl text-gold tracking-widest">{profile.referral_code}</div>
                <button
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
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  Share via WhatsApp
                </a>
              </div>
              <p className="text-offwhite/40 text-sm text-center max-w-md mx-auto">Share the luxury. Friends get a discount on their first visit, and you earn bonus loyalty points!</p>
            </div>
          )}

          <div className="rounded-2xl p-8 border" style={{ borderColor: 'rgba(197, 160, 89, 0.3)', backgroundColor: '#111' }}>
            <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-6">How to Earn More Points</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex items-start gap-4 p-5 rounded-xl" style={{ backgroundColor: 'rgba(197, 160, 89, 0.08)' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #c5a059, #f0d78c)' }}>
                  <span className="text-charcoal font-heading text-xl font-bold">$</span>
                </div>
                <div>
                  <div className="text-offwhite font-heading text-lg mb-1">Spend & Earn</div>
                  <div className="text-offwhite/60 text-sm">Earn <span className="text-gold font-heading">1 point</span> for every <span className="text-gold font-heading">$1 spent</span> on any service. The more you enjoy, the more you earn!</div>
                </div>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-xl" style={{ backgroundColor: 'rgba(197, 160, 89, 0.08)' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #c5a059, #f0d78c)' }}>
                  <span className="text-charcoal font-heading text-xl">&#9733;</span>
                </div>
                <div>
                  <div className="text-offwhite font-heading text-lg mb-1">Refer a Friend</div>
                  <div className="text-offwhite/60 text-sm">Share your referral code with a friend. When they book their first visit, you both earn bonus points!</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-8 border" style={{ borderColor: 'rgba(197, 160, 89, 0.15)', backgroundColor: '#111' }}>
            <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-6">Redeem Rewards</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl p-5 border" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="text-offwhite font-heading text-base mb-1">Free Basic Nail Art</div>
                <div className="text-offwhite/40 text-sm mb-4">100 points</div>
                <button onClick={() => handleRedeem(100, 'Free Basic Nail Art')} disabled={(profile.loyalty_points || 0) < 100} className="w-full py-2 text-sm rounded-lg border-2 transition-colors disabled:opacity-30" style={{ borderColor: 'rgba(197, 160, 89, 0.4)', color: '#c5a059' }}>
                  Redeem
                </button>
              </div>
              <div className="rounded-xl p-5 border" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="text-offwhite font-heading text-base mb-1">Free Refreshment</div>
                <div className="text-offwhite/40 text-sm mb-4">200 points</div>
                <button onClick={() => handleRedeem(200, 'Free Refreshment')} disabled={(profile.loyalty_points || 0) < 200} className="w-full py-2 text-sm rounded-lg border-2 transition-colors disabled:opacity-30" style={{ borderColor: 'rgba(197, 160, 89, 0.4)', color: '#c5a059' }}>
                  Redeem
                </button>
              </div>
              <div className="rounded-xl p-5 border" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="text-offwhite font-heading text-base mb-1">$25 Voucher</div>
                <div className="text-offwhite/40 text-sm mb-4">500 points</div>
                <button onClick={() => handleRedeem(500, '$25 Voucher')} disabled={(profile.loyalty_points || 0) < 500} className="w-full py-2 text-sm rounded-lg border-2 transition-colors disabled:opacity-30" style={{ borderColor: 'rgba(197, 160, 89, 0.4)', color: '#c5a059' }}>
                  Redeem
                </button>
              </div>
            </div>
          </div>

          {confirmationCode && (
            <div className="rounded-2xl p-8 border-2 text-center" style={{ borderColor: 'rgba(197, 160, 89, 0.5)', background: 'linear-gradient(135deg, rgba(197, 160, 89, 0.1) 0%, #1a1a1a 100%)' }}>
              <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-3">Your Redemption Code</div>
              <div className="font-heading text-4xl text-gold tracking-widest mb-3">{confirmationCode.code}</div>
              <div className="text-offwhite/60 text-lg">{confirmationCode.reward}</div>
              <button onClick={() => setConfirmationCode(null)} className="mt-6 px-6 py-3 bg-gold text-charcoal font-heading text-sm rounded-xl hover:bg-gold/90">Got It</button>
            </div>
)}
        </div>
    </div>
  );
}