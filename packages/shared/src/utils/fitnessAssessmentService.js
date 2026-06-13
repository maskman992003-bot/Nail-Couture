import { getSupabase } from '../lib/supabase.js';
import { buildSavePayload, ACTIVITY_OPTIONS } from './fitnessCalculations.js';

const HISTORY_RPC = 'get_fitness_assessment_history';
const SAVE_RPC = 'save_fitness_assessment';

function isAssessmentUnavailable(error) {
  const msg = (error?.message || '').toLowerCase();
  return (
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('could not find the function')
  );
}

function normalizeRpcRows(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') return [data];
  return [];
}

/** Map stored JSON inputs back to form field strings. */
export function assessmentRowToInputs(row) {
  if (!row?.inputs || typeof row.inputs !== 'object') return null;

  const i = row.inputs;
  const str = (v) => (v == null || v === '' ? '' : String(v));

  return {
    unitSystem: i.unitSystem === 'imperial' ? 'imperial' : 'metric',
    gender: i.gender === 'female' ? 'female' : 'male',
    age: str(i.age),
    height: str(i.height),
    weight: str(i.weight),
    activityLevel: i.activityLevel || 'moderately_active',
    neck: str(i.neck),
    waist: str(i.waist),
    hip: str(i.hip),
  };
}

/** Human-readable activity label from stored value. */
export function getActivityLabel(activityLevel) {
  return ACTIVITY_OPTIONS.find((o) => o.value === activityLevel)?.label || activityLevel || '—';
}

/** Compact summary for history cards and profile. */
export function formatAssessmentSummary(row) {
  if (!row) return null;

  const metrics = row.metrics || {};
  const healthStatus = row.health_status || row.healthStatus || {};

  return {
    id: row.id,
    savedAt: row.created_at,
    inputs: row.inputs || {},
    metrics: {
      bmi: metrics.bmi ?? null,
      bmr: metrics.bmr ?? null,
      tdee: metrics.tdee ?? null,
      bodyFatPercent: metrics.bodyFatPercent ?? null,
      calorieTargets: metrics.calorieTargets ?? null,
    },
    healthStatus: {
      bmi: healthStatus.bmi || null,
      bodyFat: healthStatus.bodyFat || null,
    },
  };
}

export function formatAssessmentDate(isoDate) {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Fetch the most recent saved assessment for a profile. */
export async function fetchLatestFitnessAssessment(callerPhone, profileId) {
  const { rows, available, error } = await fetchFitnessAssessmentHistory(callerPhone, profileId, 1);
  if (!available) return { row: null, available: false };
  if (error) return { row: null, available: true, error };
  return { row: rows[0] || null, available: true };
}

/** Fetch saved assessment history newest first. */
export async function fetchFitnessAssessmentHistory(callerPhone, profileId, limit = 20) {
  if (!profileId || !callerPhone) return { rows: [], available: false };

  try {
    const { data, error } = await getSupabase().rpc(HISTORY_RPC, {
      caller_phone: callerPhone,
      p_profile_id: profileId,
      p_limit: limit,
    });

    if (error) {
      if (isAssessmentUnavailable(error)) return { rows: [], available: false };
      console.error('[fitnessAssessment] fetchHistory error:', error);
      return { rows: [], available: true, error };
    }

    return { rows: normalizeRpcRows(data), available: true };
  } catch (err) {
    console.error('[fitnessAssessment] fetchHistory exception:', err);
    return { rows: [], available: false };
  }
}

/** Persist assessment snapshot linked to profile. */
export async function saveFitnessAssessment(callerPhone, profileId, formInputs) {
  if (!profileId) {
    return { data: null, error: new Error('Profile ID is required'), available: true };
  }
  if (!callerPhone) {
    return { data: null, error: new Error('Phone is required'), available: true };
  }

  const payload = buildSavePayload(formInputs);

  try {
    const { data, error } = await getSupabase().rpc(SAVE_RPC, {
      caller_phone: callerPhone,
      p_profile_id: profileId,
      p_inputs: payload.inputs,
      p_metrics: payload.metrics,
      p_health_status: payload.healthStatus,
    });

    if (error) {
      if (isAssessmentUnavailable(error)) {
        return { data: null, error, available: false };
      }
      return { data: null, error, available: true };
    }

    return { data, error: null, available: true };
  } catch (err) {
    return { data: null, error: err, available: true };
  }
}
