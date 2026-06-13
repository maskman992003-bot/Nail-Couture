/** Activity level multipliers applied to BMR for TDEE. */
export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

export const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'lightly_active', label: 'Lightly Active' },
  { value: 'moderately_active', label: 'Moderately Active' },
  { value: 'very_active', label: 'Very Active' },
  { value: 'extra_active', label: 'Extra Active' },
];

const LIMITS = {
  age: { min: 13, max: 120 },
  height: { metric: { min: 100, max: 250 }, imperial: { min: 39, max: 98 } },
  weight: { metric: { min: 25, max: 300 }, imperial: { min: 55, max: 660 } },
  neck: { metric: { min: 20, max: 60 }, imperial: { min: 8, max: 24 } },
  waist: { metric: { min: 40, max: 200 }, imperial: { min: 16, max: 80 } },
  hip: { metric: { min: 40, max: 200 }, imperial: { min: 16, max: 80 } },
};

const LBS_TO_KG = 0.453592;
const IN_TO_CM = 2.54;

function parseNum(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function inRange(value, min, max) {
  return value >= min && value <= max;
}

/** Convert display units to metric (kg, cm) for all formulas. */
export function toMetric({ unitSystem, weight, height, neck, waist, hip }) {
  const w = parseNum(weight);
  const h = parseNum(height);
  const n = parseNum(neck);
  const wa = parseNum(waist);
  const hi = parseNum(hip);

  if (unitSystem === 'imperial') {
    return {
      weightKg: w != null ? w * LBS_TO_KG : null,
      heightCm: h != null ? h * IN_TO_CM : null,
      neckCm: n != null ? n * IN_TO_CM : null,
      waistCm: wa != null ? wa * IN_TO_CM : null,
      hipCm: hi != null ? hi * IN_TO_CM : null,
    };
  }

  return {
    weightKg: w,
    heightCm: h,
    neckCm: n,
    waistCm: wa,
    hipCm: hi,
  };
}

function validateField(name, value, unitSystem) {
  const errors = [];
  if (value === '' || value == null) return errors;

  const n = parseNum(value);
  if (n == null) {
    errors.push(`${name} must be a valid number`);
    return errors;
  }

  if (n < 0) {
    errors.push(`${name} cannot be negative`);
    return errors;
  }

  let limits;
  if (name === 'Age') limits = LIMITS.age;
  else if (name === 'Height') limits = LIMITS.height[unitSystem];
  else if (name === 'Weight') limits = LIMITS.weight[unitSystem];
  else if (name === 'Neck') limits = LIMITS.neck[unitSystem];
  else if (name === 'Waist') limits = LIMITS.waist[unitSystem];
  else if (name === 'Hip') limits = LIMITS.hip[unitSystem];

  if (limits && !inRange(n, limits.min, limits.max)) {
    errors.push(`${name} must be between ${limits.min} and ${limits.max}`);
  }

  return errors;
}

/** Validate raw form inputs; returns field-level errors. */
export function validateFitnessInputs(inputs) {
  const { unitSystem, gender, age, height, weight, neck, waist, hip } = inputs;
  const errors = {};

  const assign = (field, msgs) => {
    if (msgs.length) errors[field] = msgs[0];
  };

  assign('age', validateField('Age', age, unitSystem));
  assign('height', validateField('Height', height, unitSystem));
  assign('weight', validateField('Weight', weight, unitSystem));
  assign('neck', validateField('Neck', neck, unitSystem));
  assign('waist', validateField('Waist', waist, unitSystem));

  if (gender === 'female') {
    assign('hip', validateField('Hip', hip, unitSystem));
  }

  const metric = toMetric({ unitSystem, weight, height, neck, waist, hip });

  if (metric.waistCm != null && metric.neckCm != null && metric.waistCm <= metric.neckCm) {
    errors.waist = 'Waist must be greater than neck';
  }

  if (gender === 'female' && metric.waistCm != null && metric.hipCm != null && metric.neckCm != null) {
    if (metric.waistCm + metric.hipCm <= metric.neckCm) {
      errors.hip = 'Waist + hip must be greater than neck';
    }
  }

  return errors;
}

/** BMI = weight (kg) / height (m)² */
export function calculateBMI(weightKg, heightCm) {
  if (weightKg == null || heightCm == null || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/** Mifflin-St Jeor BMR — gender-specific constant at the end. */
export function calculateBMR({ gender, weightKg, heightCm, age }) {
  const a = parseNum(age);
  if (weightKg == null || heightCm == null || a == null) return null;

  const base = 10 * weightKg + 6.25 * heightCm - 5 * a;
  return gender === 'female' ? base - 161 : base + 5;
}

/** TDEE = BMR × activity multiplier. */
export function calculateTDEE(bmr, activityLevel) {
  if (bmr == null || !ACTIVITY_MULTIPLIERS[activityLevel]) return null;
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

/** U.S. Navy Hodgdon-Beckett circumference method — measurements converted to inches internally. */
export function calculateBodyFatNavy({ gender, heightCm, neckCm, waistCm, hipCm }) {
  if (heightCm == null || neckCm == null || waistCm == null || heightCm <= 0) return null;

  const heightIn = heightCm / IN_TO_CM;
  const neckIn = neckCm / IN_TO_CM;
  const waistIn = waistCm / IN_TO_CM;

  if (gender === 'female') {
    if (hipCm == null) return null;
    const hipIn = hipCm / IN_TO_CM;
    const sum = waistIn + hipIn - neckIn;
    if (sum <= 0) return null;
    return (
      163.205 * Math.log10(sum) -
      97.684 * Math.log10(heightIn) -
      78.387
    );
  }

  const diff = waistIn - neckIn;
  if (diff <= 0) return null;
  return (
    86.010 * Math.log10(diff) -
    70.041 * Math.log10(heightIn) +
    36.76
  );
}

/** Map BMI to health tone for badge color-coding. */
export function getBmiHealthStatus(bmi) {
  if (bmi == null || !Number.isFinite(bmi)) return { label: null, tone: null };
  if (bmi < 18.5) return { label: 'Underweight', tone: 'warning' };
  if (bmi < 25) return { label: 'Normal', tone: 'success' };
  if (bmi < 30) return { label: 'Overweight', tone: 'warning' };
  return { label: 'Obese', tone: 'danger' };
}

/** ACE-style body fat categories by gender. */
export function getBodyFatHealthStatus(bodyFat, gender) {
  if (bodyFat == null || !Number.isFinite(bodyFat)) return { label: null, tone: null };

  if (gender === 'female') {
    if (bodyFat < 14) return { label: 'Essential', tone: 'warning' };
    if (bodyFat <= 24) return { label: 'Fitness', tone: 'success' };
    if (bodyFat <= 31) return { label: 'Average', tone: 'warning' };
    return { label: 'Obese', tone: 'danger' };
  }

  if (bodyFat < 6) return { label: 'Essential', tone: 'warning' };
  if (bodyFat <= 17) return { label: 'Fitness', tone: 'success' };
  if (bodyFat <= 24) return { label: 'Average', tone: 'warning' };
  return { label: 'Obese', tone: 'danger' };
}

export function roundMetric(value, decimals = 1) {
  if (value == null || !Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Whether enough numeric input exists for each metric (independent of display errors). */
function getMetricReadiness(inputs, metric) {
  const { gender, activityLevel, age } = inputs;
  const ageNum = parseNum(age);

  const hasPositive = (n) => n != null && n > 0;

  const bmiReady = hasPositive(metric.weightKg) && hasPositive(metric.heightCm);
  const bmrReady = bmiReady && hasPositive(ageNum) && gender;
  const tdeeReady = bmrReady && Boolean(ACTIVITY_MULTIPLIERS[activityLevel]);

  const bodyFatReady =
    hasPositive(metric.heightCm) &&
    hasPositive(metric.neckCm) &&
    hasPositive(metric.waistCm) &&
    metric.waistCm > metric.neckCm &&
    (gender === 'male' ||
      (hasPositive(metric.hipCm) && metric.waistCm + metric.hipCm > metric.neckCm));

  return { bmiReady, bmrReady, tdeeReady, bodyFatReady };
}

/** Single entry: validate inputs and compute all metrics. */
export function buildFitnessSnapshot(inputs) {
  const errors = validateFitnessInputs(inputs);
  const metric = toMetric(inputs);
  const { gender, activityLevel, age } = inputs;
  const { bmiReady, bmrReady, tdeeReady, bodyFatReady } = getMetricReadiness(inputs, metric);

  const bmi = bmiReady ? calculateBMI(metric.weightKg, metric.heightCm) : null;
  const bmr = bmrReady
    ? calculateBMR({ gender, weightKg: metric.weightKg, heightCm: metric.heightCm, age })
    : null;
  const tdee = tdeeReady ? calculateTDEE(bmr, activityLevel) : null;

  const bodyFatPercent = bodyFatReady
    ? calculateBodyFatNavy({
        gender,
        heightCm: metric.heightCm,
        neckCm: metric.neckCm,
        waistCm: metric.waistCm,
        hipCm: gender === 'female' ? metric.hipCm : null,
      })
    : null;

  const calorieTargets =
    tdee != null
      ? {
          weightLoss: Math.round(tdee - 500),
          maintenance: Math.round(tdee),
          muscleGain: Math.round(tdee + 300),
        }
      : null;

  return {
    errors,
    isComplete: bmrReady && tdeeReady && bodyFatPercent != null,
    metrics: {
      bmi: roundMetric(bmi, 1),
      bmr: bmr != null ? Math.round(bmr) : null,
      tdee: tdee != null ? Math.round(tdee) : null,
      bodyFatPercent: roundMetric(bodyFatPercent, 1),
      calorieTargets,
    },
    healthStatus: {
      bmi: getBmiHealthStatus(bmi),
      bodyFat: getBodyFatHealthStatus(bodyFatPercent, gender),
    },
  };
}

export function buildSavePayload(inputs) {
  const snapshot = buildFitnessSnapshot(inputs);
  return {
    inputs: {
      ...inputs,
      hip: inputs.gender === 'female' ? inputs.hip : null,
    },
    metrics: snapshot.metrics,
    healthStatus: snapshot.healthStatus,
    savedAt: new Date().toISOString(),
  };
}
