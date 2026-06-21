import { Pressable, Text, View } from 'react-native';
import { useThemeStyles } from '../../../../theme/useThemeStyles';

type ActiveCode = {
  points: number;
  rewardLabel: string;
  redemption_code: string | null;
};

type VaultActiveCodesProps = {
  codes?: ActiveCode[];
  onCodePress?: (code: string, label?: string) => void;
};

export function VaultActiveCodes({ codes = [], onCodePress }: VaultActiveCodesProps) {
  const styles = useThemeStyles();

  if (!codes.length) return null;

  return (
    <View style={[styles.card, { padding: 20, gap: 12 }]}>
      <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 2 }]}>YOUR ACTIVE CODES</Text>
      <Text style={[styles.textSecondary, { fontSize: 12 }]}>
        Show these at checkout before they are applied.
      </Text>
      {codes.map((code) => (
        <Pressable
          key={code.points}
          onPress={() => code.redemption_code && onCodePress?.(code.redemption_code, code.rewardLabel)}
          style={{
            borderWidth: 1,
            borderColor: `${styles.tokens.goldStrong}55`,
            borderRadius: 12,
            padding: 14,
            gap: 4,
          }}
        >
          <Text style={[styles.textGold, { fontSize: 14, fontWeight: '600' }]}>{code.rewardLabel}</Text>
          <Text style={[styles.textSecondary, { fontSize: 12 }]}>{code.redemption_code}</Text>
          <Text style={[styles.textGold, { fontSize: 10, letterSpacing: 1, marginTop: 4, opacity: 0.8 }]}>
            TAP TO VIEW QR
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
