import { useCallback, useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  Text,
  TextInput,
  UIManager,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  ACTIVITY_OPTIONS,
  buildFitnessSnapshot,
} from '@nail-couture/shared/utils/fitnessCalculations.js';
import {
  saveFitnessAssessment,
} from '@nail-couture/shared/utils/fitnessAssessmentService.js';
import { useAuth } from '../../contexts/AuthContext';
import { ScrollSelect } from '../forms/ScrollSelect';
import { SegmentedControl } from './SegmentedControl';
import { FitnessAssessmentHistoryPanel } from './FitnessAssessmentHistoryPanel';
import { useThemeStyles } from '../../theme/useThemeStyles';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const UNIT_TABS = [
  { id: 'imperial', label: 'Imperial' },
  { id: 'metric', label: 'Metric' },
];

const GENDER_TABS = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
];

type FitnessInputs = {
  unitSystem: 'metric' | 'imperial';
  gender: 'male' | 'female';
  age: string;
  height: string;
  weight: string;
  activityLevel: string;
  neck: string;
  waist: string;
  hip: string;
};

const INITIAL_INPUTS: FitnessInputs = {
  unitSystem: 'imperial',
  gender: 'female',
  age: '',
  height: '',
  weight: '',
  activityLevel: 'moderately_active',
  neck: '',
  waist: '',
  hip: '',
};

const VIEW_TABS = [
  { id: 'calculator', label: 'Calculator' },
  { id: 'history', label: 'Saved History' },
];

const STATUS_COLORS = {
  success: '#4ade80',
  warning: '#facc15',
  danger: '#f87171',
};

function FieldLabel({ children }: { children: string }) {
  const styles = useThemeStyles();
  return (
    <Text
      style={{
        fontSize: 10,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: styles.tokens.textMuted,
        marginBottom: 6,
      }}
    >
      {children}
    </Text>
  );
}

function MetricCard({
  title,
  value,
  unit,
  status,
}: {
  title: string;
  value: number | null;
  unit?: string;
  status?: { label: string | null; tone: string | null } | null;
}) {
  const styles = useThemeStyles();
  const tone = status?.tone as keyof typeof STATUS_COLORS | undefined;

  return (
    <View style={[styles.card, { padding: 16, flex: 1, minWidth: 140 }]}>
      <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }]}>
        {title}
      </Text>
      {status?.label && tone && (
        <View
          style={{
            alignSelf: 'flex-start',
            marginTop: 6,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: `${STATUS_COLORS[tone]}55`,
            backgroundColor: `${STATUS_COLORS[tone]}22`,
          }}
        >
          <Text style={{ fontSize: 10, color: STATUS_COLORS[tone], fontWeight: '600' }}>{status.label}</Text>
        </View>
      )}
      <Text style={[styles.textGold, { fontSize: 32, fontWeight: '600', marginTop: 8 }]}>
        {value ?? '—'}
        {value != null && unit ? (
          <Text style={[styles.textSecondary, { fontSize: 14 }]}> {unit}</Text>
        ) : null}
      </Text>
    </View>
  );
}

function CalorieSubCard({ label, value }: { label: string; value: number | null }) {
  const styles = useThemeStyles();
  return (
    <View
      style={{
        flex: 1,
        minWidth: 100,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: styles.tokens.cardBorder,
        padding: 12,
        backgroundColor: `${styles.tokens.goldStrong}11`,
      }}
    >
      <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }]}>
        {label}
      </Text>
      <Text style={[styles.textPrimary, { fontSize: 22, fontWeight: '600', marginTop: 4 }]}>
        {value ?? '—'}
        {value != null ? <Text style={{ fontSize: 12, color: styles.tokens.textSecondary }}> kcal</Text> : null}
      </Text>
    </View>
  );
}

type FitnessAssessmentContentProps = {
  onLoginPress?: () => void;
};

