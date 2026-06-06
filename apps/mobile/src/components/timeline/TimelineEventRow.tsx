import { Image, Text, View } from 'react-native';
import { Icon } from '../icons/Icon';
import { useThemeStyles } from '../../theme/useThemeStyles';

export const TIMELINE_ICONS: Record<string, string> = {
  visit: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  payment: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  waiver: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  note: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  loyalty: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  photo: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  service_change: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
};

export type TimelineEvent = {
  id: string;
  type: string;
  date?: string;
  createdAt?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  amount?: number;
  status?: string;
  customer?: { full_name?: string; email?: string; phone?: string };
  meta?: Record<string, unknown>;
};

type ProfileLike = { full_name?: string; email?: string; phone?: string } | null;

export function formatTimelineDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimelineEventDisplay(event: TimelineEvent, profile: ProfileLike) {
  const metaCustomer = event.meta?.customer as ProfileLike;
  const customer = event.customer || metaCustomer || profile;
  if (!customer) {
    return { title: event.title, subtitle: event.subtitle, body: event.body };
  }

  const contact = [customer.phone, customer.email].filter(Boolean).join(' · ');
  const customerName = customer.full_name || 'Customer';

  if (event.type === 'visit' || event.type === 'payment') {
    return {
      title: customerName,
      subtitle: [contact, event.subtitle].filter(Boolean).join(' · ') || null,
      body: null,
    };
  }

  const detail = [event.title, event.subtitle, event.body].filter(Boolean).join(' · ');
  return {
    title: customerName,
    subtitle: contact || null,
    body: detail || null,
  };
}

type TimelineEventRowProps = {
  event: TimelineEvent;
  profile?: ProfileLike;
};

export function TimelineEventRow({ event, profile = null }: TimelineEventRowProps) {
  const styles = useThemeStyles();
  const display = formatTimelineEventDisplay(event, profile ?? null);
  const eventDate = event.date || event.createdAt;
  const iconPath = TIMELINE_ICONS[event.type] || TIMELINE_ICONS.visit;

  return (
    <View style={[styles.card, { padding: 12, flexDirection: 'row', gap: 12 }]}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: `${styles.tokens.goldStrong}18`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon path={iconPath} size={16} color={styles.tokens.goldStrong} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Text style={[styles.textPrimary, { fontWeight: '600', flex: 1 }]}>{display.title}</Text>
          {event.amount != null ? (
            <Text style={styles.textGold}>${Number(event.amount).toFixed(2)}</Text>
          ) : null}
        </View>
        {display.subtitle ? (
          <Text style={[styles.textSecondary, { fontSize: 13, marginTop: 2 }]}>{display.subtitle}</Text>
        ) : null}
        {display.body ? (
          <Text style={[styles.textPrimary, { fontSize: 13, marginTop: 4, opacity: 0.85 }]}>
            {display.body}
          </Text>
        ) : null}
        {event.status ? (
          <Text
            style={[
              styles.textSecondary,
              { fontSize: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
            ]}
          >
            {event.status}
          </Text>
        ) : null}
        {event.type === 'waiver' && event.meta?.signature_image ? (
          <Image
            source={{ uri: event.meta.signature_image as string }}
            style={{ marginTop: 8, height: 64, borderRadius: 8, backgroundColor: '#fff' }}
            resizeMode="contain"
          />
        ) : null}
        {event.type === 'photo' && event.meta?.photo_url ? (
          <Image
            source={{ uri: event.meta.photo_url as string }}
            style={{ marginTop: 8, height: 96, borderRadius: 8, width: '100%' }}
            resizeMode="cover"
          />
        ) : null}
        <Text style={[styles.textSecondary, { fontSize: 11, marginTop: 6 }]}>
          {formatTimelineDate(eventDate)}
        </Text>
      </View>
    </View>
  );
}
