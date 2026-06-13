import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import {
  fetchFitnessAssessmentHistory,
  formatAssessmentDate,
  formatAssessmentSummary,
  getActivityLabel,
} from '@nail-couture/shared/utils/fitnessAssessmentService.js';

const toneClasses = {
  success: 'text-green-400',
  warning: 'text-yellow-400',
  danger: 'text-red-400',
};

function MetricPill({ label, value, unit, tone, theme }) {
  if (value == null) return null;
  const toneClass = tone && toneClasses[tone] ? toneClasses[tone] : 'text-gold-strong';

  return (
    <div
      className={clsx(
        'rounded-lg border px-3 py-2',
        theme === 'dark' ? 'border-gold/20 bg-offwhite/[0.03]' : 'border-gold/30 bg-cream/50',
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-secondary">{label}</p>
      <p className={clsx('font-heading text-lg', toneClass)}>
        {value}
        {unit ? <span className="text-xs text-secondary ml-1">{unit}</span> : null}
      </p>
    </div>
  );
}

export default function FitnessAssessmentHistory({
  profileId,
  callerPhone,
  theme,
  refreshKey = 0,
  compact = false,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(Boolean(profileId));
  const [expandedId, setExpandedId] = useState(null);
  const [unavailable, setUnavailable] = useState(false);

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

  if (!profileId) return null;

  if (loading) {
    return (
      <p className="text-sm text-gold animate-pulse py-4">
        Loading saved assessments…
      </p>
    );
  }

  if (unavailable) {
    return (
      <p className="text-sm text-secondary py-4">
        Saved history will appear here after running sql/061_assessment_security.sql in Supabase.
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <div
        className={clsx(
          'rounded-xl border p-6 text-center',
          theme === 'dark' ? 'border-gold/20 bg-offwhite/[0.02]' : 'border-gold/30 bg-white',
        )}
      >
        <p className="text-secondary text-sm">No saved assessments yet.</p>
        <p className="text-muted text-xs mt-2">Complete the calculator and tap Save to Profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const summary = formatAssessmentSummary(row);
        if (!summary) return null;
        const expanded = expandedId === summary.id;
        const inputs = row.inputs || {};

        return (
          <div
            key={summary.id}
            className={clsx(
              'rounded-xl border transition-all duration-300',
              theme === 'dark' ? 'border-gold/20 bg-offwhite/[0.02]' : 'border-gold/30 bg-white',
              expanded && 'ring-1 ring-gold/30',
            )}
          >
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : summary.id)}
              className="w-full text-left p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-heading text-sm text-gold">
                    {formatAssessmentDate(summary.savedAt)}
                  </p>
                  {!compact && (
                    <p className="text-xs text-muted mt-1">
                      {inputs.gender === 'female' ? 'Female' : 'Male'}
                      {inputs.age ? ` · Age ${inputs.age}` : ''}
                      {inputs.activityLevel ? ` · ${getActivityLabel(inputs.activityLevel)}` : ''}
                    </p>
                  )}
                </div>
                <span className="text-xs text-secondary">{expanded ? 'Hide' : 'Details'}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                <MetricPill
                  label="BMI"
                  value={summary.metrics.bmi}
                  unit="kg/m²"
                  tone={summary.healthStatus.bmi?.tone}
                  theme={theme}
                />
                <MetricPill
                  label="Body fat"
                  value={summary.metrics.bodyFatPercent}
                  unit="%"
                  tone={summary.healthStatus.bodyFat?.tone}
                  theme={theme}
                />
                <MetricPill label="BMR" value={summary.metrics.bmr} unit="kcal" theme={theme} />
                <MetricPill label="TDEE" value={summary.metrics.tdee} unit="kcal" theme={theme} />
              </div>
            </button>

            {expanded && (
              <div
                className={clsx(
                  'px-4 pb-4 pt-0 border-t',
                  theme === 'dark' ? 'border-white/5' : 'border-charcoal/5',
                )}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-sm">
                  <div>
                    <p className={clsx('text-[10px] uppercase tracking-wider text-secondary')}>Height</p>
                    <p className="text-primary">{inputs.height || '—'} {inputs.unitSystem === 'imperial' ? 'in' : 'cm'}</p>
                  </div>
                  <div>
                    <p className={clsx('text-[10px] uppercase tracking-wider text-secondary')}>Weight</p>
                    <p className="text-primary">{inputs.weight || '—'} {inputs.unitSystem === 'imperial' ? 'lbs' : 'kg'}</p>
                  </div>
                  <div>
                    <p className={clsx('text-[10px] uppercase tracking-wider text-secondary')}>Neck</p>
                    <p className="text-primary">{inputs.neck || '—'}</p>
                  </div>
                  <div>
                    <p className={clsx('text-[10px] uppercase tracking-wider text-secondary')}>Waist</p>
                    <p className="text-primary">{inputs.waist || '—'}</p>
                  </div>
                  {inputs.gender === 'female' && (
                    <div>
                      <p className={clsx('text-[10px] uppercase tracking-wider text-secondary')}>Hip</p>
                      <p className="text-primary">{inputs.hip || '—'}</p>
                    </div>
                  )}
                  {summary.metrics.calorieTargets && (
                    <>
                      <div>
                        <p className={clsx('text-[10px] uppercase tracking-wider text-secondary')}>Weight loss</p>
                        <p className="text-primary">{summary.metrics.calorieTargets.weightLoss} kcal</p>
                      </div>
                      <div>
                        <p className={clsx('text-[10px] uppercase tracking-wider text-secondary')}>Maintenance</p>
                        <p className="text-primary">{summary.metrics.calorieTargets.maintenance} kcal</p>
                      </div>
                      <div>
                        <p className={clsx('text-[10px] uppercase tracking-wider text-secondary')}>Muscle gain</p>
                        <p className="text-primary">{summary.metrics.calorieTargets.muscleGain} kcal</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
