import { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Scale, Flame, Activity } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { buildFitnessSnapshot } from '@nail-couture/shared/utils/fitnessCalculations.js';
import {
  saveFitnessAssessment,
} from '@nail-couture/shared/utils/fitnessAssessmentService.js';
import { modalBtnPrimary } from '../AppModal';
import FitnessInputSection from './FitnessInputSection';
import FitnessMetricCard from './FitnessMetricCard';
import FitnessTdeeCard from './FitnessTdeeCard';
import FitnessAssessmentHistory from './FitnessAssessmentHistory';
import SegmentedControl from './SegmentedControl';
import useRegisterPullToRefresh from '../../hooks/useRegisterPullToRefresh';

const DEFAULT_INPUTS = {
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

export default function FitnessAssessmentDashboard({ className }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const profileId = user?.id ?? null;
  const callerPhone = user?.phone ?? null;

  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [view, setView] = useState('calculator');
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  useRegisterPullToRefresh(() => setHistoryRefreshKey((k) => k + 1));

  const handleChange = useCallback((field, value) => {
    setInputs((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'gender' && value === 'male') {
        next.hip = '';
      }
      return next;
    });
    setSaveMessage('');
    setSaveError('');
  }, []);

  const snapshot = useMemo(() => buildFitnessSnapshot(inputs), [inputs]);
  const { metrics, healthStatus, errors, isComplete } = snapshot;

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

      setHistoryRefreshKey((k) => k + 1);
      setSaveMessage('Saved successfully.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={clsx('w-full', className)}>
      {!profileId && (
        <p className="text-sm text-secondary mb-6 rounded-xl border border-light bg-secondary/50 px-4 py-3">
          You can use the calculator without an account.{' '}
          <Link to="/login" className="text-gold hover:underline">
            Log in
          </Link>{' '}
          to save results to your profile.
        </p>
      )}

      {profileId && (
        <div className="mb-6">
          <SegmentedControl tabs={VIEW_TABS} value={view} onChange={setView} />
        </div>
      )}

      {view === 'history' && profileId ? (
        <div className="space-y-4">
          <div>
            <h2 className="font-heading text-xl text-gold mb-1">Saved History</h2>
            <p className="text-sm text-secondary">
              All assessments saved to your profile, newest first. Tap a row for full details, or use the trash icon to delete.
            </p>
          </div>
          <FitnessAssessmentHistory
            profileId={profileId}
            callerPhone={callerPhone}
            theme={theme}
            refreshKey={historyRefreshKey}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
            <FitnessInputSection
              inputs={inputs}
              errors={errors}
              onChange={handleChange}
              theme={theme}
            />

            <div className="space-y-4 lg:sticky lg:top-6">
              <div>
                <h2 className="font-heading text-xl text-gold mb-1">Live Results</h2>
                <p className="text-sm text-secondary">Your personalized fitness metrics</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FitnessMetricCard
                  title="BMI"
                  value={metrics.bmi}
                  unit={metrics.bmi != null ? 'kg/m²' : null}
                  icon={Scale}
                  status={healthStatus.bmi}
                  theme={theme}
                />
                <FitnessMetricCard
                  title="Body Fat"
                  value={metrics.bodyFatPercent}
                  unit={metrics.bodyFatPercent != null ? '%' : null}
                  icon={Activity}
                  status={healthStatus.bodyFat}
                  theme={theme}
                />
              </div>

              <FitnessMetricCard
                title="BMR"
                value={metrics.bmr}
                unit={metrics.bmr != null ? 'kcal / day' : null}
                icon={Flame}
                status={null}
                theme={theme}
              />

              <FitnessTdeeCard tdee={metrics.tdee} calorieTargets={metrics.calorieTargets} />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-light flex flex-col sm:flex-row sm:items-center gap-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isComplete}
              className={clsx(modalBtnPrimary, 'sm:max-w-xs', !isComplete && 'opacity-50 cursor-not-allowed')}
            >
              {saving ? 'Saving…' : 'Save to Profile'}
            </button>
            {saveMessage && (
              <p className="text-sm text-green-400 transition-opacity duration-300">{saveMessage}</p>
            )}
            {saveError && (
              <p className="text-sm text-red-400 transition-opacity duration-300">
                {saveError}
                {!profileId && (
                  <>
                    {' '}
                    <Link to="/login" className="text-gold hover:underline">
                      Log in
                    </Link>
                  </>
                )}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
