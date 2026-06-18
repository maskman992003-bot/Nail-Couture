import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { FITNESS_ASSESSMENT } from '@nail-couture/shared/constants/featureFlags.js';
import {
  fetchFitnessAssessmentHistory,
  formatAssessmentDate,
  formatAssessmentSummary,
} from '@nail-couture/shared/utils/fitnessAssessmentService.js';
import { useThemeStyles } from '../../theme/useThemeStyles';
import { FitnessAssessmentHistoryPanel } from './FitnessAssessmentHistoryPanel';

type FitnessProfileSectionProps = {
  profileId: string;
  callerPhone?: string | null;
  onOpenAssessment?: () => void;
};

export function FitnessProfileSection({ profileId, callerPhone, onOpenAssessment }: FitnessProfileSectionProps) {
  const styles = useThemeStyles();
  const [latest, setLatest] = useState<ReturnType<typeof formatAssessmentSummary>>(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!callerPhone) {
        setLoading(false);
        return;
      }

      const { rows, available: tableAvailable } = await fetchFitnessAssessmentHistory(
        callerPhone,
        profileId,
        50,
      );
      if (!mounted) return;

      setAvailable(tableAvailable);
      setCount(rows.length);
      setLatest(rows[0] ? formatAssessmentSummary(rows[0]) : null);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [profileId, callerPhone]);

  if (!FITNESS_ASSESSMENT) return null;

  if (loading) {
    return <Text style={[styles.textGold, { paddingVertical: 12 }]}>Loading fitness data…</Text>;
  }

  if (!available) {
    return <Text style={styles.textSecondary}>Fitness tracking is not enabled on the database yet.</Text>;
  }

  if (!latest) {
    return (
      <View style={[styles.card, { padding: 16, gap: 12 }]}>
        <Text style={[styles.textPrimary, { fontWeight: '600' }]}>Fitness Assessment</Text>
        <Text style={styles.textSecondary}>
          No saved measurements yet. Run an assessment to track BMI, body fat, and calorie targets.
        </Text>
        {onOpenAssessment ? (
          <Pressable onPress={onOpenAssessment} style={styles.buttonPrimary}>
            <Text style={styles.buttonPrimaryText}>Start assessment</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const m = latest.metrics;

  return (
    <View style={{ gap: 16 }}>
      <View style={[styles.card, { padding: 16, gap: 12 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.textPrimary, { fontWeight: '600' }]}>Latest assessment</Text>
            <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 4 }]}>
              {formatAssessmentDate(latest.savedAt)}
              {count > 1 ? ` · ${count} saved total` : ''}
            </Text>
          </View>
          {onOpenAssessment ? (
            <Pressable onPress={onOpenAssessment}>
              <Text style={styles.textGold}>Open →</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[
            { label: 'BMI', value: m.bmi, suffix: '' },
            { label: 'Body fat', value: m.bodyFatPercent, suffix: '%' },
            { label: 'BMR', value: m.bmr, suffix: ' kcal' },
            { label: 'TDEE', value: m.tdee, suffix: ' kcal' },
          ].map((item) => (
            <View key={item.label} style={[styles.card, { padding: 12, minWidth: '46%', flex: 1 }]}>
              <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1 }]}>
                {item.label.toUpperCase()}
              </Text>
              <Text style={[styles.textPrimary, { fontWeight: '600', marginTop: 4 }]}>
                {item.value ?? '—'}
                {item.value != null ? item.suffix : ''}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {count > 1 ? (
        <View style={{ gap: 8 }}>
          <Text style={[styles.textPrimary, { fontWeight: '600' }]}>Assessment history</Text>
          <FitnessAssessmentHistoryPanel profileId={profileId} callerPhone={callerPhone} compact />
        </View>
      ) : null}
    </View>
  );
}
