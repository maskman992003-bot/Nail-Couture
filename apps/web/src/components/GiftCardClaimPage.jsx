import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import BrandLogo from './BrandLogo.jsx';
import { GiftCardVisual } from './GiftCardVisual';
import {
  formatGiftCardExpiryDate,
  getGiftCardClaimPreview,
} from '@nail-couture/shared/utils/giftCards';
import clsx from 'clsx';
import useRegisterPullToRefresh from '../hooks/useRegisterPullToRefresh';

export default function GiftCardClaimPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await getGiftCardClaimPreview(token);
        if (!cancelled) setPreview(data);
      } catch {
        if (!cancelled) {
          setPreview({ success: false, error: 'error', message: 'Could not load this gift link.' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const reloadPreview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getGiftCardClaimPreview(token);
      setPreview(data);
    } catch {
      setPreview({ success: false, error: 'error', message: 'Could not load this gift link.' });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useRegisterPullToRefresh(reloadPreview);

  const bgClass = isDark ? 'bg-primary text-offwhite' : 'bg-white text-charcoal';
  const cardClass = isDark
    ? 'bg-[#111] border border-gold/20 rounded-2xl p-8 shadow-xl'
    : 'bg-white border border-gold/30 rounded-2xl p-8 shadow-xl';
  const mutedClass = isDark ? 'text-offwhite/60' : 'text-charcoal/60';

  if (loading) {
    return (
      <div className={clsx('min-h-screen flex items-center justify-center', bgClass)}>
        <div className="text-gold animate-pulse">Loading your gift...</div>
      </div>
    );
  }

  if (!preview?.success) {
    const error = preview?.error;
    const loginPath = preview?.login_path || '/login';

    return (
      <div className={clsx('min-h-screen flex flex-col items-center justify-center p-6', bgClass)}>
        <BrandLogo className="h-12 mb-8" />
        <div className={clsx('max-w-md w-full text-center', cardClass)}>
          <h1 className="font-heading text-2xl text-gold mb-3">
            {error === 'expired' ? 'Gift expired' : error === 'already_claimed' ? 'Already claimed' : error === 'account_exists' ? 'Account found' : 'Gift not found'}
          </h1>
          <p className={mutedClass}>{preview?.message || 'This gift link is not valid.'}</p>
          {(error === 'account_exists' || error === 'already_claimed') && (
            <Link
              to={loginPath}
              className="inline-block mt-6 px-8 py-3 rounded-full bg-gold text-charcoal text-sm font-heading uppercase tracking-wider hover:bg-gold/90"
            >
              Log in
            </Link>
          )}
          <button
            type="button"
            onClick={() => navigate('/')}
            className={clsx('block mx-auto mt-4 text-sm text-gold hover:underline')}
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  const registerTo = preview.register_path || `/register?gift=${encodeURIComponent(token)}`;
  const fromLabel = preview.buyer_first_name
    ? `From ${preview.buyer_first_name}`
    : 'A friend sent you a gift';

  return (
    <div className={clsx('min-h-screen flex flex-col items-center py-10 px-6', bgClass)}>
      <BrandLogo className="h-12 mb-6" />
      <div className={clsx('max-w-lg w-full', cardClass)}>
        <div className="text-center mb-6">
          <h1 className="font-heading text-3xl text-gold mb-2">You received a gift!</h1>
          <p className={mutedClass}>{fromLabel}</p>
        </div>

        <GiftCardVisual
          isDark={isDark}
          claimPreview
          balance={preview.balance ?? preview.amount}
          initialAmount={preview.amount}
          ownerName={preview.recipient_name || 'You'}
          statusText="Waiting to claim"
          expiryText={preview.expires_at ? `Expires ${formatGiftCardExpiryDate(preview.expires_at)}` : null}
          giftedFromText={fromLabel}
          giftMessage={preview.gift_message}
        />

        <p className={clsx('text-sm text-center mt-6', mutedClass)}>
          Register with phone <span className="text-gold font-medium">{preview.masked_phone}</span> to add this gift to your wallet.
        </p>

        <Link
          to={registerTo}
          className="block w-full mt-6 py-3 rounded-full bg-gold text-charcoal text-center text-sm font-heading uppercase tracking-[0.2em] hover:bg-gold/90 transition-colors"
        >
          Claim your gift — create account
        </Link>
      </div>
    </div>
  );
}