export function FitnessAssessmentContent({ onLoginPress }: FitnessAssessmentContentProps) {
  const styles = useThemeStyles();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const twoColumn = width >= 768;
  const profileId = user?.id ?? null;
  const callerPhone = user?.phone ?? null;

  const [inputs, setInputs] = useState<FitnessInputs>(INITIAL_INPUTS);
  const [view, setView] = useState<'calculator' | 'history'>('calculator');
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  const handleChange = useCallback((field: keyof FitnessInputs, value: string) => {
    setInputs((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'gender' && value === 'male') {
        next.hip = '';
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      if (field === 'gender' && value === 'female') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      return next;
    });
    setSaveMessage('');
    setSaveError('');
  }, []);

  const snapshot = useMemo(() => buildFitnessSnapshot(inputs), [inputs]);
  const { metrics, healthStatus, errors, isComplete } = snapshot;

  const isMetric = inputs.unitSystem === 'metric';
  const lengthUnit = isMetric ? 'cm' : 'in';
  const weightUnit = isMetric ? 'kg' : 'lbs';

  const handleSave = async () => {
    setSaveError('');
    setSaveMessage('');

    if (!profileId) {
      setSaveError('Log in to save assessments to your profile.');
      return;
    }

    if (!callerPhone) {
      setSaveError('Your account must have a phone number on file to save assessments.');
      return;
    }

    if (!isComplete) {
      setSaveError('Complete all required measurements before saving.');
      return;
    }

    setSaving(true);
    try {
      const { error, available } = await saveFitnessAssessment(callerPhone, profileId, inputs);

      if (!available) {
        setSaveError('Database not ready. Run sql/061_assessment_security.sql in Supabase.');
        return;
      }

      if (error) {
        console.error('[Fitness Assessment] save error:', error);
        setSaveError('Failed to save assessment. Please try again.');
        return;
      }

      setSaveMessage('Saved successfully.');
      setHistoryRefreshKey((k) => k + 1);
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (
    field: keyof FitnessInputs,
    label: string,
    placeholder: string,
    keyboardType: 'numeric' | 'decimal-pad' = 'numeric',
  ) => (
    <View style={{ marginBottom: 14 }}>
      <FieldLabel>{label}</FieldLabel>
      <TextInput
        value={inputs[field]}
        onChangeText={(text) => {
          if (text.startsWith('-')) return;
          handleChange(field, text);
        }}
        placeholder={placeholder}
        placeholderTextColor={styles.tokens.textMuted}
        keyboardType={keyboardType}
        style={styles.input}
      />
      {errors[field as keyof typeof errors] ? (
        <Text style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>
          {errors[field as keyof typeof errors]}
        </Text>
      ) : null}
    </View>
  );

  const inputsPanel = (
    <View style={{ flex: 1, gap: 16 }}>
      <View>
        <Text style={[styles.textGold, { fontSize: 22, fontWeight: '600' }]}>Your Measurements</Text>
        <Text style={[styles.textSecondary, { marginTop: 4 }]}>Results update automatically as you type</Text>
      </View>

      <SegmentedControl
        tabs={UNIT_TABS}
        value={inputs.unitSystem}
        onChange={(id) => handleChange('unitSystem', id)}
      />

      <View style={[styles.card, { padding: 16 }]}>
        <Text style={[styles.textGold, { fontSize: 18, fontWeight: '600', marginBottom: 4 }]}>Core Information</Text>
        <Text style={[styles.textSecondary, { fontSize: 12, marginBottom: 12 }]}>
          Basic details used for metabolic calculations
        </Text>

        <FieldLabel>Gender</FieldLabel>
        <SegmentedControl
          tabs={GENDER_TABS}
          value={inputs.gender}
          onChange={(id) => handleChange('gender', id)}
          style={{ marginBottom: 14 }}
        />

        {renderInput('age', 'Age (years)', '30')}
        <FieldLabel>Activity Level</FieldLabel>
        <ScrollSelect
          value={inputs.activityLevel}
          onChange={(v) => handleChange('activityLevel', v)}
          options={ACTIVITY_OPTIONS}
          placeholder="Select activity"
        />
        <View style={{ height: 14 }} />
        {renderInput('height', `Height (${lengthUnit})`, isMetric ? '170' : '68', 'decimal-pad')}
        {renderInput('weight', `Weight (${weightUnit})`, isMetric ? '70' : '154', 'decimal-pad')}
      </View>

      <View style={[styles.card, { padding: 16 }]}>
        <Text style={[styles.textGold, { fontSize: 18, fontWeight: '600', marginBottom: 4 }]}>Body Measurements</Text>
        <Text style={[styles.textSecondary, { fontSize: 12, marginBottom: 12 }]}>
          Circumference values for body composition
        </Text>
        {renderInput('neck', `Neck (${lengthUnit})`, isMetric ? '38' : '15', 'decimal-pad')}
        {renderInput('waist', `Waist (${lengthUnit})`, isMetric ? '80' : '32', 'decimal-pad')}
        {inputs.gender === 'female'
          ? renderInput('hip', `Hip (${lengthUnit})`, isMetric ? '95' : '38', 'decimal-pad')
          : null}
      </View>
    </View>
  );

  const resultsPanel = (
    <View style={{ flex: 1, gap: 12 }}>
      <View>
        <Text style={[styles.textGold, { fontSize: 22, fontWeight: '600' }]}>Live Results</Text>
        <Text style={[styles.textSecondary, { marginTop: 4 }]}>Your personalized fitness metrics</Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <MetricCard title="BMI" value={metrics.bmi} unit="kg/m²" status={healthStatus.bmi} />
        <MetricCard title="Body Fat" value={metrics.bodyFatPercent} unit="%" status={healthStatus.bodyFat} />
      </View>

      <MetricCard title="BMR" value={metrics.bmr} unit="kcal/day" status={null} />

      <View style={[styles.card, { padding: 16 }]}>
        <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }]}>
          TDEE
        </Text>
        <Text style={[styles.textGold, { fontSize: 32, fontWeight: '600', marginTop: 8 }]}>
          {metrics.tdee ?? '—'}
          {metrics.tdee != null ? (
            <Text style={[styles.textSecondary, { fontSize: 14 }]}> kcal/day</Text>
          ) : null}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          <CalorieSubCard label="Weight Loss" value={metrics.calorieTargets?.weightLoss ?? null} />
          <CalorieSubCard label="Maintenance" value={metrics.calorieTargets?.maintenance ?? null} />
          <CalorieSubCard label="Muscle Gain" value={metrics.calorieTargets?.muscleGain ?? null} />
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ gap: 20 }}>
      {!profileId && (
        <View
          style={[
            styles.card,
            { padding: 14, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
          ]}
        >
          <Text style={[styles.textSecondary, { flex: 1, fontSize: 14 }]}>
            Use the calculator without an account, or log in to save results.
          </Text>
          {onLoginPress ? (
            <Pressable onPress={onLoginPress}>
              <Text style={[styles.textGold, { fontWeight: '600' }]}>Log in</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {profileId ? (
        <SegmentedControl
          tabs={VIEW_TABS}
          value={view}
          onChange={(id) => setView(id as 'calculator' | 'history')}
        />
      ) : null}

      {view === 'history' && profileId ? (
        <View style={{ gap: 12 }}>
          <Text style={[styles.textGold, { fontSize: 22, fontWeight: '600' }]}>Saved History</Text>
          <Text style={styles.textSecondary}>
            All assessments saved to your profile, newest first.
          </Text>
          <FitnessAssessmentHistoryPanel
            profileId={profileId}
            callerPhone={callerPhone}
            refreshKey={historyRefreshKey}
          />
        </View>
      ) : (
        <>
      <View style={{ flexDirection: twoColumn ? 'row' : 'column', gap: 20, alignItems: 'flex-start' }}>
        {inputsPanel}
        {resultsPanel}
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: styles.tokens.borderLight, paddingTop: 16, gap: 12 }}>
        <Pressable
          onPress={handleSave}
          disabled={saving || !isComplete}
          style={[styles.buttonPrimary, (saving || !isComplete) && { opacity: 0.5 }]}
        >
          <Text style={styles.buttonPrimaryText}>{saving ? 'Saving…' : 'Save to Profile'}</Text>
        </Pressable>
        {saveMessage ? <Text style={{ color: STATUS_COLORS.success, fontSize: 14 }}>{saveMessage}</Text> : null}
        {saveError ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <Text style={{ color: STATUS_COLORS.danger, fontSize: 14 }}>{saveError}</Text>
            {!profileId && onLoginPress ? (
              <Pressable onPress={onLoginPress}>
                <Text style={[styles.textGold, { fontWeight: '600' }]}>Log in</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
        </>
      )}
    </View>
  );
}
