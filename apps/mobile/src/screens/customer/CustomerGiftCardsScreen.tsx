import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  canTransferGiftCard,
  formatGiftCardCode,
  getGiftCardDisplayStatus,
  getGiftCardExpiryLabel,
  getGiftCardGiftedFromLabel,
  getGiftCardRecipientLabel,
  getMyGiftCards,
  GIFT_CARD_STATUS_LABELS,
  isGiftCardExpired,
  isGiftCardPendingClaim,
  maskGiftCardCode,
  sanitizeDisplayGiftMessage,
  transferGiftCard,
} from '@nail-couture/shared/utils/giftCards.js';
import {
  GIFT_CARDS_PAGE_SIZE,
  paginateRows,
} from '@nail-couture/shared/utils/pagination.js';
import { useAuth } from '../../contexts/AuthContext';
import { CustomerScreenLayout } from '../../components/customer/CustomerScreenLayout';
import { AppModal, ModalButton } from '../../components/AppModal';
import { ListPagination } from '../../components/ListPagination';
import { GiftCardSharePanel } from '../../components/giftCards/GiftCardSharePanel';
import { useThemeStyles } from '../../theme/useThemeStyles';

type GiftCardRecord = Record<string, unknown> & {
  id: string;
  code?: string;
  balance?: number;
  initial_amount?: number;
  status?: string;
  gift_message?: string;
  owner_name?: string;
  gifted_from_name?: string;
  claim_token?: string;
  pending_recipient_phone?: string;
  recipient_name?: string;
  claim_status?: string;
};

function GiftCardRow({
  card,
  onTransfer,
  showTransfer,
  hideFullCode,
  showRecipient,
}: {
  card: GiftCardRecord;
  onTransfer?: (card: GiftCardRecord) => void;
  showTransfer?: boolean;
  hideFullCode?: boolean;
  showRecipient?: boolean;
}) {
  const styles = useThemeStyles();
  const [revealed, setRevealed] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const pending = isGiftCardPendingClaim(card);
  const maskedCode = maskGiftCardCode(String(card.code || ''));
  const giftedFromLabel = getGiftCardGiftedFromLabel(card);
  const recipientLabel = showRecipient ? getGiftCardRecipientLabel(card) : null;
  const statusLabel = pending
    ? 'Waiting for friend to claim'
    : (GIFT_CARD_STATUS_LABELS[getGiftCardDisplayStatus(card)] || card.status);

  return (
    <View style={[styles.card, { padding: 16, marginBottom: 12, gap: 8 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={[styles.textGold, { fontSize: 24, fontWeight: '600' }]}>
          ${Number(card.balance || 0).toFixed(2)}
        </Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.textGold, { fontSize: 48, fontWeight: '600' }]}>
            ${Number(card.initial_amount || 0).toFixed(2)}
          </Text>
          {recipientLabel ? (
            <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 4 }]}>{recipientLabel}</Text>
          ) : null}
        </View>
      </View>
      <Text style={styles.textSecondary}>
        {statusLabel}
      </Text>
      {getGiftCardExpiryLabel(card) ? (
        <Text style={[styles.textSecondary, { fontSize: 12 }, isGiftCardExpired(card) && { color: '#f87171' }]}>
          {getGiftCardExpiryLabel(card)}
        </Text>
      ) : null}
      {giftedFromLabel ? (
        <Text style={[styles.textSecondary, { fontSize: 12 }]}>{giftedFromLabel}</Text>
      ) : null}
      {hideFullCode || pending ? (
        <Text style={[styles.textGold, { fontFamily: 'monospace' }]}>{pending ? '' : maskedCode}</Text>
      ) : (
        <Pressable onPress={() => setRevealed((v) => !v)}>
          <Text style={[styles.textGold, { fontFamily: 'monospace' }]}>
            {revealed ? formatGiftCardCode(String(card.code || '')) : maskedCode}
          </Text>
        </Pressable>
      )}
      {pending && card.claim_token ? (
        <>
          <Pressable onPress={() => setShareOpen((v) => !v)}>
            <Text style={styles.textGold}>{shareOpen ? 'Hide share link' : 'Share claim link'}</Text>
          </Pressable>
          {shareOpen ? (
            <GiftCardSharePanel
              claimToken={String(card.claim_token)}
              amount={Number(card.initial_amount || 0)}
              recipientName={String(card.recipient_name || card.owner_name || '')}
              pendingRecipientPhone={String(card.pending_recipient_phone || '')}
              compact
            />
          ) : null}
        </>
      ) : null}
      {showTransfer && canTransferGiftCard(card) && onTransfer && (
        <Pressable onPress={() => onTransfer(card)}>
          <Text style={styles.textGold}>Gift to a friend</Text>
        </Pressable>
      )}
      {sanitizeDisplayGiftMessage(card.gift_message) ? (
        <Text style={[styles.textSecondary, { fontStyle: 'italic' }]}>
          {sanitizeDisplayGiftMessage(card.gift_message)}
        </Text>
      ) : null}
    </View>
  );
}

