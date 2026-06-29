import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  formatGiftCardExpiryDate,
  getGiftCardClaimPreview,
  maskClaimPreviewText,
  maskPhoneForDisplay,
  sanitizeDisplayGiftMessage,
} from '@nail-couture/shared/utils/giftCards.js';
import type { RootStackParamList } from '../navigation/publicTypes';
import { useThemeStyles } from '../theme/useThemeStyles';

export function GiftCardClaimScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'GiftClaim'>>();
  const styles = useThemeStyles();
  const token = route.params?.token || '';

  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await getGiftCardClaimPreview(token);
        if (!cancelled) setPreview(data as Record<string, unknown>);
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={styles.tokens.goldStrong} />
        <Text style={[styles.textSecondary, { marginTop: 12 }]}>Loading your gift...</Text>
      </SafeAreaView>
    );
  }

  if (!preview?.success) {
    const error = String(preview?.error || '');
    return (
      <SafeAreaView style={[styles.screen, { padding: 24 }]}>
        <View style={[styles.card, { padding: 24, gap: 12 }]}>
          <Text style={[styles.textGold, { fontSize: 24, fontWeight: '600', textAlign: 'center' }]}>
            {error === 'expired' ? 'Gift expired' : error === 'already_claimed' ? 'Already claimed' : error === 'account_exists' ? 'Account found' : 'Gift not found'}
          </Text>
          <Text style={[styles.textSecondary, { textAlign: 'center' }]}>
            {String(preview?.message || 'This gift link is not valid.')}
          </Text>
          {(error === 'account_exists' || error === 'already_claimed') && (
            <Pressable onPress={() => navigation.navigate('Login')} style={styles.buttonPrimary}>
              <Text style={styles.buttonPrimaryText}>Log in</Text>
            </Pressable>
          )}
          <Pressable onPress={() => navigation.navigate('Public')} style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Text style={styles.textGold}>Back to home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const fromLabel = preview.buyer_first_name
    ? `From ${String(preview.buyer_first_name)}`
    : 'A friend sent you a gift';

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
        <Text style={[styles.textGold, { fontSize: 28, fontWeight: '600', textAlign: 'center' }]}>
          You received a gift!
        </Text>
        <Text style={[styles.textSecondary, { textAlign: 'center' }]}>{fromLabel}</Text>

        <View style={[styles.card, { padding: 24, alignItems: 'center', gap: 8 }]}>
          <Text style={[styles.textGold, { fontSize: 40, fontWeight: '700' }]}>
            ${Number(preview.amount || 0).toFixed(2)}
          </Text>
          {sanitizeDisplayGiftMessage(String(preview.gift_message || '')) ? (
            <Text style={[styles.textSecondary, { fontStyle: 'italic', textAlign: 'center' }]}>
              &ldquo;{maskClaimPreviewText(String(preview.gift_message))}&rdquo;
            </Text>
          ) : null}
          {preview.expires_at ? (
            <Text style={styles.textSecondary}>
              Expires {formatGiftCardExpiryDate(String(preview.expires_at))}
            </Text>
          ) : null}
        </View>

        <Text style={[styles.textSecondary, { textAlign: 'center' }]}>
          Register with phone {maskPhoneForDisplay(String(preview.phone_for_registration || ''))} to add this gift to your wallet.
        </Text>

        <Pressable
          onPress={() => navigation.navigate('Register', { gift: token })}
          style={styles.buttonPrimary}
        >
          <Text style={styles.buttonPrimaryText}>Claim your gift — create account</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
