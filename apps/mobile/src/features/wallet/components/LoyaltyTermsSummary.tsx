import { useState } from 'react';
import { Pressable, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  LOYALTY_PROGRAM_TERMS_FOOTER,
  LOYALTY_PROGRAM_TERMS_SECTIONS,
  LOYALTY_PROGRAM_TERMS_SUMMARY_LABEL,
  LOYALTY_PROGRAM_TERMS_TITLE,
} from '@nail-couture/shared/constants/loyaltyProgramTerms.js';
import { useThemeStyles } from '../../../theme/useThemeStyles';

type LoyaltyTermsVariant = 'wallet' | 'compact' | 'landing';

type VariantTokens = {
  cardPadding: number;
  stackGap: number;
  summaryLabel: { fontSize: number; letterSpacing: number };
  docTitle: { fontSize: number; marginBottom: number };
  sectionTitle: { fontSize: number; lineHeight: number };
  body: { fontSize: number; lineHeight: number };
  cardStyle?: ViewStyle;
};

const VARIANT_TOKENS: Record<LoyaltyTermsVariant, VariantTokens> = {
  wallet: {
    cardPadding: 16,
    stackGap: 12,
    summaryLabel: { fontSize: 10, letterSpacing: 2 },
    docTitle: { fontSize: 14, marginBottom: 12 },
    sectionTitle: { fontSize: 13, lineHeight: 18 },
    body: { fontSize: 13, lineHeight: 20 },
  },
  compact: {
    cardPadding: 12,
    stackGap: 8,
    summaryLabel: { fontSize: 10, letterSpacing: 1.5 },
    docTitle: { fontSize: 12, marginBottom: 8 },
    sectionTitle: { fontSize: 11, lineHeight: 15 },
    body: { fontSize: 12, lineHeight: 17 },
  },
  landing: {
    cardPadding: 16,
    stackGap: 12,
    summaryLabel: { fontSize: 10, letterSpacing: 1.8 },
    docTitle: { fontSize: 13, marginBottom: 12 },
    sectionTitle: { fontSize: 12, lineHeight: 16 },
    body: { fontSize: 13, lineHeight: 20 },
    cardStyle: { borderWidth: 0, backgroundColor: 'transparent' },
  },
};

type LoyaltyTermsSummaryProps = {
  defaultOpen?: boolean;
  variant?: LoyaltyTermsVariant;
  showDocTitle?: boolean;
  summaryLabel?: string;
};

function renderBodyParagraphs(body: string, bodyStyle: VariantTokens['body'], color: string) {
  return body.split('\n\n').map((paragraph) => (
    <Text key={paragraph.slice(0, 24)} style={[bodyStyle, { color, marginTop: 4 }]}>
      {paragraph}
    </Text>
  ));
}

type TermsBodyProps = {
  tokens: VariantTokens;
  showDocTitle: boolean;
  textSecondary: string;
  textGoldStyle: { color: string };
};

function TermsBody({ tokens, showDocTitle, textSecondary, textGoldStyle }: TermsBodyProps) {
  return (
    <>
      {showDocTitle ? (
        <Text
          style={[
            textGoldStyle,
            {
              fontSize: tokens.docTitle.fontSize,
              fontWeight: '600',
              marginBottom: tokens.docTitle.marginBottom,
            },
          ]}
        >
          {LOYALTY_PROGRAM_TERMS_TITLE}
        </Text>
      ) : null}
      {LOYALTY_PROGRAM_TERMS_SECTIONS.map((section) => (
        <View key={section.title}>
          <Text
            style={[
              textGoldStyle,
              {
                fontSize: tokens.sectionTitle.fontSize,
                lineHeight: tokens.sectionTitle.lineHeight,
                fontWeight: '600',
                marginBottom: 2,
              },
            ]}
          >
            {section.title}
          </Text>
          {renderBodyParagraphs(section.body, tokens.body, textSecondary)}
        </View>
      ))}
      <Text
        style={[
          tokens.body,
          {
            color: textSecondary,
            marginTop: 8,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: 'rgba(197,160,89,0.15)',
          },
        ]}
      >
        {LOYALTY_PROGRAM_TERMS_FOOTER}
      </Text>
    </>
  );
}

function TermsPanel({
  tokens,
  showDocTitle,
  textSecondary,
  textGoldStyle,
  onMeasure,
}: TermsBodyProps & { onMeasure: (height: number) => void }) {
  return (
    <View
      style={{ paddingTop: 12, gap: tokens.stackGap }}
      onLayout={(event) => onMeasure(event.nativeEvent.layout.height)}
    >
      <TermsBody
        tokens={tokens}
        showDocTitle={showDocTitle}
        textSecondary={textSecondary}
        textGoldStyle={textGoldStyle}
      />
    </View>
  );
}

export default function LoyaltyTermsSummary({
  defaultOpen = false,
  variant = 'wallet',
  showDocTitle = true,
  summaryLabel = LOYALTY_PROGRAM_TERMS_SUMMARY_LABEL,
}: LoyaltyTermsSummaryProps) {
  const styles = useThemeStyles();
  const [open, setOpen] = useState(defaultOpen);
  const [contentHeight, setContentHeight] = useState(0);
  const progress = useSharedValue(defaultOpen ? 1 : 0);
  const tokens = VARIANT_TOKENS[variant] ?? VARIANT_TOKENS.wallet;
  const textGoldStyle = { color: styles.tokens.goldStrong };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    progress.value = withTiming(next ? 1 : 0, {
      duration: 280,
      easing: Easing.inOut(Easing.ease),
    });
  };

  const panelStyle = useAnimatedStyle(() => ({
    maxHeight: progress.value * Math.max(contentHeight, 1),
    opacity: progress.value,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }));

  const handleMeasure = (height: number) => {
    if (height > 0 && height !== contentHeight) {
      setContentHeight(height);
    }
  };

  return (
    <View
      style={[
        styles.card,
        { padding: tokens.cardPadding },
        tokens.cardStyle,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={toggle}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <Text
          style={[
            styles.textSecondary,
            {
              fontSize: tokens.summaryLabel.fontSize,
              letterSpacing: tokens.summaryLabel.letterSpacing,
              textTransform: 'uppercase',
              flex: 1,
            },
          ]}
        >
          {summaryLabel}
        </Text>
        <Animated.Text style={[styles.textGold, { fontSize: 12 }, chevronStyle]}>▼</Animated.Text>
      </Pressable>

      <View style={{ position: 'relative' }}>
        <View
          pointerEvents="none"
          style={{ position: 'absolute', opacity: 0, left: 0, right: 0, zIndex: -1 }}
        >
          <TermsPanel
            tokens={tokens}
            showDocTitle={showDocTitle}
            textSecondary={styles.tokens.textSecondary}
            textGoldStyle={textGoldStyle}
            onMeasure={handleMeasure}
          />
        </View>

        <Animated.View style={[{ overflow: 'hidden' }, panelStyle]}>
          <TermsPanel
            tokens={tokens}
            showDocTitle={showDocTitle}
            textSecondary={styles.tokens.textSecondary}
            textGoldStyle={textGoldStyle}
            onMeasure={() => {}}
          />
        </Animated.View>
      </View>
    </View>
  );
}