export function CustomerGiftCardsScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const [loading, setLoading] = useState(true);
  const [owned, setOwned] = useState<GiftCardRecord[]>([]);
  const [purchasedForOthers, setPurchasedForOthers] = useState<GiftCardRecord[]>([]);
  const [transferTarget, setTransferTarget] = useState<GiftCardRecord | null>(null);
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

  const loadCards = useCallback(async () => {
    if (!user?.phone) return;
    setLoading(true);
    try {
      const data = await getMyGiftCards(user.phone);
      setOwned((data.owned || []) as GiftCardRecord[]);
      setPurchasedForOthers((data.purchased_for_others || []) as GiftCardRecord[]);
    } finally {
      setLoading(false);
    }
  }, [user?.phone]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleTransfer = async () => {
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
        setTransferError(String(result.error || 'Transfer failed'));
        return;
      }
      setTransferTarget(null);
      setRecipientPhone('');
      setTransferMessage('');
      await loadCards();
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  if (loading) {
    return (
      <CustomerScreenLayout>
        <ActivityIndicator color={styles.tokens.goldStrong} style={{ marginTop: 40 }} />
      </CustomerScreenLayout>
    );
  }

  return (
    <CustomerScreenLayout
      title="Gift Cards"
      subtitle="Use at checkout or gift an unused card to someone else"
    >
      <Text style={[styles.textPrimary, { fontSize: 18, fontWeight: '600', marginBottom: 12 }]}>My Cards</Text>
      {owned.length > 0 ? (
        <>
          {ownedPagination.pageRows.map((card) => (
            <GiftCardRow key={card.id} card={card} showTransfer onTransfer={setTransferTarget} />
          ))}
          <ListPagination pagination={ownedPagination} onPageChange={setOwnedPage} />
        </>
      ) : (
        <Text style={styles.textSecondary}>No gift cards yet. Ask the front desk to purchase one for you or your beloved.</Text>
      )}

      {purchasedForOthers.length > 0 && (
        <>
          <Text style={[styles.textPrimary, { fontSize: 18, fontWeight: '600', marginTop: 20, marginBottom: 12 }]}>
            Purchased for Others
          </Text>
          {purchasedPagination.pageRows.map((card) => (
            <GiftCardRow key={card.id} card={card} hideFullCode showRecipient />
          ))}
          <ListPagination pagination={purchasedPagination} onPageChange={setPurchasedPage} />
        </>
      )}

      <AppModal
        open={Boolean(transferTarget)}
        onClose={() => setTransferTarget(null)}
        title="Gift Your Card"
        footer={
          <>
            <ModalButton label="Cancel" onPress={() => setTransferTarget(null)} />
            <ModalButton
              label={transferring ? 'Sending…' : 'Transfer'}
              variant="primary"
              disabled={transferring}
              onPress={handleTransfer}
            />
          </>
        }
      >
        <Text style={[styles.textSecondary, { marginBottom: 12 }]}>
          Transfer ${Number(transferTarget?.balance || 0).toFixed(2)} to another registered customer.
        </Text>
        <TextInput
          value={recipientPhone}
          onChangeText={setRecipientPhone}
          keyboardType="phone-pad"
          placeholder="Recipient phone"
          placeholderTextColor={styles.tokens.textMuted}
          style={styles.input}
        />
        <TextInput
          value={transferMessage}
          onChangeText={setTransferMessage}
          placeholder="Message (optional)"
          placeholderTextColor={styles.tokens.textMuted}
          style={styles.input}
        />
        {transferError ? <Text style={{ color: '#f87171' }}>{transferError}</Text> : null}
      </AppModal>
    </CustomerScreenLayout>
  );
}
