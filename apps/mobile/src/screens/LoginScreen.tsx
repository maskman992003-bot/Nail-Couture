import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing } from '@nail-couture/shared/theme/layout.js';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '../components/icons/Icon';
import { layout } from '../theme/layoutStyles';
import { useThemeStyles } from '../theme/useThemeStyles';
import { AppModal, ModalButton } from '../components/AppModal';
import type { RootStackParamList } from '../navigation/publicTypes';

type Profile = Record<string, unknown> & {
  id: string;
  full_name?: string;
  role?: string;
};

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'phone' | 'pin'>('phone');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const { login } = useAuth();
  const styles = useThemeStyles();

  const doLogin = (profileData: Profile) => {
    login(profileData);
  };

  const verifyPin = async (pin: string) => {
    if (!profile) return;
    setPinLoading(true);
    setPinError('');

    try {
      const { data } = await getSupabase()
        .from('profiles')
        .select('pin')
        .eq('id', profile.id)
        .single();

      if (data?.pin && data.pin === pin) {
        doLogin(profile);
      } else {
        setPinError('Incorrect PIN. Please try again.');
        setPinInput('');
      }
    } catch {
      setPinError('Verification failed. Please try again.');
    } finally {
      setPinLoading(false);
    }
  };

  const handlePinDigit = async (digit: string) => {
    if (pinInput.length < 4 && /^\d$/.test(digit)) {
      const newPin = pinInput + digit;
      setPinInput(newPin);
      setPinError('');
      if (newPin.length === 4) {
        await verifyPin(newPin);
      }
    }
  };

  const handlePinBackspace = () => {
    setPinInput((current) => current.slice(0, -1));
    setPinError('');
  };

  const handleSubmit = async () => {
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const { data, error: profileError } = await getSupabase()
        .from('profiles')
        .select('*')
        .eq('phone', cleanPhone)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (!data) {
        setError('No account found with this phone number. Please check in at the kiosk first.');
        setLoading(false);
        return;
      }

      if (data.pin) {
        setProfile(data);
        setStep('pin');
        setLoading(false);
      } else {
        doLogin(data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const pinKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'] as const;

  return (
    <SafeAreaView style={[styles.screen, layout.authScreen]}>
      {navigation.canGoBack() ? (
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ marginBottom: spacing[3], alignSelf: 'flex-start', width: '100%', maxWidth: layout.authCardWrap.maxWidth, flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Icon name="chevronLeft" size={18} color={styles.tokens.goldStrong} />
          <Text style={styles.textGold}>Back</Text>
        </Pressable>
      ) : null}
      <View style={[layout.authCardWrap, { flex: 1, justifyContent: 'center' }]}>
      <View style={[styles.card, { padding: spacing[8] }]}>
        <View style={{ alignItems: 'center', marginBottom: spacing[8] }}>
          <Image
            source={require('../../assets/NC.jpg')}
            style={{ height: 112, width: 200 }}
            resizeMode="contain"
          />
          <Text style={[styles.textSecondary, { textAlign: 'center', marginTop: spacing[2] }]}>
            Client Portal Login
          </Text>
        </View>

        <Text style={[styles.textSecondary, { fontSize: 12, letterSpacing: 1, marginBottom: spacing[2], textTransform: 'uppercase' }]}>
          Phone Number
        </Text>
        <TextInput
          value={phone}
          onChangeText={(value) => {
            setPhone(value);
            setError('');
          }}
          placeholder="Enter your phone number"
          placeholderTextColor={styles.tokens.textMuted}
          keyboardType="phone-pad"
          style={styles.input}
        />
        {error ? <Text style={{ color: '#f87171', marginTop: spacing[2], fontSize: 14 }}>{error}</Text> : null}

        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.buttonPrimary, { marginTop: spacing[6], opacity: loading ? 0.6 : 1 }]}
        >
          {loading ? (
            <ActivityIndicator color="#121212" />
          ) : (
            <Text style={styles.buttonPrimaryText}>Access Portal</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('Register')}
          style={{ marginTop: spacing[6], alignItems: 'center' }}
        >
          <Text style={styles.textSecondary}>
            New here? <Text style={styles.textGold}>Create an account</Text>
          </Text>
        </Pressable>
      </View>

      <AppModal
        open={step === 'pin'}
        onClose={() => {
          setStep('phone');
          setPinInput('');
          setPinError('');
          setProfile(null);
        }}
        title={profile?.full_name ? `Hello, ${String(profile.full_name).split(' ')[0]}` : 'Enter PIN'}
        subtitle="Enter your 4-digit PIN"
        maxPanelWidth={384}
        footer={
          <ModalButton
            label="Cancel"
            onPress={() => {
              setStep('phone');
              setPinInput('');
              setPinError('');
              setProfile(null);
            }}
          />
        }
      >
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing[5], marginBottom: spacing[8] }}>
          {[1, 2, 3, 4].map((index) => (
            <View
              key={index}
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: pinInput[index - 1] ? styles.tokens.goldStrong : styles.tokens.inputBg,
              }}
            />
          ))}
        </View>
        {pinError ? <Text style={{ color: '#f87171', textAlign: 'center', marginBottom: 12 }}>{pinError}</Text> : null}
        {pinLoading ? <ActivityIndicator color={styles.tokens.goldStrong} style={{ marginBottom: 12 }} /> : null}

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: spacing[6],
            maxWidth: 280,
            alignSelf: 'center',
          }}
        >
          {pinKeys.map((key, index) => {
            if (key === '') {
              return <View key={`spacer-${index}`} style={{ width: '30%', height: spacing[16] }} />;
            }
            if (key === 'delete') {
              return (
                <Pressable
                  key={`delete-${index}`}
                  onPress={handlePinBackspace}
                  style={{ width: '30%', height: spacing[16], alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="backspace" size={24} color={styles.tokens.textSecondary} />
                </Pressable>
              );
            }
            return (
              <Pressable
                key={`digit-${key}-${index}`}
                onPress={() => handlePinDigit(key)}
                style={{
                  width: '30%',
                  height: spacing[16],
                  borderRadius: spacing[16] / 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: styles.tokens.inputBg,
                }}
              >
                <Text style={[styles.textPrimary, { fontSize: 24, fontWeight: '300' }]}>{key}</Text>
              </Pressable>
            );
          })}
        </View>
      </AppModal>
      </View>
    </SafeAreaView>
  );
}
