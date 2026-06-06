export type SelectOption = { value: string; label: string };

export const MONTHS: SelectOption[] = [
  { value: '', label: 'Month' },
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export const DAYS: SelectOption[] = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1).padStart(2, '0'),
  label: String(i + 1).padStart(2, '0'),
}));

export const NAIL_GOALS = [
  { value: '', label: 'Select your nail goal' },
  { value: 'Healthy Natural Nails', label: 'Healthy Natural Nails' },
  { value: 'Long Extensions', label: 'Long Extensions' },
  { value: 'Intricate Art', label: 'Intricate Art' },
];
