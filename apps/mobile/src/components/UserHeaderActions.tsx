import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { useThemeStyles } from '../theme/useThemeStyles';
import { NotificationPanel } from './NotificationPanel';
import { BELL_PATH, HeaderIcon, LOGOUT_PATH, LogoutConfirmModal } from './LogoutConfirmModal';

export function UserHeaderActions() {
  const { user, logout } = useAuth();
  const styles = useThemeStyles();
  const [panelOpen, setPanelOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const { notifications, unreadCount, markAllRead, markOneRead } = useNotifications(
    panelOpen || menuOpen,
  );

  if (!user) return null;

  const initials = (user.full_name || user.email || '?')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          onPress={() => setPanelOpen(true)}
          hitSlop={8}
          style={{ position: 'relative', padding: 6 }}
        >
          <HeaderIcon path={BELL_PATH} color={styles.tokens.textSecondary} />
          {unreadCount > 0 ? (
            <View
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: styles.tokens.goldStrong,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 4,
              }}
            >
              <Text style={{ color: '#121212', fontSize: 9, fontWeight: '700' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          onPress={() => setMenuOpen(true)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: `${styles.tokens.goldStrong}22`,
            borderWidth: 1,
            borderColor: `${styles.tokens.goldStrong}44`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={[styles.textGold, { fontSize: 12, fontWeight: '600' }]}>{initials}</Text>
        </Pressable>
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 56, paddingRight: 20 }}
          onPress={() => setMenuOpen(false)}
        >
          <Pressable
            style={{
              minWidth: 200,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: styles.tokens.borderLight,
              backgroundColor: styles.tokens.cardBg,
              overflow: 'hidden',
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                setPanelOpen(true);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <HeaderIcon path={BELL_PATH} color={styles.tokens.textSecondary} size={18} />
              <Text style={styles.textPrimary}>Notifications</Text>
              {unreadCount > 0 ? (
                <View
                  style={{
                    marginLeft: 'auto',
                    backgroundColor: styles.tokens.goldStrong,
                    borderRadius: 8,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ color: '#121212', fontSize: 10, fontWeight: '700' }}>{unreadCount}</Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                setLogoutOpen(true);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderTopWidth: 1,
                borderTopColor: styles.tokens.borderLight,
              }}
            >
              <HeaderIcon path={LOGOUT_PATH} color="#f87171" size={18} />
              <Text style={{ color: '#f87171' }}>Logout</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <NotificationPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAllRead={markAllRead}
        onMarkOneRead={markOneRead}
      />

      <LogoutConfirmModal open={logoutOpen} onClose={() => setLogoutOpen(false)} onConfirm={logout} />
    </>
  );
}
