import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { usePromotionsAdmin } from '@nail-couture/shared/hooks/usePromotions.js';
import {
  formatPromotionAudience,
  formatPromotionKind,
  formatPromotionSurfaces,
  formatPromotionValidity,
  canHaveActivePromotion,
  getActivePromotionLimitMessage,
} from '@nail-couture/shared/utils/promotions.js';
import { useThemeStyles } from '../../theme/useThemeStyles';

function defaultDatetimeLocal(daysFromNow = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function createEmptyForm() {
  return {
    id: null as string | null,
    slug: '',
    kind: 'seasonal',
    title: '',
    subtitle: '',
    body: '',
    promo_code: '',
    discount_label: '',
    audience: 'all',
    display_surfaces: ['public_home'] as string[],
    starts_at: defaultDatetimeLocal(0),
    ends_at: defaultDatetimeLocal(30),
    is_active: true,
    show_slide_in: false,
    show_shimmer_cta: true,
    slide_in_auto_hide_seconds: '',
    suppress_after_dismiss: false,
    suppress_after_copy: false,
    sort_order: 0,
  };
}

const EMPTY_FORM = createEmptyForm();

type PromotionsAdminPanelProps = {
  userPhone?: string | null;
  userRole?: string | null;
};

type SaveFeedback = { type: 'success' | 'error'; text: string } | null;

function toDatetimeLocal(value: unknown) {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocal(value: string) {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function PromotionsAdminPanel({ userPhone, userRole }: PromotionsAdminPanelProps) {
  const styles = useThemeStyles();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback>(null);

  const { promotions, loading, saving, error, setError, save, setActive, remove } = usePromotionsAdmin(
    userPhone,
    userRole,
  );

  const loadPromotion = (promo: Record<string, unknown>) => {
    setForm({
      id: String(promo.id),
      slug: String(promo.slug || ''),
      kind: String(promo.kind || 'general'),
      title: String(promo.title || ''),
      subtitle: String(promo.subtitle || ''),
      body: String(promo.body || ''),
      promo_code: String(promo.promo_code || ''),
      discount_label: String(promo.discount_label || ''),
      audience: String(promo.audience || 'all'),
      display_surfaces: (promo.display_surfaces as string[]) || ['public_home'],
      starts_at: toDatetimeLocal(promo.starts_at),
      ends_at: toDatetimeLocal(promo.ends_at),
      is_active: promo.is_active !== false,
      show_slide_in: Boolean(promo.show_slide_in),
      show_shimmer_cta: Boolean(promo.show_shimmer_cta),
      slide_in_auto_hide_seconds: promo.slide_in_auto_hide_seconds
        ? String(promo.slide_in_auto_hide_seconds)
        : '',
      suppress_after_dismiss: Boolean(promo.suppress_after_dismiss),
      suppress_after_copy: Boolean(promo.suppress_after_copy),
      sort_order: Number(promo.sort_order || 0),
    });
    setSaveFeedback(null);
    setError('');
  };

  const toggleSurface = (surfaceId: string) => {
    setForm((prev) => {
      const surfaces = new Set(prev.display_surfaces);
      if (surfaces.has(surfaceId)) surfaces.delete(surfaceId);
      else surfaces.add(surfaceId);
      return { ...prev, display_surfaces: [...surfaces] };
    });
  };

  const handleSave = async () => {
    setSaveFeedback(null);
    setError('');

    if (!form.slug.trim() || !form.title.trim()) {
      setSaveFeedback({ type: 'error', text: 'Slug and title are required.' });
      return;
    }
    if (!form.starts_at.trim()) {
      setSaveFeedback({ type: 'error', text: 'Start date and time are required.' });
      return;
    }
    if (!form.ends_at.trim()) {
      setSaveFeedback({ type: 'error', text: 'End date and time are required.' });
      return;
    }

    const startsAt = fromDatetimeLocal(form.starts_at);
    const endsAt = fromDatetimeLocal(form.ends_at);
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      setSaveFeedback({ type: 'error', text: 'End date must be after the start date.' });
      return;
    }

    if (form.is_active && !canHaveActivePromotion(
      promotions,
      { audience: form.audience, starts_at: startsAt, ends_at: endsAt },
      form.id,
    )) {
      setSaveFeedback({ type: 'error', text: getActivePromotionLimitMessage(form.audience) });
      return;
    }

    const saved = await save({
      ...form,
      slide_in_auto_hide_seconds: form.slide_in_auto_hide_seconds
        ? Number(form.slide_in_auto_hide_seconds)
        : null,
      starts_at: startsAt,
      ends_at: endsAt,
    });
    if (saved) {
      setSaveFeedback({ type: 'success', text: 'Promotion saved.' });
      loadPromotion(saved as Record<string, unknown>);
    }
  };

  const confirmDelete = (promo: (typeof promotions)[number]) => {
    Alert.alert(
      'Delete promotion?',
      `Remove "${promo.title}" (${promo.promo_code}) permanently? It will stop appearing on home screens. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const deleted = await remove(promo.id);
            if (deleted) {
              setSaveFeedback({ type: 'success', text: `Deleted "${promo.title}".` });
              if (form.id === promo.id) {
                setForm(createEmptyForm());
                setSaveFeedback(null);
                setError('');
              }
            }
          },
        },
      ],
    );
  };

  const inputStyle = [styles.input, { marginTop: 6 }];

  return (
    <View style={{ gap: 16 }}>
      <View style={[styles.card, { padding: 16, gap: 12 }]}>
        <Text style={[styles.textGold, { fontSize: 18, fontWeight: '600' }]}>
          {form.id ? 'Edit promotion' : 'New promotion'}
        </Text>

        <View>
          <Text style={styles.textSecondary}>Slug</Text>
          <TextInput style={inputStyle} value={form.slug} onChangeText={(slug) => setForm({ ...form, slug })} />
        </View>
        <View>
          <Text style={styles.textSecondary}>Title</Text>
          <TextInput style={inputStyle} value={form.title} onChangeText={(title) => setForm({ ...form, title })} />
        </View>
        <View>
          <Text style={styles.textSecondary}>Body</Text>
          <TextInput
            style={[inputStyle, { minHeight: 80, textAlignVertical: 'top' }]}
            multiline
            value={form.body}
            onChangeText={(body) => setForm({ ...form, body })}
          />
        </View>
        <View>
          <Text style={styles.textSecondary}>Promo code</Text>
          <TextInput
            style={inputStyle}
            autoCapitalize="characters"
            value={form.promo_code}
            onChangeText={(promo_code) => setForm({ ...form, promo_code: promo_code.toUpperCase() })}
          />
        </View>
        <View>
          <Text style={styles.textSecondary}>Discount label</Text>
          <TextInput
            style={inputStyle}
            value={form.discount_label}
            onChangeText={(discount_label) => setForm({ ...form, discount_label })}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {['public_home', 'customer_home'].map((surface) => {
            const active = form.display_surfaces.includes(surface);
            return (
              <Pressable
                key={surface}
                onPress={() => toggleSurface(surface)}
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? styles.tokens.goldStrong : styles.tokens.borderColor,
                  backgroundColor: active ? `${styles.tokens.goldStrong}15` : 'transparent',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={active ? styles.textGold : styles.textSecondary}>
                  {surface === 'public_home' ? 'Public home' : 'Customer home'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View>
          <Text style={styles.textSecondary}>Starts (YYYY-MM-DDTHH:mm)</Text>
          <TextInput
            style={inputStyle}
            value={form.starts_at}
            onChangeText={(starts_at) => setForm({ ...form, starts_at })}
            placeholder="2026-06-14T09:00"
          />
        </View>
        <View>
          <Text style={styles.textSecondary}>Ends (YYYY-MM-DDTHH:mm)</Text>
          <TextInput
            style={inputStyle}
            value={form.ends_at}
            onChangeText={(ends_at) => setForm({ ...form, ends_at })}
            placeholder="2026-06-20T18:00"
          />
        </View>

        <View>
          <Text style={styles.textSecondary}>Auto-hide chip (seconds, 0 = until user closes it)</Text>
          <TextInput
            style={inputStyle}
            keyboardType="number-pad"
            value={form.slide_in_auto_hide_seconds}
            onChangeText={(slide_in_auto_hide_seconds) => setForm({ ...form, slide_in_auto_hide_seconds })}
            placeholder="0"
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.textSecondary}>Shimmer card</Text>
          <Switch value={form.show_shimmer_cta} onValueChange={(show_shimmer_cta) => setForm({ ...form, show_shimmer_cta })} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.textSecondary}>Active</Text>
          <Switch value={form.is_active} onValueChange={(is_active) => setForm({ ...form, is_active })} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={{
              borderRadius: 12,
              backgroundColor: styles.tokens.goldStrong,
              paddingVertical: 14,
              paddingHorizontal: 20,
              opacity: saving ? 0.6 : 1,
            }}
          >
            <Text style={{ color: '#121212', fontWeight: '600' }}>{saving ? 'Saving…' : 'Save promotion'}</Text>
          </Pressable>
          {saveFeedback ? (
            <Text style={{ color: saveFeedback.type === 'success' ? styles.tokens.goldStrong : '#f87171' }}>
              {saveFeedback.text}
            </Text>
          ) : null}
          {!saveFeedback && error ? (
            <Text style={{ color: '#f87171' }}>{error}</Text>
          ) : null}
        </View>
      </View>

      <View style={[styles.card, { padding: 16, gap: 12 }]}>
        <Text style={[styles.textGold, { fontSize: 18, fontWeight: '600' }]}>All promotions</Text>
        {loading ? <ActivityIndicator color={styles.tokens.goldStrong} /> : null}
        {promotions.map((promo) => {
          const activationBlocked = !promo.is_active
            && !canHaveActivePromotion(promotions, promo, promo.id);

          return (
          <View key={promo.id} style={{ borderTopWidth: 1, borderTopColor: styles.tokens.borderLight, paddingTop: 12, gap: 6 }}>
            <Text style={[styles.textPrimary, { fontWeight: '600' }]}>{promo.title}</Text>
            <Text style={styles.textSecondary}>
              {formatPromotionKind(promo.kind)} · {formatPromotionAudience(promo.audience)}
            </Text>
            <Text style={styles.textSecondary}>
              {formatPromotionSurfaces(promo.display_surfaces)}
            </Text>
            <Text style={styles.textGold}>{formatPromotionValidity(promo.starts_at, promo.ends_at)}</Text>
            <Text style={[styles.textSecondary, { fontFamily: 'monospace' }]}>{promo.promo_code}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => loadPromotion(promo)}
                style={{
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: styles.tokens.borderColor,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={styles.textSecondary}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (activationBlocked) return;
                  setSaveFeedback(null);
                  setActive(promo.id, !promo.is_active);
                }}
                disabled={saving || activationBlocked}
                style={{
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: styles.tokens.borderColor,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  opacity: saving || activationBlocked ? 0.5 : 1,
                }}
              >
                <Text style={styles.textSecondary}>{promo.is_active ? 'Deactivate' : 'Activate'}</Text>
              </Pressable>
              <Pressable
                onPress={() => confirmDelete(promo)}
                style={{
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#f87171',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: '#f87171' }}>Delete</Text>
              </Pressable>
            </View>
          </View>
          );
        })}
      </View>
    </View>
  );
}
