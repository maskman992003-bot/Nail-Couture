import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Beaker, ClipboardList } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchLatestNailAssessment,
  formatAssessmentDate,
  formatAssessmentSummary,
} from '@nail-couture/shared/utils/nailAssessmentService.js';

const toneClasses = {
  success: 'bg-green-500/15 text-green-400 border-green-500/20',
  warning: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  danger: 'bg-red-500/15 text-red-400 border-red-500/20',
};

function CardShell({ title, children }) {
  return (
    <div className="bg-secondary border-card rounded-xl border p-6">
      <h3 className="font-heading text-lg text-gold mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function TechnicianNailSummary({ profileId }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId || !user?.phone) {
      setLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      const row = await fetchLatestNailAssessment(user.phone, profileId);
      if (!mounted) return;

      setSummary(row ? formatAssessmentSummary(row) : null);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [profileId, user?.phone]);

  if (loading) {
    return (
      <CardShell title="Nail Assessment">
        <p className="text-secondary text-sm animate-pulse">Loading nail assessment…</p>
      </CardShell>
    );
  }

  if (!summary) {
    return (
      <CardShell title="Nail Assessment">
        <p className="text-secondary text-sm">
          No nail assessment on file. Send client a link to take it.
        </p>
        <Link
          to="/nail-assessment"
          className="inline-block mt-3 text-gold text-sm font-heading hover:underline"
        >
          Open assessment link →
        </Link>
      </CardShell>
    );
  }

  const { healthStatus, diagnostics } = summary;
  const steps = diagnostics?.prepProtocol?.steps || [];

  return (
    <CardShell title="Nail Assessment">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-secondary text-sm">
          Last Assessed:{' '}
          <span className="text-primary">{formatAssessmentDate(summary.savedAt)}</span>
        </p>
        {healthStatus?.label && healthStatus?.tone && (
          <span
            className={clsx(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
              toneClasses[healthStatus.tone],
            )}
          >
            {healthStatus.label}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-gold/30 bg-gold/10 p-4 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-secondary mb-1">
              Recommended Base
            </p>
            <p className="font-heading text-xl text-gold">
              {diagnostics.recommendedBaseLabel || '—'}
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold">
            <Beaker className="h-5 w-5" aria-hidden />
          </div>
        </div>
      </div>

      {steps.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="h-4 w-4 text-gold shrink-0" aria-hidden />
            <p className="text-[10px] uppercase tracking-wider text-secondary">Prep Protocol</p>
          </div>
          <ul className="space-y-1.5">
            {steps.map((step, index) => (
              <li key={`${index}-${step}`} className="flex gap-2 text-sm text-primary">
                <span className="text-gold font-medium shrink-0">•</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </CardShell>
  );
}
