import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useAnnouncementInbox } from '@nail-couture/shared/hooks/useAnnouncementInbox.js';
import { formatAnnouncementDate } from '@nail-couture/shared/utils/announcementInbox.js';
import { useAuth } from '../../contexts/AuthContext';
import {
  AnnouncementAttachmentsList,
  type AnnouncementAttachmentItem,
} from '../../components/AnnouncementAttachmentsList';
import { CustomerScreenLayout } from '../../components/customer/CustomerScreenLayout';
import { StaffScreenLayout } from '../../components/staff/StaffScreenLayout';
import { useThemeStyles } from '../../theme/useThemeStyles';

const FILTERS = [
  { id: 'all' as const, label: 'All' },
  { id: 'saved' as const, label: 'Saved' },
  { id: 'archived' as const, label: 'Archived' },
];

type InboxItem = {
  inbox_id: string;
  announcement_id: string;
  title: string;
  body: string;
  created_by_name: string;
  is_saved: boolean;
  is_archived: boolean;
  is_read: boolean;
  notification_id?: string | null;
  received_at: string;
  attachments?: AnnouncementAttachmentItem[];
};

export function SalonUpdatesScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isCustomer = user?.role === 'customer';
  const Layout = isCustomer ? CustomerScreenLayout : StaffScreenLayout;

  const formatMeta = (item: InboxItem) => {
    const date = formatAnnouncementDate(item.received_at);
    return isCustomer ? date : `${item.created_by_name} · ${date}`;
  };

  const {
    filter,
    items,
    loading,
    error,
    hasMore,
    changeFilter,
    loadMore,
    toggleSaved,
    toggleArchived,
    markNotificationRead,
  } = useAnnouncementInbox(user?.phone);

  const handleExpand = (item: InboxItem) => {
    const next = expandedId === item.announcement_id ? null : item.announcement_id;
    setExpandedId(next);
    if (next && !item.is_read && item.notification_id) {
      markNotificationRead(item.notification_id);
    }
  };

  const chipStyle = (active: boolean) => ({
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: active ? styles.tokens.goldStrong : styles.card.borderColor,
    backgroundColor: active ? `${styles.tokens.goldStrong}22` : styles.card.backgroundColor,
  });

  return (
    <Layout
      title="Salon Updates"
      subtitle="Save and organize announcements from the salon"
    >
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => changeFilter(tab.id)}
            style={chipStyle(filter === tab.id)}
          >
            <Text style={filter === tab.id ? styles.textGold : styles.textPrimary}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <View style={[styles.card, { padding: 14, borderColor: 'rgba(248,113,113,0.4)', marginBottom: 12 }]}>
          <Text style={{ color: '#f87171', fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}

      {loading && items.length === 0 ? (
        <ActivityIndicator color="#c5a059" style={{ marginTop: 32 }} />
      ) : items.length === 0 ? (
        <View style={[styles.card, { padding: 20, alignItems: 'center', paddingVertical: 32 }]}>
          <Text style={styles.textSecondary}>
            {filter === 'saved'
              ? 'No saved announcements yet.'
              : filter === 'archived'
                ? 'No archived announcements.'
                : 'No salon announcements yet.'}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {(items as InboxItem[]).map((item) => {
            const isExpanded = expandedId === item.announcement_id;
            return (
              <View
                key={item.inbox_id}
                style={[
                  styles.card,
                  { padding: 14 },
                  !item.is_read && { borderColor: 'rgba(197,160,89,0.5)' },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <Pressable style={{ flex: 1 }} onPress={() => handleExpand(item)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      {!item.is_read ? (
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#c5a059' }} />
                      ) : null}
                      <Text style={[styles.textPrimary, { fontSize: 17, fontWeight: '600', flex: 1 }]}>
                        {item.title}
                      </Text>
                    </View>
                    <Text style={[styles.textSecondary, { fontSize: 11, marginBottom: 6, opacity: 0.7 }]}>
                      {formatMeta(item)}
                    </Text>
                    {item.body ? (
                      <Text
                        style={styles.textSecondary}
                        numberOfLines={isExpanded ? undefined : 2}
                      >
                        {item.body}
                      </Text>
                    ) : null}
                    {isExpanded && item.attachments?.length ? (
                      <AnnouncementAttachmentsList attachments={item.attachments} />
                    ) : null}
                    {!isExpanded && item.attachments?.length ? (
                      <AnnouncementAttachmentsList attachments={item.attachments} compact />
                    ) : null}
                  </Pressable>
                  <View style={{ gap: 6 }}>
                    <Pressable
                      onPress={() => toggleSaved(item.announcement_id, item.is_saved)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: item.is_saved ? 'rgba(197,160,89,0.6)' : styles.card.borderColor,
                        backgroundColor: item.is_saved ? 'rgba(197,160,89,0.12)' : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: item.is_saved ? '#c5a059' : styles.textSecondary.color, fontSize: 14 }}>
                        {item.is_saved ? '★' : '☆'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => toggleArchived(item.announcement_id, item.is_archived)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: styles.card.borderColor,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: styles.textSecondary.color, fontSize: 14 }}>
                        {item.is_archived ? '↩' : '📦'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}

          {hasMore ? (
            <Pressable
              onPress={loadMore}
              disabled={loading}
              style={{
                borderWidth: 1,
                borderColor: 'rgba(197,160,89,0.4)',
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: 'center',
                opacity: loading ? 0.6 : 1,
              }}
            >
              <Text style={styles.textGold}>
                {loading ? 'Loading…' : 'Load more'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </Layout>
  );
}
