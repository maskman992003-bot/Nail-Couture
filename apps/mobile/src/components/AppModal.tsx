import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useThemeStyles } from '../theme/useThemeStyles';

type AppModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  footer?: ReactNode;
  scrollBody?: boolean;
  panelStyle?: StyleProp<ViewStyle>;
};

export function AppModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  scrollBody = false,
  panelStyle,
}: AppModalProps) {
  const { tokens } = useThemeStyles();

  const body = scrollBody ? (
    <ScrollView style={{ maxHeight: 420 }}>{children}</ScrollView>
  ) : (
    <View>{children}</View>
  );

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          padding: 16,
        }}
        onPress={onClose}
      >
        <Pressable
          style={[
            {
              backgroundColor: tokens.cardBg,
              borderColor: tokens.cardBorder,
              borderWidth: 1,
              borderRadius: 20,
              maxHeight: '90%',
              overflow: 'hidden',
            },
            panelStyle,
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          {(title || subtitle) && (
            <View
              style={{
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: tokens.borderLight,
              }}
            >
              {title ? (
                <Text style={{ color: tokens.goldStrong, fontSize: 20, fontWeight: '600' }}>
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text style={{ color: tokens.textSecondary, marginTop: 4 }}>{subtitle}</Text>
              ) : null}
            </View>
          )}

          <View style={{ padding: 20 }}>{body}</View>

          {footer ? (
            <View
              style={{
                padding: 16,
                borderTopWidth: 1,
                borderTopColor: tokens.borderLight,
                flexDirection: 'row',
                gap: 12,
              }}
            >
              {footer}
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function ModalButton({
  label,
  onPress,
  variant = 'secondary',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  const { tokens } = useThemeStyles();

  const backgroundColor =
    variant === 'primary'
      ? tokens.goldStrong
      : variant === 'danger'
        ? '#ef4444'
        : tokens.inputBg;
  const textColor = variant === 'primary' ? '#121212' : tokens.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        flex: 1,
        backgroundColor,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ color: textColor, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}
