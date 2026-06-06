import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { maxWidth, spacing } from '@nail-couture/shared/theme/layout.js';
import { layout } from '../theme/layoutStyles';
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
  maxPanelWidth?: number;
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
  maxPanelWidth = maxWidth.lg,
}: AppModalProps) {
  const { tokens } = useThemeStyles();
  const { height: windowHeight } = useWindowDimensions();
  const scrollMaxHeight = Math.min(windowHeight * 0.9 - spacing[8] * 2, windowHeight - spacing[8] * 2);

  const body = scrollBody ? (
    <ScrollView style={{ maxHeight: scrollMaxHeight }}>{children}</ScrollView>
  ) : (
    <View>{children}</View>
  );

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[layout.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}
        onPress={onClose}
      >
        <Pressable
          style={[
            layout.modalPanel,
            {
              backgroundColor: tokens.cardBg,
              borderColor: tokens.cardBorder,
              borderWidth: 1,
              maxWidth: maxPanelWidth,
            },
            panelStyle,
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          {(title || subtitle) && (
            <View
              style={[
                layout.modalHeader,
                { borderBottomWidth: 1, borderBottomColor: tokens.borderLight },
              ]}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                {title ? (
                  <Text style={{ color: tokens.goldStrong, fontSize: 20, fontWeight: '600' }}>
                    {title}
                  </Text>
                ) : null}
                {subtitle ? (
                  <Text style={{ color: tokens.textSecondary, marginTop: spacing[1], fontSize: 14 }}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            </View>
          )}

          <View style={layout.modalBody}>{body}</View>

          {footer ? (
            <View
              style={[
                layout.modalFooter,
                { borderTopWidth: 1, borderTopColor: tokens.borderLight },
              ]}
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
        borderRadius: spacing[3],
        paddingVertical: spacing[3],
        alignItems: 'center',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ color: textColor, fontWeight: '500', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}
