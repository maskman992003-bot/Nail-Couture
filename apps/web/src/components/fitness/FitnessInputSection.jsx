import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { modalInputClass, modalLabelClass } from '../AppModal';
import ThemeSelect from '../ThemeSelect';
import SegmentedControl from './SegmentedControl';
import { ACTIVITY_OPTIONS } from '@nail-couture/shared/utils/fitnessCalculations.js';

const UNIT_TABS = [
  { id: 'imperial', label: 'Imperial' },
  { id: 'metric', label: 'Metric' },
];

const GENDER_TABS = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
];

function Field({ label, error, children }) {
  return (
    <div>
      <label className={modalLabelClass}>{label}</label>
      {children}
      {error && (
        <p className="text-red-400 text-xs mt-1 transition-opacity duration-300">{error}</p>
      )}
    </div>
  );
}

function sectionCardClass(theme) {
  return clsx(
    'rounded-2xl border p-5 space-y-4 transition-all duration-300',
    theme === 'dark'
      ? 'bg-offwhite/[0.02] border-gold/20'
      : 'bg-white border-gold/30',
  );
}

export default function FitnessInputSection({ inputs, errors, onChange, theme }) {
  const isMetric = inputs.unitSystem === 'metric';
  const heightUnit = isMetric ? 'cm' : 'in';
  const weightUnit = isMetric ? 'kg' : 'lbs';

  const handleNumber = (field) => (e) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange(field, '');
      return;
    }
    if (raw.startsWith('-')) return;
    onChange(field, raw);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl text-gold">Your Measurements</h2>
          <p className="text-sm text-secondary mt-1">Results update automatically as you type</p>
        </div>
        <SegmentedControl
          tabs={UNIT_TABS}
          value={inputs.unitSystem}
          onChange={(id) => onChange('unitSystem', id)}
        />
      </div>

      <section className={sectionCardClass(theme)}>
        <h3 className="font-heading text-lg text-gold-strong mb-1">Core Information</h3>
        <p className="text-xs text-muted mb-4">Basic details used for metabolic calculations</p>

        <div className="space-y-4">
          <Field label="Gender" error={null}>
            <SegmentedControl
              tabs={GENDER_TABS}
              value={inputs.gender}
              onChange={(id) => onChange('gender', id)}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Age (years)" error={errors.age}>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={inputs.age}
                onChange={handleNumber('age')}
                placeholder="30"
                className={modalInputClass}
              />
            </Field>

            <Field label="Activity Level" error={null}>
              <ThemeSelect
                value={inputs.activityLevel}
                onChange={(v) => onChange('activityLevel', v)}
                options={ACTIVITY_OPTIONS}
                placeholder="Select activity"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={`Height (${heightUnit})`} error={errors.height}>
              <input
                type="number"
                min="0"
                step="0.1"
                inputMode="decimal"
                value={inputs.height}
                onChange={handleNumber('height')}
                placeholder={isMetric ? '170' : '68'}
                className={modalInputClass}
              />
            </Field>

            <Field label={`Weight (${weightUnit})`} error={errors.weight}>
              <input
                type="number"
                min="0"
                step="0.1"
                inputMode="decimal"
                value={inputs.weight}
                onChange={handleNumber('weight')}
                placeholder={isMetric ? '70' : '154'}
                className={modalInputClass}
              />
            </Field>
          </div>
        </div>
      </section>

      <section className={sectionCardClass(theme)}>
        <h3 className="font-heading text-lg text-gold-strong mb-1">Body Measurements</h3>
        <p className="text-xs text-muted mb-4">Circumference values for body composition (U.S. Navy method)</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={`Neck (${heightUnit})`} error={errors.neck}>
            <input
              type="number"
              min="0"
              step="0.1"
              inputMode="decimal"
              value={inputs.neck}
              onChange={handleNumber('neck')}
              placeholder={isMetric ? '38' : '15'}
              className={modalInputClass}
            />
          </Field>

          <Field label={`Waist (${heightUnit})`} error={errors.waist}>
            <input
              type="number"
              min="0"
              step="0.1"
              inputMode="decimal"
              value={inputs.waist}
              onChange={handleNumber('waist')}
              placeholder={isMetric ? '80' : '32'}
              className={modalInputClass}
            />
          </Field>

          <AnimatePresence mode="wait">
            {inputs.gender === 'female' && (
              <motion.div
                key="hip-field"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="sm:col-span-2 overflow-hidden"
              >
                <Field label={`Hip (${heightUnit})`} error={errors.hip}>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    inputMode="decimal"
                    value={inputs.hip}
                    onChange={handleNumber('hip')}
                    placeholder={isMetric ? '95' : '38'}
                    className={modalInputClass}
                  />
                </Field>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
