import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getNotificationMobileScreen } from '@nail-couture/shared/constants/notificationRoutes.js';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications, type AppNotification } from '../hooks/useNotifications';
import { useThemeStyles } from '../theme/useThemeStyles';
import { Icon } from './icons/Icon';

export function NotificationHistorySection() {
  const styles = useThemeStyles();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { notifications, markOneRead, deleteOne, deleteAll } = useNotifications();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handlePress = (notif: AppNotification) => {
    if (!notif.is_read) markOneRead(notif.id);
    const screen = getNotificationMobileScreen(notif.type, user?.role);
    if (screen) navigation.navigate(screen as never);
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    setShowClearConfirm(true);
  };

  const handleConfirmClearAll = () => {
    deleteAll();
    setShowClearConfirm(false);
  };

  return (
    <View style={[styles.card, { padding: 16 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={[styles.textPrimary, { fontWeight: '600' }]}>Notifications</Text>
        {notifications.length > 0 ? (
          showClearConfirm ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.textSecondary, { fontSize: 12 }]}>Clear all?</Text>
              <Pressable onPress={() => setShowClearConfirm(false)}>
                <Text style={[styles.textSecondary, { fontSize: 12 }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleConfirmClearAll}>
                <Text style={{ color: '#f87171', fontSize: 12, fontWeight: '600' }}>Confirm</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={handleClearAll}>
              <Text style={{ color: '#f87171', fontSize: 12 }}>Clear all</Text>
            </Pressable>
          )
        ) : null}
      </View>

      {notifications.length === 0 ? (
        <Text style={[styles.textSecondary, { textAlign: 'center', paddingVertical: 16 }]}>
          No notifications yet
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {notifications.slice(0, 10).map((notif) => (
            <Pressable
              key={notif.id}
              onPress={() => handlePress(notif)}
              style={{
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: notif.is_read ? styles.tokens.borderLight : `${styles.tokens.goldStrong}66`,
                backgroundColor: notif.is_read ? `${styles.tokens.textPrimary}05` : `${styles.tokens.goldStrong}12`,
              }}
            >
              <Pressable
                onPress={() => deleteOne(notif.id)}
                hitSlop={8}
                style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
                accessibilityLabel="Delete notification"
              >
                <Icon name="close" size={14} color={styles.tokens.textMuted} />
              </Pressable>
              <View style={{ paddingRight: 20 }}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  {!notif.is_read ? (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: styles.tokens.goldStrong,
                        marginTop: 5,
                      }}
                    />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.textGold, { fontWeight: '600', fontSize: 14 }]}>{notif.title}</Text>
                    {(notif.body || notif.message) ? (
                      <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 4 }]}>
                        {notif.body || notif.message}
                      </Text>
                    ) : null}
                    <Text style={[styles.textSecondary, { fontSize: 10, marginTop: 6, opacity: 0.6 }]}>
                      {new Date(notif.created_at).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
