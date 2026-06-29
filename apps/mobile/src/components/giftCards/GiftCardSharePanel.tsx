import { useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {
  buildGiftCardClaimUrl,
  maskPhoneForDisplay,
} from '@nail-couture/shared/utils/giftCards.js';
import { useThemeStyles } from '../../theme/useThemeStyles';

type GiftCardSharePanelProps = {
  claimToken: string;
  amount?: number;
  recipientName?: string | null;
  pendingRecipientPhone?: string | null;
  compact?: boolean;
};

export function GiftCardSharePanel({
  claimToken,
  amount,
  recipientName,
  pendingRecipientPhone,
  compact = false,
}: GiftCardSharePanelProps) {
  const styles = useThemeStyles();
  const [shared, setShared] = useState(false);
  const claimUrl = buildGiftCardClaimUrl('https://www.nailcouture.net', claimToken);
  const maskedPhone = maskPhoneForDisplay(pendingRecipientPhone || '');
  const label = recipientName?.trim() || maskedPhone;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `You have a gift card waiting! Claim it here: ${claimUrl}`,
        url: claimUrl,
        title: 'Claim your gift card',
      });
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // User dismissed share sheet
    }
  };

  if (!claimToken) return null;

  return (
    <View style={[styles.card, { padding: compact ? 12 : 16, gap: 12 }]}>
      <Text style={[styles.textGold, { fontWeight: '600', fontSize: compact ? 16 : 18 }]}>
        Share with your friend
      </Text>
      <Text style={styles.textSecondary}>
        Send this to {label}. They must register with {maskedPhone}
        {amount != null ? ` to claim this $${Number(amount).toFixed(0)} gift card` : ' to claim'}.
      </Text>
      <View style={{ alignItems: 'center', paddingVertical: 8 }}>
        <QRCode value={claimUrl} size={compact ? 140 : 168} color="#C5A059" backgroundColor="transparent" />
      </View>
      <Text style={[styles.textSecondary, { fontSize: 11 }]} numberOfLines={2}>
        {claimUrl}
      </Text>
      <Pressable onPress={handleShare} style={[styles.buttonPrimary, { alignItems: 'center' }]}>
        <Text style={styles.buttonPrimaryText}>{shared ? 'Shared!' : 'Share claim link'}</Text>
      </Pressable>
    </View>
  );
}
