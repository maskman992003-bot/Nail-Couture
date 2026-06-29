import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CUSTOMER_ONLINE_BOOKING } from '@nail-couture/shared/constants/featureFlags';
import { getHomePath } from '@nail-couture/shared/utils/routes';
import { getTierInfo, generateReferralCode } from '@nail-couture/shared/utils/loyaltyTier';
import { computeVaultRewardsAvailable } from '@nail-couture/shared/utils/vaultRewards.js';
import { getNextTierUpsellBenefit, getTierProgressSummary } from '@nail-couture/shared/utils/tierProgress.js';
import Sidebar from './Sidebar';
import AppModal, { modalBtnPrimary, modalLabelClass } from './AppModal';
import PromoSlideIn from './marketing/PromoSlideIn';
import PromoDetailModal from './marketing/PromoDetailModal';
import MysteryGiftSlideIn from './marketing/MysteryGiftSlideIn';
import { useCustomerHomePromotions } from '../hooks/useCustomerHomePromotions';
import { useMysteryGiftTeaser } from '@nail-couture/shared/hooks/useMysteryGift';
import { useWalletState } from '../features/wallet/hooks/useWalletState';
import CustomerHomeHeader from './customer/home/CustomerHomeHeader';
import MembershipHeroCard, { MembershipCardSection } from './customer/home/MembershipHeroCard';
import WalletStatsRow from './customer/home/WalletStatsRow';
import TierProgressBanner from './customer/home/TierProgressBanner';
import MysteryGiftHero from './customer/home/MysteryGiftHero';
import MysteryGiftDetailModal from './customer/home/MysteryGiftDetailModal';
import QuickActionGrid from './customer/home/QuickActionGrid';
import ReferFriendModal from './customer/home/ReferFriendModal';
import LoyaltyTermsSummary from '../features/wallet/components/LoyaltyTermsSummary';
import usePullToRefresh from '../hooks/usePullToRefresh';
import PullToRefreshIndicator from './PullToRefreshIndicator';

const statusColors = {
  waiting: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  assigned_pending: 'bg-blue-100 text-blue-800 border-blue-300',
  serving: 'bg-green-100 text-green-800 border-green-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
};

