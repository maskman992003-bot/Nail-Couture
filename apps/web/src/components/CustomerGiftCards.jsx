import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { CUSTOMER_GIFT_CARDS } from '@nail-couture/shared/constants/featureFlags';
import {
  canTransferGiftCard,
  formatGiftCardCode,
  getGiftCardDisplayStatus,
  getGiftCardExpiryLabel,
  getGiftCardGiftedFromLabel,
  getGiftCardRecipientLabel,
  getMyGiftCards,
  isGiftCardExpired,
  maskGiftCardCode,
  GIFT_CARD_STATUS_LABELS,
  transferGiftCard,
} from '@nail-couture/shared/utils/giftCards';
import Sidebar from './Sidebar';
import clsx from 'clsx';

function GiftCardRow({ card, theme, onTransfer, showTransfer, hideFullCode, showRecipient }) {
  const isDark = theme === 'dark';
  const [revealed, setRevealed] = useState(false);
  const muted = isDark ? 'text-offwhite/60' : 'text-charcoal/60';
  const maskedCode = maskGiftCardCode(card.code);
  const giftedFromLabel = getGiftCardGiftedFromLabel(card);
  const recipientLabel = showRecipient ? getGiftCardRecipientLabel(card) : null;

  return (
    <div className={clsx('border rounded-xl p-5', isDark ? 'border-gold/20 bg-offwhite/5' : 'border-gold/30 bg-white')}>
      <div className="flex justify-between items-start gap-4 mb-3">
        <div>
          <div className="font-heading text-2xl text-gold">${Number(card.balance || 0).toFixed(2)}</div>
          <div className={clsx('text-sm', muted)}>
            {GIFT_CARD_STATUS_LABELS[getGiftCardDisplayStatus(card)] || card.status}
          </div>
          {getGiftCardExpiryLabel(card) && (
            <div className={clsx('text-xs mt-0.5', isGiftCardExpired(card) ? 'text-red-400/80' : muted)}>
              {getGiftCardExpiryLabel(card)}
            </div>
          )}
          {giftedFromLabel && (
            <div className={clsx('text-xs mt-1', muted)}>{giftedFromLabel}</div>
          )}
        </div>
        <div className="text-right">
          <div className="font-heading text-5xl text-gold">${Number(card.initial_amount || 0).toFixed(2)}</div>
          {recipientLabel && <div className={clsx('text-sm mt-1', muted)}>{recipientLabel}</div>}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        {hideFullCode ? (
          <span className="font-mono text-sm text-gold">{maskedCode}</span>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="font-mono text-sm text-gold hover:underline"
          >
            {revealed ? formatGiftCardCode(card.code) : maskedCode}
          </button>
        )}
        {showTransfer && canTransferGiftCard(card) && (
          <button type="button" onClick={() => onTransfer(card)} className="text-sm text-gold hover:underline">
            Gift to a friend
          </button>
        )}
      </div>
      {card.gift_message && (
        <p className={clsx('text-sm mt-3 italic', muted)}>&ldquo;{card.gift_message}&rdquo;</p>
      )}
    </div>
  );
}

