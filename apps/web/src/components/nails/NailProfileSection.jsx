import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import {
  fetchNailAssessmentHistory,
  formatAssessmentDate,
  formatAssessmentSummary,
} from '@nail-couture/shared/utils/nailAssessmentService.js';
import NailAssessmentHistory from './NailAssessmentHistory';
import { modalBtnPrimary } from '../AppModal';

const cardClass = (theme) =>
  theme === 'dark'
    ? 'p-4 bg-white/[0.02] border border-white/5 rounded-xl'
    : 'p-4 bg-charcoal/[0.02] border border-charcoal/5 rounded-xl';

const labelClass = (theme) =>
  theme === 'dark'
    ? 'text-[10px] uppercase tracking-wider text-offwhite/30 block mb-1'
    : 'text-[10px] uppercase tracking-wider text-charcoal/30 block mb-1';

const valueClass = (theme) =>
  theme === 'dark' ? 'text-sm text-offwhite font-medium' : 'text-sm text-charcoal font-medium';

export default function NailProfileSection({ profileId, callerPhone, theme, panelClass }) {
  const [latest, setLatest] = useState(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (!profileId || !callerPhone) {
      setLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      const { rows, available: tableAvailable } = await fetchNailAssessmentHistory(
        callerPhone,
        profileId,
        50,
      );
      if (!mounted) return;

      setAvailable(tableAvailable);
      setCount(rows.length);
      setLatest(rows[0] ? formatAssessmentSummary(rows[0]) : null);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [profileId, callerPhone]);

  if (loading) {
    return <p className="text-gold animate-pulse text-sm py-4">Loading nail health data…</p>;
  }

  if (!available) {
    return (
      <p className={theme === 'dark' ? 'text-offwhite/50 text-sm' : 'text-charcoal/50 text-sm'}>
        Nail health tracking is not enabled on the database yet.
      </p>
    );
  }

  if (!latest) {
    return (
      <div className={panelClass}>
        <h3 className={theme === 'dark' ? 'text-offwhite font-medium mb-2' : 'text-charcoal font-medium mb-2'}>
          Nail Health Assessment
        </h3>
        <p className={theme === 'dark' ? 'text-offwhite/40 text-sm mb-4' : 'text-charcoal/40 text-sm mb-4'}>
          No saved assessments yet. Run a diagnostic to track chemistry, prep, and maintenance recommendations.
        </p>
        <Link to="/customer/nail-assessment" className={clsx(modalBtnPrimary, 'inline-flex px-6 max-w-xs')}>
          Start assessment
        </Link>
      </div>
    );
  }

  const d = latest.diagnostics;

  return (
    <div className="space-y-6">
      <div className={panelClass}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h3 className={theme === 'dark' ? 'text-offwhite font-medium' : 'text-charcoal font-medium'}>
              Latest assessment
            </h3>
            <p className={theme === 'dark' ? 'text-offwhite/40 text-xs mt-1' : 'text-charcoal/40 text-xs mt-1'}>
              {formatAssessmentDate(latest.savedAt)}
              {count > 1 ? ` · ${count} saved total` : ''}
            </p>
          </div>
          <Link
            to="/customer/nail-assessment"
            className="text-gold font-heading text-sm hover:underline"
          >
            Open calculator →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Recommended base', value: d.recommendedBaseLabel },
            { label: 'Maintenance', value: d.maintenanceDays != null ? `${d.maintenanceDays} days` : '—' },
            { label: 'Regrowth', value: d.monthsToRegrowth != null ? `${d.monthsToRegrowth} mo` : '—' },
          ].map((item) => (
            <div key={item.label} className={cardClass(theme)}>
              <span className={labelClass(theme)}>{item.label}</span>
              <span className={valueClass(theme)}>{item.value ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {count > 1 && (
        <div>
          <h3 className={theme === 'dark' ? 'text-offwhite font-medium mb-3' : 'text-charcoal font-medium mb-3'}>
            Assessment history
          </h3>
          <NailAssessmentHistory
            profileId={profileId}
            callerPhone={callerPhone}
            theme={theme}
            compact
          />
        </div>
      )}
    </div>
  );
}