const statusLabels = {
  waiting: 'Waiting',
  assigned_pending: 'Assigned',
  serving: 'In Chair',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function ClientPortal() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromRegistration = Boolean(location.state?.fromRegistration)
    || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('nc_registration_welcome') === '1');
  const welcomeName = location.state?.name || '';
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showEarningModal, setShowEarningModal] = useState(false);
  const [showReferModal, setShowReferModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { snapshot } = useWalletState(user?.id);
  const {
    enabled: promosEnabled,
    currentSlideInPromo,
    chipReady,
    detailPromo,
    copyCode,
    advanceSlideInQueue,
    openSlideInDetail,
    closeSlideInDetail,
    toast: promoToast,
  } = useCustomerHomePromotions(user?.phone);
  const {
    showHero: showMysteryGiftHero,
    showSlideIn: showMysteryGiftSlideIn,
    detailOpen: mysteryGiftDetailOpen,
    status: mysteryGiftStatus,
    openDetail: openMysteryGiftDetail,
    closeDetail: closeMysteryGiftDetail,
    dismissSlideIn: dismissMysteryGiftSlideIn,
  } = useMysteryGiftTeaser();

  const fetchUserData = useCallback(async () => {
    const userId = user?.id;
    if (!userId) { navigate('/login'); return; }

    try {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (!profileData) { setLoading(false); return; }

      setProfile(profileData);

      if (!profileData.referral_code) {
        const newCode = generateReferralCode(profileData.full_name);
        await supabase.from('profiles').update({ referral_code: newCode }).eq('id', profileData.id);
        setProfile({ ...profileData, referral_code: newCode });
      }

      const { data: appointmentsData } = await supabase
        .rpc('get_my_appointments', { customer_id: userId, status_filter: 'waiting,assigned_pending,serving' });
      setAppointments(appointmentsData || []);
    } catch { /* ignore */ }
    setLoading(false);
    try {
      sessionStorage.removeItem('nc_registration_welcome');
    } catch {
      // ignore storage errors
    }
  }, [navigate, user?.id]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.is_staff) {
      navigate(getHomePath(user.role));
      return;
    }
    fetchUserData();
  }, [user, authLoading, navigate, fetchUserData]);

  const { pullDistance, isRefreshing, pullProgress } = usePullToRefresh({
    onRefresh: async () => {
      setLoading(true);
      await fetchUserData();
    },
    disabled: loading || authLoading,
  });

  const handleCopyReferral = () => {
    if (!profile?.referral_code) return;
    navigator.clipboard.writeText(profile.referral_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const shellClass = 'min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 bg-primary text-primary';

  if ((authLoading || loading) && fromRegistration) {
    const displayName = welcomeName || user?.full_name || 'there';
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-gold rounded-full animate-ping"
              style={{
                left: `${10 + (i * 11) % 80}%`,
                top: `${15 + (i * 17) % 70}%`,
                animationDelay: `${(i % 4) * 0.4}s`,
                animationDuration: `${1.2 + (i % 3) * 0.3}s`,
              }}
            />
          ))}
        </div>
        <div className="relative z-10 text-center animate-fade-in max-w-sm">
          <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-6 ring-2 ring-gold/30">
            <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold/80 mb-3">You&apos;re all set</p>
          <h2 className="font-heading text-3xl text-gold mb-3 tracking-wide">Welcome, {displayName}</h2>
          <p className="text-offwhite/60 text-sm mb-8">Loading your portal…</p>
          <div className="w-12 h-12 border-[3px] border-gold border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className={shellClass}>
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={shellClass}>
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="text-secondary mb-4">Unable to load profile</p>
            <Link to="/login" className="px-4 py-2 bg-gold text-charcoal rounded-lg">Return to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  const tier = getTierInfo(profile);
  const tierProgress = getTierProgressSummary(tier, profile, snapshot);
  const points = snapshot?.points ?? profile.loyalty_points ?? 0;
  const rewardsAvailable = computeVaultRewardsAvailable(points, snapshot?.milestones);

  return (
    <div className={shellClass}>
      <Sidebar />
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        pullProgress={pullProgress}
      />
      <div className="p-4 md:p-6 lg:p-8 mobile-page max-w-2xl mx-auto space-y-5">
        <CustomerHomeHeader />

        {showMysteryGiftHero ? (
          <MysteryGiftHero
            status={mysteryGiftStatus}
            onOpenDetail={openMysteryGiftDetail}
          />
        ) : null}

        <MembershipHeroCard profile={profile} />

        <MembershipCardSection
          profile={profile}
          onCardPress={() => setShowEarningModal(true)}
        />

        <WalletStatsRow
          points={points}
          rewardsAvailable={rewardsAvailable}
        />

        <TierProgressBanner profile={profile} snapshot={snapshot} />

        <QuickActionGrid onReferPress={() => setShowReferModal(true)} />

        {appointments.length > 0 ? (
          <div className="rounded-2xl p-6 border border-card bg-card">
            <div className="text-secondary text-[10px] uppercase tracking-widest mb-4">
              Your Active Appointment{appointments.length > 1 ? 's' : ''}
            </div>
            {appointments.map((booking) => (
              <div
                key={booking.id}
                onClick={() => { setSelectedBooking(booking); setShowDetailModal(true); }}
                className="flex items-start justify-between py-4 border-b border-light last:border-0 cursor-pointer hover:bg-primary/5 transition-colors rounded-lg px-2 -mx-2"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') { setSelectedBooking(booking); setShowDetailModal(true); } }}
              >
                <div>
                  <h3 className="font-heading text-xl text-primary mb-1">
                    {booking.add_ons || booking.services?.name || 'Service'}
                  </h3>
                  <div className="text-secondary text-sm">
                    {new Date(booking.checked_in_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at{' '}
                    {new Date(booking.checked_in_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 text-xs border rounded-full ${statusColors[booking.status]}`}>
                    {statusLabels[booking.status]}
                  </span>
                  {booking.final_price || booking.services?.price ? (
                    <div className="text-gold-strong font-heading text-lg mt-2">
                      ${(booking.final_price || booking.services?.price || 0).toFixed(2)}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <ReferFriendModal
          open={showReferModal}
          onClose={() => setShowReferModal(false)}
          referralCode={profile.referral_code}
          copiedCode={copiedCode}
          onCopy={handleCopyReferral}
        />

        <AppModal
          open={showEarningModal}
          onClose={() => setShowEarningModal(false)}
          title="Earn More Points"
          scrollBody
          zIndex="z-[100]"
          footer={
            <button type="button" onClick={() => setShowEarningModal(false)} className={modalBtnPrimary}>
              Got It
            </button>
          }
        >
          <div className="space-y-5">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-gold/10">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-gold to-[#f0d78c]">
                <span className="text-charcoal font-heading text-lg">$</span>
              </div>
              <div>
                <div className="text-primary font-heading text-lg mb-1">Spend & Earn</div>
                <div className="text-secondary text-sm">
                  Earn <span className="text-gold-strong font-heading">1 point</span> for every{' '}
                  <span className="text-gold-strong font-heading">$1 spent</span> on any service. The more you enjoy, the more you earn!
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl bg-gold/10">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-gold to-[#f0d78c]">
                <span className="text-charcoal font-heading text-lg">&#9733;</span>
              </div>
              <div>
                <div className="text-primary font-heading text-lg mb-1">Refer a Friend</div>
                <div className="text-secondary text-sm">
                  Share your referral code with a friend. When they book their first visit, you both earn bonus points!
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-card bg-secondary p-5">
              <div className={`${modalLabelClass} mb-2`}>{tierProgress.headline}</div>
              {tier.nextTier ? (
                <>
                  <div className="text-primary font-heading text-base">{getNextTierUpsellBenefit(tier)}</div>
                  <div className="mt-3 text-sm text-secondary">
                    {tierProgress.progressDetail}. Membership tier is based on rolling 12-month spend — redeeming points does not change your tier.
                  </div>
                </>
              ) : (
                <div className="text-sm text-secondary">{tierProgress.progressDetail}</div>
              )}
            </div>
            <LoyaltyTermsSummary variant="compact" />
          </div>
        </AppModal>

        <AppModal
          open={showDetailModal && !!selectedBooking}
          onClose={() => setShowDetailModal(false)}
          title="Appointment Details"
          scrollBody
          zIndex="z-50"
          footer={
            <button type="button" onClick={() => setShowDetailModal(false)} className={modalBtnPrimary}>
              Close
            </button>
          }
        >
          {selectedBooking && (
            <div className="space-y-4">
              <div>
                <div className={modalLabelClass}>Services</div>
                <div className="text-primary font-heading text-lg">{selectedBooking.add_ons || selectedBooking.services?.name || 'N/A'}</div>
              </div>
              {(selectedBooking.final_price || selectedBooking.services?.price) ? (
                <div>
                  <div className={modalLabelClass}>Total Price</div>
                  <div className="text-gold-strong font-heading text-xl">${(selectedBooking.final_price || selectedBooking.services?.price || 0).toFixed(2)}</div>
                </div>
              ) : null}
              <div>
                <div className={modalLabelClass}>Date & Time</div>
                <div className="text-primary">
                  {new Date(selectedBooking.checked_in_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at{' '}
                  {new Date(selectedBooking.checked_in_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </div>
              </div>
              <div>
                <div className={modalLabelClass}>Status</div>
                <span className={`px-3 py-1 text-xs border rounded-full ${statusColors[selectedBooking.status]}`}>{statusLabels[selectedBooking.status]}</span>
              </div>
              {selectedBooking.technician?.name && (
                <div>
                  <div className={modalLabelClass}>Technician</div>
                  <div className="text-primary">{selectedBooking.technician.name}</div>
                </div>
              )}
              {selectedBooking.cancellation_reason && (
                <div>
                  <div className={modalLabelClass}>Cancellation Reason</div>
                  <div className="text-secondary">{selectedBooking.cancellation_reason}</div>
                </div>
              )}
            </div>
          )}
        </AppModal>
      </div>

      {promosEnabled ? (
        <>
          <PromoSlideIn
            promo={currentSlideInPromo}
            visible={chipReady}
            detailOpen={Boolean(detailPromo)}
            onOpenDetail={openSlideInDetail}
            onAutoHide={advanceSlideInQueue}
          />
          <PromoDetailModal
            promo={detailPromo}
            onClose={closeSlideInDetail}
            onCopy={copyCode}
          />
        </>
      ) : null}
      {showMysteryGiftSlideIn ? (
        <MysteryGiftSlideIn
          visible={showMysteryGiftSlideIn}
          detailOpen={mysteryGiftDetailOpen}
          onOpenDetail={openMysteryGiftDetail}
          onAutoHide={dismissMysteryGiftSlideIn}
        />
      ) : null}
      <MysteryGiftDetailModal
        open={mysteryGiftDetailOpen}
        status={mysteryGiftStatus}
        onClose={closeMysteryGiftDetail}
      />
      {promoToast ? (
        <div
          role="status"
          className="fixed bottom-24 right-6 z-50 rounded-xl bg-card border border-card px-4 py-2 text-sm text-gold-strong shadow-lg"
        >
          {promoToast}
        </div>
      ) : null}
    </div>
  );
}
