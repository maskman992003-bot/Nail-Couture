export const NAIL_SHAPE_OPTIONS = [
  { value: 'flat', label: 'Flat' },
  { value: 'curved', label: 'Curved' },
  { value: 'pincer', label: 'Pincer' },
];

export const FLEXIBILITY_OPTIONS = [
  { value: 'overly-flexible', label: 'Overly Flexible' },
  { value: 'normal', label: 'Normal' },
  { value: 'brittle', label: 'Brittle' },
];

export const SURFACE_HEALTH_OPTIONS = [
  { value: 'healthy', label: 'Healthy' },
  { value: 'peeling', label: 'Peeling' },
  { value: 'ridged', label: 'Ridged' },
  { value: 'discolored', label: 'Discolored' },
];

export const ENHANCEMENT_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'gel', label: 'Gel' },
  { value: 'acrylic', label: 'Acrylic' },
  { value: 'dip', label: 'Dip Powder' },
];

export const LIFESTYLE_OPTIONS = [
  { value: 'light', label: 'Light Activity' },
  { value: 'moderate', label: 'Moderate Activity' },
  { value: 'heavy-manual', label: 'Heavy Manual Work' },
];

export const RECOMMENDED_BASE_LABELS = {
  'rubber-base': 'Rubber Base Gel',
  'hard-gel': 'Hard Gel',
  'standard-gel': 'Standard Gel',
};

const BASE_PREP_STEPS = {
  'rubber-base': 'Apply flexible rubber base; build thin even layer for shock absorption',
  'hard-gel': 'Build structured apex with hard gel for rigidity on flat plates',
  'standard-gel': 'Apply standard gel base coat; cure and proceed with color application',
};

const AGE_LIMITS = { min: 13, max: 120 };
const DAMAGE_LIMITS = { min: 0, max: 20 };
const FINGERNAIL_GROWTH_MM_PER_MONTH = 3.47;
const MAINTENANCE_BASELINE_DAYS = 21;
const MAINTENANCE_MIN_DAYS = 7;

function parseNum(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function inRange(value, min, max) {
  return value >= min && value <= max;
}

export function roundMetric(value, decimals = 1) {
  if (value == null || !Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function resolveRecommendedBase({ flexibility, nailShape, surfaceHealth }) {
  if (flexibility === 'overly-flexible' || surfaceHealth === 'peeling') {
    return 'rubber-base';
  }
  if (flexibility === 'brittle' && nailShape === 'flat') {
    return 'hard-gel';
  }
  return 'standard-gel';
}

function calculateMaintenanceDays({ lifestyle, currentEnhancement }) {
  let days = MAINTENANCE_BASELINE_DAYS;
  if (lifestyle === 'heavy-manual') days -= 4;
  if (currentEnhancement === 'acrylic') days += 7;
  return Math.max(MAINTENANCE_MIN_DAYS, days);
}

function calculateMonthsToRegrowth(damageDistanceMm) {
  const damage = parseNum(damageDistanceMm);
  if (damage == null || damage <= 0) return null;
  return roundMetric(damage / FINGERNAIL_GROWTH_MM_PER_MONTH, 1);
}

function buildPrepProtocol({ flexibility, surfaceHealth, recommendedBase }) {
  const steps = [];

  if (surfaceHealth === 'peeling') {
    steps.push('Dehydrate nail plate; gentle buff only (no aggressive filing)');
  }
  if (flexibility === 'brittle') {
    steps.push('Apply protein primer before base coat');
  }
  if (flexibility === 'overly-flexible') {
    steps.push('Skip over-filing; anchor with flexible rubber base layer');
  }
  if (surfaceHealth === 'ridged') {
    steps.push('Fill ridges with smoothing base before color');
  }
  if (surfaceHealth === 'discolored') {
    steps.push('Light dehydrator; avoid staining pigments until regrowth');
  }

  const baseStep = BASE_PREP_STEPS[recommendedBase];
  if (baseStep && !steps.includes(baseStep)) {
    steps.push(baseStep);
  }

  if (steps.length === 0) {
    steps.push('Standard prep: sanitize, push back cuticles, light dehydrator, apply base coat');
  }

  return { steps };
}

/** Map visual symptoms to a health status badge. */
export function getNailHealthStatus(inputs) {
  const { flexibility, surfaceHealth, damageDistanceMm } = inputs;
  const damage = parseNum(damageDistanceMm);

  if (surfaceHealth === 'discolored' || (damage != null && damage >= 5)) {
    return { label: 'Needs Attention', tone: 'danger' };
  }

  if (
    surfaceHealth === 'peeling' ||
    flexibility === 'brittle' ||
    flexibility === 'overly-flexible' ||
    surfaceHealth === 'ridged'
  ) {
    return { label: 'Monitor Closely', tone: 'warning' };
  }

  return { label: 'Healthy', tone: 'success' };
}

/** Core nail diagnostic decision matrix. */
export function calculateNailDiagnostics(inputs) {
  const recommendedBase = resolveRecommendedBase(inputs);
  const maintenanceDays = calculateMaintenanceDays(inputs);
  const monthsToRegrowth = calculateMonthsToRegrowth(inputs.damageDistanceMm);
  const prepProtocol = buildPrepProtocol({ ...inputs, recommendedBase });

  return {
    recommendedBase,
    recommendedBaseLabel: RECOMMENDED_BASE_LABELS[recommendedBase] || recommendedBase,
    maintenanceDays,
    monthsToRegrowth,
    prepProtocol,
  };
}

/** Validate raw form inputs; returns field-level errors. */
export function validateNailInputs(inputs) {
  const errors = {};
  const { age, damageDistanceMm } = inputs;

  if (age !== '' && age != null) {
    const ageNum = parseNum(age);
    if (ageNum == null) {
      errors.age = 'Age must be a valid number';
    } else if (!inRange(ageNum, AGE_LIMITS.min, AGE_LIMITS.max)) {
      errors.age = `Age must be between ${AGE_LIMITS.min} and ${AGE_LIMITS.max}`;
    }
  }

  if (damageDistanceMm !== '' && damageDistanceMm != null) {
    const damageNum = parseNum(damageDistanceMm);
    if (damageNum == null) {
      errors.damageDistanceMm = 'Damage distance must be a valid number';
    } else if (damageNum < 0) {
      errors.damageDistanceMm = 'Damage distance cannot be negative';
    } else if (!inRange(damageNum, DAMAGE_LIMITS.min, DAMAGE_LIMITS.max)) {
      errors.damageDistanceMm = `Damage distance must be between ${DAMAGE_LIMITS.min} and ${DAMAGE_LIMITS.max} mm`;
    }
  }

  return errors;
}

function isInputsComplete(inputs) {
  const required = ['nailShape', 'flexibility', 'surfaceHealth', 'currentEnhancement', 'lifestyle'];
  return required.every((field) => Boolean(inputs[field]));
}

/** Single entry: validate inputs and compute all diagnostics. */
export function buildNailSnapshot(inputs) {
  const errors = validateNailInputs(inputs);
  const diagnostics = calculateNailDiagnostics(inputs);
  const healthStatus = getNailHealthStatus(inputs);

  return {
    errors,
    isComplete: isInputsComplete(inputs) && Object.keys(errors).length === 0,
    diagnostics,
    healthStatus,
  };
}

export function buildSavePayload(inputs) {
  const snapshot = buildNailSnapshot(inputs);
  return {
    inputs,
    diagnostics: snapshot.diagnostics,
    healthStatus: snapshot.healthStatus,
    savedAt: new Date().toISOString(),
  };
}
