import { Pressable, Switch, Text, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { CustomerScreenLayout } from '../../components/customer/CustomerScreenLayout';
import { AppModal, ModalButton } from '../../components/AppModal';
import { useThemeStyles } from '../../theme/useThemeStyles';
import { useState } from 'react';

export function CustomerSettingsScreen() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const styles = useThemeStyles();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <CustomerScreenLayout title="Settings" subtitle="App preferences and account">
      <View style={[styles.card, { padding: 16, marginBottom: 12 }]}>
        <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, marginBottom: 8 }]}>
          SIGNED IN AS
        </Text>
        <Text style={[styles.textPrimary, { fontWeight: '600' }]}>{user?.full_name || 'Customer'}</Text>
        <Text style={styles.textSecondary}>{user?.phone}</Text>
      </View>

      <View
        style={[
          styles.card,
          {
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          },
        ]}
      >
        <View>
          <Text style={[styles.textPrimary, { fontWeight: '600' }]}>Dark Mode</Text>
          <Text style={styles.textSecondary}>Toggle app theme</Text>
        </View>
        <Switch value={theme === 'dark'} onValueChange={toggleTheme} trackColor={{ true: styles.tokens.goldStrong }} />
      </View>

      <Pressable
        onPress={() => setShowLogoutConfirm(true)}
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: 'rgba(239,68,68,0.4)',
          paddingVertical: 14,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#f87171', fontWeight: '600' }}>Log Out</Text>
      </Pressable>

      <AppModal
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="Log Out?"
        subtitle="Are you sure you want to log out?"
        footer={
          <>
            <ModalButton label="Cancel" onPress={() => setShowLogoutConfirm(false)} />
            <ModalButton
              label="Log Out"
              variant="danger"
              onPress={() => {
                setShowLogoutConfirm(false);
                logout();
              }}
            />
          </>
        }
      />
    </CustomerScreenLayout>
  );
}
