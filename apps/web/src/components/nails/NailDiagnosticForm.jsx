import clsx from 'clsx';
import { modalInputClass, modalLabelClass } from '../AppModal';
import ThemeSelect from '../ThemeSelect';
import SegmentedControl from '../fitness/SegmentedControl';
import {
  ENHANCEMENT_OPTIONS,
  FLEXIBILITY_OPTIONS,
  LIFESTYLE_OPTIONS,
  NAIL_SHAPE_OPTIONS,
  SURFACE_HEALTH_OPTIONS,
} from '@nail-couture/shared/utils/nailCalculations.js';

const NAIL_SHAPE_TABS = NAIL_SHAPE_OPTIONS.map((o) => ({ id: o.value, label: o.label }));
const FLEXIBILITY_TABS = FLEXIBILITY_OPTIONS.map((o) => ({ id: o.value, label: o.label }));

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

export default function NailDiagnosticForm({ inputs, errors, onChange, theme }) {
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
      <div>
        <h2 className="font-heading text-xl text-gold">Nail Diagnostics</h2>
        <p className="text-sm text-secondary mt-1">Results update automatically as you adjust inputs</p>
      </div>

      <section className={sectionCardClass(theme)}>
        <h3 className="font-heading text-lg text-gold-strong mb-1">Client Profile</h3>
        <p className="text-xs text-muted mb-4">Basic details for personalized recommendations</p>

        <Field label="Age (years, optional)" error={errors.age}>
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
      </section>

      <section className={sectionCardClass(theme)}>
        <h3 className="font-heading text-lg text-gold-strong mb-1">Nail Structure</h3>
        <p className="text-xs text-muted mb-4">Shape and flexibility determine base chemistry</p>

        <div className="space-y-4">
          <Field label="Nail Shape" error={null}>
            <SegmentedControl
              tabs={NAIL_SHAPE_TABS}
              value={inputs.nailShape}
              onChange={(id) => onChange('nailShape', id)}
            />
          </Field>

          <Field label="Flexibility" error={null}>
            <SegmentedControl
              tabs={FLEXIBILITY_TABS}
              value={inputs.flexibility}
              onChange={(id) => onChange('flexibility', id)}
            />
          </Field>
        </div>
      </section>

      <section className={sectionCardClass(theme)}>
        <h3 className="font-heading text-lg text-gold-strong mb-1">Surface & Lifestyle</h3>
        <p className="text-xs text-muted mb-4">Symptoms and daily wear affect prep and maintenance</p>

        <div className="space-y-4">
          <Field label="Surface Health" error={null}>
            <ThemeSelect
              value={inputs.surfaceHealth}
              onChange={(v) => onChange('surfaceHealth', v)}
              options={SURFACE_HEALTH_OPTIONS}
              placeholder="Select surface condition"
            />
          </Field>

          <Field label="Current Enhancement" error={null}>
            <ThemeSelect
              value={inputs.currentEnhancement}
              onChange={(v) => onChange('currentEnhancement', v)}
              options={ENHANCEMENT_OPTIONS}
              placeholder="Select enhancement type"
            />
          </Field>

          <Field label="Lifestyle" error={null}>
            <ThemeSelect
              value={inputs.lifestyle}
              onChange={(v) => onChange('lifestyle', v)}
              options={LIFESTYLE_OPTIONS}
              placeholder="Select activity level"
            />
          </Field>

          <Field label="Damage Distance (mm, optional)" error={errors.damageDistanceMm}>
            <input
              type="number"
              min="0"
              step="0.1"
              inputMode="decimal"
              value={inputs.damageDistanceMm}
              onChange={handleNumber('damageDistanceMm')}
              placeholder="e.g. 3.5"
              className={modalInputClass}
            />
          </Field>
        </div>
      </section>
    </div>
  );
}
