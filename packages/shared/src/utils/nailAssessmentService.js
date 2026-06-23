import { getSupabase } from '../lib/supabase.js';

import {

  buildSavePayload,

  ENHANCEMENT_OPTIONS,

  FLEXIBILITY_OPTIONS,

  LIFESTYLE_OPTIONS,

  NAIL_SHAPE_OPTIONS,

  RECOMMENDED_BASE_LABELS,

  SURFACE_HEALTH_OPTIONS,

} from './nailCalculations.js';



const HISTORY_RPC = 'get_nail_assessment_history';

const SAVE_RPC = 'save_nail_assessment';

const DELETE_RPC = 'delete_nail_assessment';

const STAFF_LATEST_RPC = 'get_staff_nail_assessment_latest';



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



function labelFromOptions(options, value) {

  return options.find((o) => o.value === value)?.label || value || '—';

}



/** Map stored JSON inputs back to form field strings. */

export function assessmentRowToInputs(row) {

  if (!row?.inputs || typeof row.inputs !== 'object') return null;



  const i = row.inputs;

  const str = (v) => (v == null || v === '' ? '' : String(v));



  return {

    age: str(i.age),

    nailShape: i.nailShape || 'flat',

    flexibility: i.flexibility || 'normal',

    surfaceHealth: i.surfaceHealth || 'healthy',

    currentEnhancement: i.currentEnhancement || 'none',

    lifestyle: i.lifestyle || 'moderate',

    damageDistanceMm: str(i.damageDistanceMm),

  };

}



export function getNailShapeLabel(value) {

  return labelFromOptions(NAIL_SHAPE_OPTIONS, value);

}



export function getFlexibilityLabel(value) {

  return labelFromOptions(FLEXIBILITY_OPTIONS, value);

}



export function getSurfaceHealthLabel(value) {

  return labelFromOptions(SURFACE_HEALTH_OPTIONS, value);

}



export function getEnhancementLabel(value) {

  return labelFromOptions(ENHANCEMENT_OPTIONS, value);

}



export function getLifestyleLabel(value) {

  return labelFromOptions(LIFESTYLE_OPTIONS, value);

}



export function getRecommendedBaseLabel(value) {

  return RECOMMENDED_BASE_LABELS[value] || value || '—';

}



/** Compact summary for history cards and profile. */

export function formatAssessmentSummary(row) {

  if (!row) return null;



  const metrics = row.metrics || {};

  const diagnostics = metrics.diagnostics || metrics;

  const healthStatus = row.health_status || row.healthStatus || {};



  return {

    id: row.id,

    savedAt: row.created_at,

    inputs: row.inputs || {},

    diagnostics: {

      recommendedBase: diagnostics.recommendedBase ?? null,

      recommendedBaseLabel: diagnostics.recommendedBaseLabel ?? getRecommendedBaseLabel(diagnostics.recommendedBase),

      maintenanceDays: diagnostics.maintenanceDays ?? null,

      monthsToRegrowth: diagnostics.monthsToRegrowth ?? null,

      prepProtocol: diagnostics.prepProtocol || { steps: [] },

    },

    healthStatus: healthStatus.label ? healthStatus : null,

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



/** Fetch the most recent nail assessment for a customer (staff CRM). Returns null if none or on error. */
export async function fetchLatestNailAssessment(callerPhone, profileId) {
  if (!profileId || !callerPhone) return null;

  try {
    const { data, error } = await getSupabase().rpc(STAFF_LATEST_RPC, {
      caller_phone: callerPhone,
      p_profile_id: profileId,
    });

    if (error) {
      if (isAssessmentUnavailable(error)) return null;
      console.error('[nailAssessment] fetchLatest error:', error);
      return null;
    }

    return data ?? null;
  } catch (err) {
    console.error('[nailAssessment] fetchLatest exception:', err);
    return null;
  }
}

/** Fetch saved assessment history newest first. */

export async function fetchNailAssessmentHistory(callerPhone, profileId, limit = 20) {

  if (!profileId || !callerPhone) return { rows: [], available: false };



  try {

    const { data, error } = await getSupabase().rpc(HISTORY_RPC, {

      caller_phone: callerPhone,

      p_profile_id: profileId,

      p_limit: limit,

    });



    if (error) {

      if (isAssessmentUnavailable(error)) return { rows: [], available: false };

      console.error('[nailAssessment] fetchHistory error:', error);

      return { rows: [], available: true, error };

    }



    return { rows: normalizeRpcRows(data), available: true };

  } catch (err) {

    console.error('[nailAssessment] fetchHistory exception:', err);

    return { rows: [], available: false };

  }

}



/** Persist assessment snapshot linked to profile. */

export async function saveNailAssessment(callerPhone, profileId, formInputs) {

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

      p_metrics: { diagnostics: payload.diagnostics },

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



/** Permanently remove a saved assessment from profile history. */

export async function deleteNailAssessment(callerPhone, profileId, assessmentId) {

  if (!profileId || !callerPhone || !assessmentId) {

    return { success: false, error: new Error('Missing required fields'), available: true };

  }



  try {

    const { error } = await getSupabase().rpc(DELETE_RPC, {

      caller_phone: callerPhone,

      p_profile_id: profileId,

      p_assessment_id: assessmentId,

    });



    if (error) {

      if (isAssessmentUnavailable(error)) {

        return { success: false, error, available: false };

      }

      console.error('[nailAssessment] delete error:', error);

      return { success: false, error, available: true };

    }



    return { success: true, error: null, available: true };

  } catch (err) {

    console.error('[nailAssessment] delete exception:', err);

    return { success: false, error: err, available: true };

  }

}