export default function CustomerGiftCards() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [owned, setOwned] = useState([]);
  const [purchasedForOthers, setPurchasedForOthers] = useState([]);
  const [transferTarget, setTransferTarget] = useState(null);
  const [transferStep, setTransferStep] = useState('form');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [transferMessage, setTransferMessage] = useState('');
  const [transferError, setTransferError] = useState('');
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user && ['super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician'].includes(user.role)) {
      navigate(`/${user.role}`);
      return;
    }
    if (!CUSTOMER_GIFT_CARDS) return;
    loadCards();
  }, [user, navigate]);

  const loadCards = async () => {
    if (!user?.phone) return;
    setLoading(true);
    try {
      const data = await getMyGiftCards(user.phone);
      setOwned(data.owned || []);
      setPurchasedForOthers(data.purchased_for_others || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const closeTransferModal = () => {
    setTransferTarget(null);
    setTransferStep('form');
    setRecipientPhone('');
    setTransferMessage('');
    setTransferError('');
  };

  const openTransferModal = (card) => {
    setTransferTarget(card);
    setTransferStep('form');
    setRecipientPhone('');
    setTransferMessage('');
    setTransferError('');
  };

  const handleTransferFormSubmit = (e) => {
    e.preventDefault();
    if (!transferTarget || !recipientPhone.trim()) return;
    setTransferError('');
    setTransferStep('confirm');
  };

  const executeTransfer = async () => {
    if (!transferTarget || !user?.phone) return;
    setTransferring(true);
    setTransferError('');
    try {
      const result = await transferGiftCard({
        ownerPhone: user.phone,
        giftCardId: transferTarget.id,
        recipientPhone: recipientPhone.trim(),
        giftMessage: transferMessage || null,
      });
      if (!result.success) {
        setTransferError(result.error || 'Transfer failed');
        setTransferStep('form');
        return;
      }
      closeTransferModal();
      await loadCards();
    } catch (err) {
      setTransferError(err.message || 'Transfer failed');
      setTransferStep('form');
    } finally {
      setTransferring(false);
    }
  };

  const confirmTransfer = async () => {
    await executeTransfer();
  };

  if (!CUSTOMER_GIFT_CARDS) return null;

  const bgClass = clsx(
    'min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64',
    isDark ? 'bg-[#0B0B0C] text-white' : 'bg-white text-charcoal',
  );
  const inputClass = isDark
    ? 'w-full px-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg'
    : 'w-full px-4 py-3 bg-charcoal/5 border border-charcoal/20 text-charcoal rounded-lg';
  const cardClass = clsx('border rounded-xl p-6', isDark ? 'bg-offwhite/5 border-gold/20' : 'bg-white border-gold/30');

  if (loading) {
    return (
      <div className={bgClass}>
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={bgClass}>
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 max-w-2xl mx-auto">
        <div className={clsx('px-2 py-4 border-b mb-6', isDark ? 'border-gold/10' : 'border-gold/30')}>
          <h1 className="font-heading text-3xl text-gold">Gift Cards</h1>
        </div>

        <section className="mb-8">
          <h2 className="font-heading text-xl mb-4">My Cards</h2>
          {owned.length > 0 ? (
            <div className="space-y-4">
              {owned.map((card) => (
                <GiftCardRow
                  key={card.id}
                  card={card}
                  theme={theme}
                  showTransfer
                  onTransfer={openTransferModal}
                />
              ))}
            </div>
          ) : (
            <p className={isDark ? 'text-offwhite/50' : 'text-charcoal/50'}>
              No gift cards yet. Ask the front desk to purchase one for you.
            </p>
          )}
        </section>

        {purchasedForOthers.length > 0 && (
          <section>
            <h2 className="font-heading text-xl mb-4">Purchased for Others</h2>
            <div className="space-y-4">
              {purchasedForOthers.map((card) => (
                <GiftCardRow key={card.id} card={card} theme={theme} hideFullCode showRecipient />
              ))}
            </div>
          </section>
        )}

      </div>

      {transferTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          {transferStep === 'form' ? (
            <form onSubmit={handleTransferFormSubmit} className={clsx('w-full max-w-md rounded-xl p-6 border', cardClass)}>
              <h3 className="font-heading text-xl text-gold mb-2">Gift Your Card</h3>
              <p className={clsx('text-sm mb-4', isDark ? 'text-offwhite/60' : 'text-charcoal/60')}>
                Transfer ${Number(transferTarget.balance || 0).toFixed(2)} to another registered customer.
              </p>
              <label className={clsx('block text-sm mb-2', isDark ? 'text-offwhite/80' : 'text-charcoal/80')}>Recipient Phone</label>
              <input
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className={clsx(inputClass, 'mb-4')}
                required
              />
              <label className={clsx('block text-sm mb-2', isDark ? 'text-offwhite/80' : 'text-charcoal/80')}>Message (optional)</label>
              <textarea
                value={transferMessage}
                onChange={(e) => setTransferMessage(e.target.value)}
                className={clsx(inputClass, 'mb-4 resize-none')}
                rows={2}
              />
              {transferError && <p className="text-red-400 text-sm mb-3">{transferError}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={closeTransferModal} className={clsx('flex-1 py-2 border rounded-lg', isDark ? 'border-offwhite/20' : 'border-charcoal/20')}>
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 bg-gold text-charcoal rounded-lg font-heading">
                  Continue
                </button>
              </div>
            </form>
          ) : (
            <div className={clsx('w-full max-w-md rounded-xl p-6 border', cardClass)}>
              <h3 className="font-heading text-xl text-gold mb-2">Confirm Gift Transfer</h3>
              <p className={clsx('text-sm mb-3', isDark ? 'text-offwhite/70' : 'text-charcoal/70')}>
                Send your{' '}
                <span className="text-gold font-semibold">${Number(transferTarget.balance || 0).toFixed(2)}</span>
                {' '}gift card to{' '}
                <span className="font-medium">{recipientPhone.trim()}</span>?
              </p>
              {transferMessage.trim() && (
                <p className={clsx('text-sm mb-3 italic', isDark ? 'text-offwhite/60' : 'text-charcoal/60')}>
                  Message: &ldquo;{transferMessage.trim()}&rdquo;
                </p>
              )}
              <p className={clsx('text-sm mb-4', isDark ? 'text-offwhite/50' : 'text-charcoal/50')}>
                This transfer cannot be undone. You will lose access to this card once it is sent.
              </p>
              {transferError && <p className="text-red-400 text-sm mb-3">{transferError}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setTransferStep('form'); setTransferError(''); }}
                  disabled={transferring}
                  className={clsx('flex-1 py-2 border rounded-lg disabled:opacity-50', isDark ? 'border-offwhite/20' : 'border-charcoal/20')}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={confirmTransfer}
                  disabled={transferring}
                  className="flex-1 py-2 bg-gold text-charcoal rounded-lg font-heading disabled:opacity-50"
                >
                  {transferring ? 'Sending…' : 'Confirm & Send'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
