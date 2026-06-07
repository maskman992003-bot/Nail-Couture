import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './icons/Icon';
import { useThemeStyles } from '../theme/useThemeStyles';
import type { AppNotification } from '../hooks/useNotifications';

type NotificationPanelProps = {
  open: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onMarkOneRead: (id: string) => void;
};

export function NotificationPanel({
  open,
  onClose,
  notifications,
  unreadCount,
  onMarkAllRead,
  onMarkOneRead,
}: NotificationPanelProps) {
  const styles = useThemeStyles();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={onClose}>
        <Pressable
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '100%',
            maxWidth: 380,
            backgroundColor: styles.tokens.cardBg,
            borderLeftWidth: 1,
            borderLeftColor: styles.tokens.borderLight,
            paddingTop: insets.top,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: styles.tokens.borderLight,
            }}
          >
            <View>
              <Text style={styles.statValue}>Notifications</Text>
              {unreadCount > 0 ? (
                <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 4 }]}>
                  {unreadCount} unread
                </Text>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {unreadCount > 0 ? (
                <Pressable
                  onPress={onMarkAllRead}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: `${styles.tokens.goldStrong}66`,
                  }}
                >
                  <Text style={[styles.textGold, { fontSize: 12 }]}>Mark all read</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close">
                <Icon name="close" size={24} color={styles.tokens.textSecondary} />
              </Pressable>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}>
            {notifications.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <Icon name="bell" size={40} color={styles.tokens.textMuted} strokeWidth={1.5} />
                <Text style={[styles.textSecondary, { marginTop: 12 }]}>No notifications yet</Text>
              </View>
            ) : (
              notifications.map((notif) => (
                <Pressable
                  key={notif.id}
                  onPress={() => {
                    if (!notif.is_read) onMarkOneRead(notif.id);
                  }}
                  style={{
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: notif.is_read
                      ? styles.tokens.borderLight
                      : `${styles.tokens.goldStrong}66`,
                    backgroundColor: notif.is_read
                      ? `${styles.tokens.textPrimary}05`
                      : `${styles.tokens.goldStrong}12`,
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {!notif.is_read ? (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: styles.tokens.goldStrong,
                          marginTop: 6,
                        }}
                      />
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.textPrimary, { fontWeight: '600', fontSize: 14 }]}>
                        {notif.title}
                      </Text>
                      {(notif.body || notif.message) ? (
                        <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 4 }]}>
                          {notif.body || notif.message}
                        </Text>
                      ) : null}
                      <Text style={[styles.textSecondary, { fontSize: 10, marginTop: 6, opacity: 0.6 }]}>
                        {new Date(notif.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        at{' '}
                        {new Date(notif.created_at).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
