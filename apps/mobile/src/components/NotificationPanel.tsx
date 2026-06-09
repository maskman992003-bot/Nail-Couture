import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
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
  onDeleteOne: (id: string) => void;
  onDeleteAll: () => void;
  onNotificationPress?: (notif: AppNotification) => void;
};

export function NotificationPanel({
  open,
  onClose,
  notifications,
  unreadCount,
  onMarkAllRead,
  onMarkOneRead,
  onDeleteOne,
  onDeleteAll,
  onNotificationPress,
}: NotificationPanelProps) {
  const styles = useThemeStyles();
  const insets = useSafeAreaInsets();

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    Alert.alert(
      'Clear all notifications?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear all', style: 'destructive', onPress: onDeleteAll },
      ],
    );
  };

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
              borderBottomWidth: 1,
              borderBottomColor: styles.tokens.borderLight,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 12,
                gap: 12,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.textGold, { fontSize: 22, fontWeight: '600' }]}>Notifications</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 6, gap: 6 }}>
                  {unreadCount > 0 ? (
                    <View
                      style={{
                        backgroundColor: styles.tokens.goldStrong,
                        borderRadius: 999,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{ color: '#121212', fontSize: 10, fontWeight: '700' }}>
                        {unreadCount} unread
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.textSecondary, { fontSize: 12 }]}>All caught up</Text>
                  )}
                  {notifications.length > 0 ? (
                    <Text style={[styles.textSecondary, { fontSize: 12 }]}>
                      {notifications.length} total
                    </Text>
                  ) : null}
                </View>
              </View>
              <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close">
                <Icon name="close" size={24} color={styles.tokens.textSecondary} />
              </Pressable>
            </View>

            {(unreadCount > 0 || notifications.length > 0) ? (
              <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 16 }}>
                {unreadCount > 0 ? (
                  <Pressable
                    onPress={onMarkAllRead}
                    style={{
                      flex: 1,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: `${styles.tokens.goldStrong}66`,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={[styles.textGold, { fontSize: 12, fontWeight: '600' }]}>Mark all read</Text>
                  </Pressable>
                ) : null}
                {notifications.length > 0 ? (
                  <Pressable
                    onPress={handleClearAll}
                    style={{
                      flex: 1,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: 'rgba(248,113,113,0.4)',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#f87171', fontSize: 12, fontWeight: '600' }}>Clear all</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
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
                    onNotificationPress?.(notif);
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
                  <Pressable
                    onPress={() => onDeleteOne(notif.id)}
                    hitSlop={8}
                    style={{ position: 'absolute', top: 8, right: 8, zIndex: 1, padding: 4 }}
                    accessibilityLabel="Delete notification"
                  >
                    <Icon name="close" size={16} color={styles.tokens.textMuted} />
                  </Pressable>
                  <View style={{ flexDirection: 'row', gap: 10, paddingRight: 20 }}>
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
