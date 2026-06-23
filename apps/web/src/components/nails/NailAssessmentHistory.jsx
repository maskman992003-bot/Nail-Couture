import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { Trash2 } from 'lucide-react';
import {
  assessmentRowToInputs,
  deleteNailAssessment,
  fetchNailAssessmentHistory,
  formatAssessmentDate,
  formatAssessmentSummary,
  getEnhancementLabel,
  getFlexibilityLabel,
  getSurfaceHealthLabel,
} from '@nail-couture/shared/utils/nailAssessmentService.js';
import AppModal, { modalBtnDanger, modalBtnPrimary, modalBtnSecondary } from '../AppModal';

const toneClasses = {
  success: 'text-green-400',
  warning: 'text-yellow-400',
  danger: 'text-red-400',
};

function MetricPill({ label, value, unit, tone, theme }) {
  if (value == null && value !== 0) return null;
  const toneClass = tone && toneClasses[tone] ? toneClasses[tone] : 'text-gold-strong';

  return (
    <div
      className={clsx(
        'rounded-lg border px-3 py-2',
        theme === 'dark' ? 'border-gold/20 bg-offwhite/[0.03]' : 'border-gold/30 bg-cream/50',
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-secondary">{label}</p>
      <p className={clsx('font-heading text-lg', toneClass)}>
        {value}
        {unit ? <span className="text-xs text-secondary ml-1">{unit}</span> : null}
      </p>
    </div>
  );
}

export default function NailAssessmentHistory({
  profileId,
  callerPhone,
  theme,
  refreshKey = 0,
  compact = false,
  onRestore,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(Boolean(profileId));
  const [expandedId, setExpandedId] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const [confirmDeleteRow, setConfirmDeleteRow] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const loadHistory = useCallback(async () => {
    if (!profileId || !callerPhone) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { rows: data, available } = await fetchNailAssessmentHistory(callerPhone, profileId);
    setRows(data);
    setUnavailable(!available);
    setLoading(false);
  }, [profileId, callerPhone]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, refreshKey]);

  const handleConfirmDelete = async () => {
    if (!confirmDeleteRow?.id || !profileId || !callerPhone) return;

    setDeletingId(confirmDeleteRow.id);
    setDeleteError('');

    const { success, error, available } = await deleteNailAssessment(
      callerPhone,
      profileId,
      confirmDeleteRow.id,
    );

    setDeletingId(null);

    if (!available) {
      setDeleteError('Database not ready. Run sql/109_delete_nail_assessment.sql in Supabase.');
      return;
    }

    if (!success) {
      console.error('[NailAssessmentHistory] delete error:', error);
      setDeleteError('Failed to delete assessment. Please try again.');
      return;
    }

    if (expandedId === confirmDeleteRow.id) {
      setExpandedId(null);
    }

    setConfirmDeleteRow(null);
    await loadHistory();
  };

  if (!profileId) return null;

  if (loading) {
    return (
      <p className="text-sm text-gold animate-pulse py-4">
        Loading saved assessments…
      </p>
    );
  }

  if (unavailable) {
    return (
      <p className="text-sm text-secondary py-4">
        Saved history will appear here after running sql/061_assessment_security.sql in Supabase.
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <div
        className={clsx(
          'rounded-xl border p-6 text-center',
          theme === 'dark' ? 'border-gold/20 bg-offwhite/[0.02]' : 'border-gold/30 bg-white',
        )}
      >
        <p className="text-secondary text-sm">No saved assessments yet.</p>
        <p className="text-muted text-xs mt-2">Complete the calculator and tap Save to Profile.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {rows.map((row) => {
          const summary = formatAssessmentSummary(row);
          if (!summary) return null;
          const expanded = expandedId === summary.id;
          const inputs = row.inputs || {};
          const d = summary.diagnostics;

          return (
            <div
              key={summary.id}
              className={clsx(
                'rounded-xl border transition-all duration-300',
                theme === 'dark' ? 'border-gold/20 bg-offwhite/[0.02]' : 'border-gold/30 bg-white',
                expanded && 'ring-1 ring-gold/30',
              )}
            >
              <div className="p-4">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : summary.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-heading text-sm text-gold">
                          {formatAssessmentDate(summary.savedAt)}
                        </p>
                        {!compact && (
                          <p className="text-xs text-muted mt-1">
                            {getSurfaceHealthLabel(inputs.surfaceHealth)}
                            {inputs.flexibility ? ` · ${getFlexibilityLabel(inputs.flexibility)}` : ''}
                            {inputs.currentEnhancement ? ` · ${getEnhancementLabel(inputs.currentEnhancement)}` : ''}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-secondary">{expanded ? 'Hide' : 'Details'}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                      <MetricPill
                        label="Base"
                        value={d.recommendedBaseLabel}
                        tone={summary.healthStatus?.tone}
                        theme={theme}
                      />
                      <MetricPill
                        label="Maintenance"
                        value={d.maintenanceDays}
                        unit="days"
                        theme={theme}
                      />
                      <MetricPill
                        label="Regrowth"
                        value={d.monthsToRegrowth}
                        unit="mo"
                        theme={theme}
                      />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError('');
                      setConfirmDeleteRow(summary);
                    }}
                    disabled={deletingId === summary.id}
                    aria-label={`Delete assessment from ${formatAssessmentDate(summary.savedAt)}`}
                    className={clsx(
                      'shrink-0 p-2 rounded-lg transition-colors disabled:opacity-50',
                      theme === 'dark'
                        ? 'text-red-400 hover:bg-red-500/10'
                        : 'text-red-600 hover:bg-red-50',
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {expanded && (
              <div
                className={clsx(
                  'px-4 pb-4 pt-0 border-t',
                  theme === 'dark' ? 'border-white/5' : 'border-charcoal/5',
                )}
              >
                {d.prepProtocol?.steps?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[10px] uppercase tracking-wider text-secondary mb-2">Prep protocol</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
                      {d.prepProtocol.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {onRestore && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        const restored = assessmentRowToInputs(row);
                        if (restored) onRestore(restored);
                      }}
                      className={clsx(modalBtnPrimary, 'w-full sm:w-auto')}
                    >
                      Load into calculator
                    </button>
                  </div>
                )}
              </div>
              )}
            </div>
          );
        })}
      </div>

      <AppModal
        open={Boolean(confirmDeleteRow)}
        onClose={() => {
          if (deletingId) return;
          setConfirmDeleteRow(null);
          setDeleteError('');
        }}
        title="Delete assessment?"
        subtitle="This action cannot be undone."
        maxWidth="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setConfirmDeleteRow(null);
                setDeleteError('');
              }}
              disabled={Boolean(deletingId)}
              className={modalBtnSecondary}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={Boolean(deletingId)}
              className={modalBtnDanger}
            >
              {deletingId ? 'Deleting…' : 'Delete assessment'}
            </button>
          </>
        }
      >
        <p className="text-secondary text-sm">
          Permanently remove the assessment saved on{' '}
          <span className="text-primary font-medium">
            {confirmDeleteRow ? formatAssessmentDate(confirmDeleteRow.savedAt) : ''}
          </span>
          ? You will not be able to recover it.
        </p>
        {deleteError && <p className="text-sm text-red-400 mt-3">{deleteError}</p>}
      </AppModal>
    </>
  );
}
