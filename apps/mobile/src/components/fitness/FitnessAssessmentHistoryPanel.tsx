import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import {
  deleteFitnessAssessment,
  fetchFitnessAssessmentHistory,
  formatAssessmentDate,
  formatAssessmentSummary,
  getActivityLabel,
} from '@nail-couture/shared/utils/fitnessAssessmentService.js';
import { useThemeStyles } from '../../theme/useThemeStyles';

type FitnessAssessmentHistoryPanelProps = {
  profileId: string | null;
  callerPhone?: string | null;
  refreshKey?: number;
  compact?: boolean;
};

export function FitnessAssessmentHistoryPanel({
  profileId,
  callerPhone,
  refreshKey = 0,
  compact = false,
}: FitnessAssessmentHistoryPanelProps) {
  const styles = useThemeStyles();
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(Boolean(profileId));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!profileId || !callerPhone) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { rows: data, available } = await fetchFitnessAssessmentHistory(callerPhone, profileId);
    setRows(data);
    setUnavailable(!available);
    setLoading(false);
  }, [profileId, callerPhone]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, refreshKey]);

  const confirmDelete = (summary: NonNullable<ReturnType<typeof formatAssessmentSummary>>) => {
    Alert.alert(
      'Delete assessment?',
      `Permanently remove the assessment saved on ${formatAssessmentDate(summary.savedAt)}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!profileId || !callerPhone) return;

            setDeletingId(summary.id);
            const { success, available } = await deleteFitnessAssessment(
              callerPhone,
              profileId,
              summary.id,
            );
            setDeletingId(null);

            if (!available) {
              Alert.alert(
                'Delete unavailable',
                'Run sql/108_delete_fitness_assessment.sql in Supabase to enable deleting assessments.',
              );
              return;
            }

            if (!success) {
              Alert.alert('Delete failed', 'Could not delete this assessment. Please try again.');
              return;
            }

            if (expandedId === summary.id) {
              setExpandedId(null);
            }

            await loadHistory();
          },
        },
      ],
    );
  };

  if (!profileId) return null;

  if (loading) {
    return <Text style={[styles.textGold, { paddingVertical: 16 }]}>Loading saved assessments…</Text>;
  }

  if (unavailable) {
    return (
      <Text style={[styles.textSecondary, { paddingVertical: 16 }]}>
        Saved history requires sql/061_assessment_security.sql in Supabase.
      </Text>
    );
  }

  if (rows.length === 0) {
    return (
      <View style={[styles.card, { padding: 20, alignItems: 'center' }]}>
        <Text style={styles.textSecondary}>No saved assessments yet.</Text>
        <Text style={[styles.textMuted, { fontSize: 12, marginTop: 8, textAlign: 'center' }]}>
          Complete the calculator and tap Save to Profile.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {rows.map((row) => {
        const summary = formatAssessmentSummary(row);
        if (!summary) return null;

        const expanded = expandedId === summary.id;
        const inputs = (row.inputs || {}) as Record<string, string>;

        return (
          <View key={summary.id} style={[styles.card, { padding: 14 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <Pressable
                onPress={() => setExpandedId(expanded ? null : summary.id)}
                style={{ flex: 1, minWidth: 0 }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={[styles.textGold, { fontWeight: '600' }]}>
                    {formatAssessmentDate(summary.savedAt)}
                  </Text>
                  <Text style={styles.textSecondary}>{expanded ? 'Hide' : 'Details'}</Text>
                </View>

                {!compact && (
                  <Text style={[styles.textMuted, { fontSize: 12, marginTop: 4 }]}>
                    {inputs.gender === 'female' ? 'Female' : 'Male'}
                    {inputs.age ? ` · Age ${inputs.age}` : ''}
                    {inputs.activityLevel ? ` · ${getActivityLabel(inputs.activityLevel)}` : ''}
                  </Text>
                )}

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {[
                    { label: 'BMI', value: summary.metrics.bmi, unit: '' },
                    { label: 'Body fat', value: summary.metrics.bodyFatPercent, unit: '%' },
                    { label: 'BMR', value: summary.metrics.bmr, unit: ' kcal' },
                    { label: 'TDEE', value: summary.metrics.tdee, unit: ' kcal' },
                  ].map((item) =>
                    item.value != null ? (
                      <View
                        key={item.label}
                        style={{
                          minWidth: '46%',
                          flex: 1,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: styles.tokens.cardBorder,
                          padding: 10,
                        }}
                      >
                        <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1 }]}>
                          {item.label.toUpperCase()}
                        </Text>
                        <Text style={[styles.textPrimary, { fontWeight: '600', marginTop: 2 }]}>
                          {item.value}
                          {item.unit}
                        </Text>
                      </View>
                    ) : null,
                  )}
                </View>
              </Pressable>

              <Pressable
                onPress={() => confirmDelete(summary)}
                disabled={deletingId === summary.id}
                accessibilityLabel={`Delete assessment from ${formatAssessmentDate(summary.savedAt)}`}
                style={({ pressed }) => ({
                  opacity: deletingId === summary.id ? 0.5 : pressed ? 0.7 : 1,
                  padding: 8,
                })}
              >
                <Text style={{ color: '#f87171', fontSize: 16 }}>Delete</Text>
              </Pressable>
            </View>

            {expanded && (
              <View style={{ marginTop: 12, gap: 8, borderTopWidth: 1, borderTopColor: styles.tokens.borderLight, paddingTop: 12 }}>
                <Text style={styles.textSecondary}>
                  Height {inputs.height || '—'} · Weight {inputs.weight || '—'} · Neck {inputs.neck || '—'} · Waist{' '}
                  {inputs.waist || '—'}
                </Text>
                {summary.metrics.calorieTargets && (
                  <Text style={styles.textSecondary}>
                    Calorie targets — Loss: {summary.metrics.calorieTargets.weightLoss} · Maint:{' '}
                    {summary.metrics.calorieTargets.maintenance} · Gain:{' '}
                    {summary.metrics.calorieTargets.muscleGain}
                  </Text>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
