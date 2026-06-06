export const NAIL_SHAPES = [
  { value: '', label: 'No preference' },
  { value: 'almond', label: 'Almond' },
  { value: 'coffin', label: 'Coffin' },
  { value: 'square', label: 'Square' },
  { value: 'round', label: 'Round' },
  { value: 'stiletto', label: 'Stiletto' },
];

export const NAIL_LENGTHS = [
  { value: '', label: 'No preference' },
  { value: 'natural', label: 'Natural' },
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
];

export const NAIL_FINISHES = [
  { value: '', label: 'No preference' },
  { value: 'glossy', label: 'Glossy' },
  { value: 'matte', label: 'Matte' },
  { value: 'chrome', label: 'Chrome' },
  { value: 'sheer', label: 'Sheer / Natural' },
];

export const VISIT_TIME_OPTIONS = [
  { value: '', label: 'No preference' },
  { value: 'weekday_morning', label: 'Weekday mornings' },
  { value: 'weekday_afternoon', label: 'Weekday afternoons' },
  { value: 'weekday_evening', label: 'Weekday evenings' },
  { value: 'weekend_morning', label: 'Weekend mornings' },
  { value: 'weekend_afternoon', label: 'Weekend afternoons' },
  { value: 'weekend_evening', label: 'Weekend evenings' },
];

export const CONTACT_METHOD_OPTIONS = [
  { value: 'phone', label: 'Phone call' },
  { value: 'sms', label: 'Text message (SMS)' },
  { value: 'email', label: 'Email' },
];

export function parseProfilePreferences(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      nail_shape: '',
      nail_length: '',
      nail_finish: '',
      allergies: '',
      preferred_visit_time: '',
    };
  }
  return {
    nail_shape: raw.nail_shape || '',
    nail_length: raw.nail_length || '',
    nail_finish: raw.nail_finish || '',
    allergies: raw.allergies || '',
    preferred_visit_time: raw.preferred_visit_time || '',
  };
}

export function buildProfilePreferences(journey) {
  const prefs = {};
  if (journey.nail_shape) prefs.nail_shape = journey.nail_shape;
  if (journey.nail_length) prefs.nail_length = journey.nail_length;
  if (journey.nail_finish) prefs.nail_finish = journey.nail_finish;
  if (journey.allergies?.trim()) prefs.allergies = journey.allergies.trim();
  if (journey.preferred_visit_time) prefs.preferred_visit_time = journey.preferred_visit_time;
  return prefs;
}

export function labelForOption(options, value) {
  return options.find((o) => o.value === value)?.label || value || 'Not set';
}
