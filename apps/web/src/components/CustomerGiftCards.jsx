import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { CUSTOMER_GIFT_CARDS } from '@nail-couture/shared/constants/featureFlags';
import {
  canTransferGiftCard,
  formatGiftCardCode,
  getGiftCardDisplayStatus,
  getGiftCardExpiryLabel,
  getGiftCardGiftedFromLabel,
  getMyGiftCards,
  isGiftCardExpired,
  maskGiftCardCode,
  GIFT_CARD_STATUS_LABELS,
  transferGiftCard,
} from '@nail-couture/shared/utils/giftCards';
import { getHomePath } from '@nail-couture/shared/utils/routes';
import {
  GIFT_CARDS_PAGE_SIZE,
  paginateRows,
} from '@nail-couture/shared/utils/pagination.js';
import Sidebar from './Sidebar';
import { GiftCardVisual } from './GiftCardVisual';
import ListPagination from './ListPagination.jsx';
import AppModal, { modalBtnPrimary, modalBtnSecondary, modalFooterClass, modalInputClass, modalTextareaClass } from './AppModal';
import clsx from 'clsx';

function GiftCardRow({ card, theme, onTransfer, showTransfer, hideFullCode }) {
  const isDark = theme === 'dark';
  const [revealed, setRevealed] = useState(false);
  const maskedCode = maskGiftCardCode(card.code);
  const codeDisplay = revealed ? formatGiftCardCode(card.code) : maskedCode;
  const giftedFromLabel = getGiftCardGiftedFromLabel(card);

  return (
    <GiftCardVisual
      isDark={isDark}
      balance={card.balance}
      initialAmount={card.initial_amount}
      ownerName={card.owner_name}
      statusText={GIFT_CARD_STATUS_LABELS[getGiftCardDisplayStatus(card)] || card.status}
      expiryText={getGiftCardExpiryLabel(card)}
      expiryExpired={isGiftCardExpired(card)}
      giftedFromText={giftedFromLabel}
      giftMessage={card.gift_message}
      codeDisplay={codeDisplay}
      codeInteractive={!hideFullCode}
      onCodeClick={() => setRevealed((v) => !v)}
      footer={
        showTransfer && canTransferGiftCard(card) ? (
          <button type="button" onClick={() => onTransfer(card)} className="text-sm text-gold hover:underline">
            Gift to a friend
          </button>
        ) : null
      }
    />
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
  const [ownedPage, setOwnedPage] = useState(1);
  const [purchasedPage, setPurchasedPage] = useState(1);

  const ownedPagination = useMemo(
    () => paginateRows(owned, ownedPage, GIFT_CARDS_PAGE_SIZE),
    [owned, ownedPage],
  );

  const purchasedPagination = useMemo(
    () => paginateRows(purchasedForOthers, purchasedPage, GIFT_CARDS_PAGE_SIZE),
    [purchasedForOthers, purchasedPage],
  );

  useEffect(() => {
    setOwnedPage(1);
  }, [owned]);

  useEffect(() => {
    setPurchasedPage(1);
  }, [purchasedForOthers]);

  useEffect(() => {
    if (ownedPage > ownedPagination.totalPages) {
      setOwnedPage(ownedPagination.totalPages);
    }
  }, [ownedPage, ownedPagination.totalPages]);

  useEffect(() => {
    if (purchasedPage > purchasedPagination.totalPages) {
      setPurchasedPage(purchasedPagination.totalPages);
    }
  }, [purchasedPage, purchasedPagination.totalPages]);

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

  if (!CUSTOMER_GIFT_CARDS) {
    return <Navigate to={user ? getHomePath(user.role) : '/portal'} replace />;
  }

  const bgClass = clsx(
    'min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64',
    isDark ? 'bg-primary text-primary' : 'bg-white text-charcoal',
  );

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
      <div className="p-4 md:p-6 lg:p-8 mobile-page max-w-2xl mx-auto">
        <div className={clsx('px-2 py-4 border-b mb-6', isDark ? 'border-gold/10' : 'border-gold/30')}>
          <h1 className="font-heading text-3xl text-gold">Gift Cards</h1>
        </div>

        <section className="mb-8">
          <h2 className="font-heading text-xl mb-4">My Cards</h2>
          {owned.length > 0 ? (
            <>
              <div className="space-y-4">
                {ownedPagination.pageRows.map((card) => (
                  <GiftCardRow
                    key={card.id}
                    card={card}
                    theme={theme}
                    showTransfer
                    onTransfer={openTransferModal}
                  />
                ))}
              </div>
              <ListPagination pagination={ownedPagination} onPageChange={setOwnedPage} className="mt-4" />
            </>
          ) : (
            <p className={isDark ? 'text-offwhite/50' : 'text-charcoal/50'}>
              No gift cards yet. Ask the front desk to purchase one for you or your beloved.
            </p>
          )}
        </section>

        {purchasedForOthers.length > 0 && (
          <section>
            <h2 className="font-heading text-xl mb-4">Purchased for Others</h2>
            <div className="space-y-4">
              {purchasedPagination.pageRows.map((card) => (
                <GiftCardRow key={card.id} card={card} theme={theme} hideFullCode />
              ))}
            </div>
            <ListPagination pagination={purchasedPagination} onPageChange={setPurchasedPage} className="mt-4" />
          </section>
        )}

      </div>

      {transferTarget ? (
        transferStep === 'form' ? (
          <AppModal
            open
            onClose={closeTransferModal}
            title="Gift Your Card"
            subtitle={`Transfer $${Number(transferTarget.balance || 0).toFixed(2)} to another registered customer.`}
            scrollBody
            footer={(
              <>
                <button type="button" onClick={closeTransferModal} className={modalBtnSecondary}>
                  Cancel
                </button>
                <button
                  type="submit"
                  form="gift-card-transfer-form"
                  className={modalBtnPrimary}
                >
                  Continue
                </button>
              </>
            )}
          >
            <form id="gift-card-transfer-form" onSubmit={handleTransferFormSubmit} className="space-y-4">
              <div>
                <label className={clsx('block text-sm mb-2', isDark ? 'text-offwhite/80' : 'text-charcoal/80')}>
                  Recipient Phone
                </label>
                <input
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className={modalInputClass}
                  required
                />
              </div>
              <div>
                <label className={clsx('block text-sm mb-2', isDark ? 'text-offwhite/80' : 'text-charcoal/80')}>
                  Message (optional)
                </label>
                <textarea
                  value={transferMessage}
                  onChange={(e) => setTransferMessage(e.target.value)}
                  className={modalTextareaClass}
                  rows={2}
                />
              </div>
              {transferError ? <p className="text-red-400 text-sm">{transferError}</p> : null}
            </form>
          </AppModal>
        ) : (
          <AppModal
            open
            onClose={() => { if (!transferring) closeTransferModal(); }}
            title="Confirm Gift Transfer"
            scrollBody
            footer={(
              <div className={modalFooterClass}>
                <button
                  type="button"
                  onClick={() => { setTransferStep('form'); setTransferError(''); }}
                  disabled={transferring}
                  className={modalBtnSecondary}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={confirmTransfer}
                  disabled={transferring}
                  className={modalBtnPrimary}
                >
                  {transferring ? 'Sending…' : 'Confirm & Send'}
                </button>
              </div>
            )}
          >
            <p className={clsx('text-sm mb-3', isDark ? 'text-offwhite/70' : 'text-charcoal/70')}>
              Send your{' '}
              <span className="text-gold font-semibold">${Number(transferTarget.balance || 0).toFixed(2)}</span>
              {' '}gift card to{' '}
              <span className="font-medium">{recipientPhone.trim()}</span>?
            </p>
            {transferMessage.trim() ? (
              <p className={clsx('text-sm mb-3 italic', isDark ? 'text-offwhite/60' : 'text-charcoal/60')}>
                Message: &ldquo;{transferMessage.trim()}&rdquo;
              </p>
            ) : null}
            <p className={clsx('text-sm', isDark ? 'text-offwhite/50' : 'text-charcoal/50')}>
              This transfer cannot be undone. You will lose access to this card once it is sent.
            </p>
            {transferError ? <p className="text-red-400 text-sm mt-3">{transferError}</p> : null}
          </AppModal>
        )
      ) : null}
    </div>
  );
}
