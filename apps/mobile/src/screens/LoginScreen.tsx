import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { useAuth } from '../contexts/AuthContext';
import { useThemeStyles } from '../theme/useThemeStyles';
import { AppModal, ModalButton } from '../components/AppModal';

type Profile = Record<string, unknown> & {
  id: string;
  full_name?: string;
  role?: string;
};

export function LoginScreen() {
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
    <View style={[styles.screen, { justifyContent: 'center', padding: 20 }]}>
      <View style={[styles.card, { padding: 24 }]}>
        <Text style={[styles.textGold, { fontSize: 24, textAlign: 'center', marginBottom: 8 }]}>
          Nail Couture
        </Text>
        <Text style={[styles.textSecondary, { textAlign: 'center', marginBottom: 24 }]}>
          Client Portal Login
        </Text>

        <Text style={[styles.textSecondary, { fontSize: 12, letterSpacing: 1, marginBottom: 8 }]}>
          PHONE NUMBER
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
        {error ? <Text style={{ color: '#f87171', marginTop: 8 }}>{error}</Text> : null}

        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.buttonPrimary, { marginTop: 24, opacity: loading ? 0.6 : 1 }]}
        >
          {loading ? (
            <ActivityIndicator color="#121212" />
          ) : (
            <Text style={styles.buttonPrimaryText}>Access Portal</Text>
          )}
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
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
          {[1, 2, 3, 4].map((index) => (
            <View
              key={index}
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: pinInput[index - 1] ? styles.tokens.goldStrong : styles.tokens.inputBg,
              }}
            />
          ))}
        </View>
        {pinError ? <Text style={{ color: '#f87171', textAlign: 'center', marginBottom: 12 }}>{pinError}</Text> : null}
        {pinLoading ? <ActivityIndicator color={styles.tokens.goldStrong} style={{ marginBottom: 12 }} /> : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
          {pinKeys.map((key, index) => {
            if (key === '') {
              return <View key={`spacer-${index}`} style={{ width: 72, height: 56 }} />;
            }
            if (key === 'delete') {
              return (
                <Pressable
                  key={`delete-${index}`}
                  onPress={handlePinBackspace}
                  style={{ width: 72, height: 56, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={styles.textSecondary}>Del</Text>
                </Pressable>
              );
            }
            return (
              <Pressable
                key={`digit-${key}-${index}`}
                onPress={() => handlePinDigit(key)}
                style={{
                  width: 72,
                  height: 56,
                  borderRadius: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: styles.tokens.inputBg,
                }}
              >
                <Text style={[styles.textPrimary, { fontSize: 22 }]}>{key}</Text>
              </Pressable>
            );
          })}
        </View>
      </AppModal>
    </View>
  );
}
