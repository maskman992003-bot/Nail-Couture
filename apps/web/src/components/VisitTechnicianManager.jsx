import { useState, useEffect, useCallback, useRef } from 'react';
import clsx from 'clsx';
import { getWorkstationStatus, WORKSTATION_ON_BREAK } from '@nail-couture/shared/utils/technicianWorkstation';
import {
  fetchVisitTechnicianData,
  addVisitCoTechnician,
  handoffVisitTechnician,
  removeVisitTechnician,
  MAX_CO_TECHNICIANS,
  countCoTechnicians,
} from '@nail-couture/shared/utils/visitTechnicians';

export default function VisitTechnicianManager({
  appointment,
  callerPhone,
  technicians = [],
  theme = 'dark',
  onUpdated,
  compact = false,
}) {
  const [data, setData] = useState({ technicians: [], primary_technician_id: null });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [addTechId, setAddTechId] = useState('');
  const [handoffTechId, setHandoffTechId] = useState('');

  const isDark = theme === 'dark';
  const mutedClass = isDark ? 'text-offwhite/60' : 'text-charcoal/60';
  const textClass = isDark ? 'text-offwhite' : 'text-charcoal';
  const inputClass = isDark
    ? 'w-full px-3 py-2 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg text-sm'
    : 'w-full px-3 py-2 bg-charcoal/5 border border-charcoal/20 text-charcoal rounded-lg text-sm';

  const onUpdatedRef = useRef(onUpdated);
  onUpdatedRef.current = onUpdated;

  const reload = useCallback(async (notifyParent = false) => {
    if (!appointment?.id || !callerPhone) return;
    setLoading(true);
    setError('');
    try {
      const result = await fetchVisitTechnicianData(callerPhone, appointment.id);
      setData(result);
      if (notifyParent) onUpdatedRef.current?.(result);
    } catch (err) {
      setError(err.message || 'Failed to load technicians');
    } finally {
      setLoading(false);
    }
  }, [appointment?.id, callerPhone]);

  useEffect(() => {
    reload(false);
  }, [appointment?.id, callerPhone, reload]);

  const primaryTechnicianId = data.primary_technician_id ?? appointment?.technician_id ?? null;

  const busyTechIds = new Set(
    technicians
      .filter((t) => getWorkstationStatus(t.preferences) === WORKSTATION_ON_BREAK)
      .map((t) => t.id),
  );

  const participatingIds = new Set((data.technicians || []).map((t) => t.technician_id));
  const availableToAdd = technicians.filter(
    (t) => !participatingIds.has(t.id) && !busyTechIds.has(t.id),
  );

  const coTechCount = countCoTechnicians(data.technicians, primaryTechnicianId);
  const canAddMore = coTechCount < MAX_CO_TECHNICIANS;
  const addLabel = coTechCount === 0 ? 'Add co-technician' : 'Add another co-technician';

  const handoffCandidates = (data.technicians || [])
    .filter((t) => t.technician_id !== primaryTechnicianId)
    .concat(
      technicians
        .filter((t) => t.id !== primaryTechnicianId && !participatingIds.has(t.id) && !busyTechIds.has(t.id))
        .map((t) => ({ technician_id: t.id, full_name: t.full_name, is_primary: false })),
    )
    .filter((t, i, arr) => arr.findIndex((x) => x.technician_id === t.technician_id) === i);

  const runAction = async (key, fn) => {
    setBusy(key);
    setError('');
    try {
      await fn();
      await reload(true);
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  if (!appointment?.id) return null;

  return (
    <div className={clsx(compact ? 'space-y-3' : 'space-y-4 rounded-lg border p-4', isDark ? 'border-gold/20' : 'border-gold/30')}>
      {!compact && (
        <h4 className={clsx('font-heading text-gold text-sm', textClass)}>Manage Technicians</h4>
      )}

      {loading ? (
        <p className={clsx('text-sm', mutedClass)}>Loading…</p>
      ) : (
        <>
          {(data.technicians || []).length > 0 && (
            <div>
              <p className={clsx('text-xs mb-2', mutedClass)}>Participating</p>
              <ul className="space-y-1">
                {(data.technicians || []).map((t) => {
                  const isPrimary = t.is_primary || t.technician_id === primaryTechnicianId;
                  return (
                    <li key={t.technician_id} className={clsx('flex items-center justify-between text-sm', textClass)}>
                      <span>
                        {t.full_name || 'Technician'}
                        {isPrimary ? (
                          <span className={clsx('ml-2 text-xs text-gold')}>(primary)</span>
                        ) : (
                          <span className={clsx('ml-2 text-xs', mutedClass)}>(co-tech)</span>
                        )}
                      </span>
                      {!isPrimary && (
                        <button
                          type="button"
                          disabled={busy === `remove-${t.technician_id}`}
                          onClick={() => runAction(`remove-${t.technician_id}`, () =>
                            removeVisitTechnician(callerPhone, appointment.id, t.technician_id))}
                          className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {canAddMore ? (
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[140px]">
                <label className={clsx('text-xs block mb-1', mutedClass)}>{addLabel}</label>
                <select
                  value={addTechId}
                  onChange={(e) => setAddTechId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select…</option>
                  {availableToAdd.map((tech) => (
                    <option key={tech.id} value={tech.id}>{tech.full_name}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={!addTechId || busy === 'add'}
                onClick={() => runAction('add', () =>
                  addVisitCoTechnician(callerPhone, appointment.id, addTechId).then(() => setAddTechId('')))}
                className="px-3 py-2 bg-gold/20 text-gold text-sm rounded-lg hover:bg-gold/30 disabled:opacity-50"
              >
                {busy === 'add' ? 'Adding…' : 'Add'}
              </button>
            </div>
          ) : (
            <p className={clsx('text-xs', mutedClass)}>
              Maximum of {MAX_CO_TECHNICIANS} co-technicians reached.
            </p>
          )}

          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[140px]">
              <label className={clsx('text-xs block mb-1', mutedClass)}>Handoff primary to</label>
              <select
                value={handoffTechId}
                onChange={(e) => setHandoffTechId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select…</option>
                {handoffCandidates.map((t) => (
                  <option key={t.technician_id} value={t.technician_id}>
                    {t.full_name || 'Technician'}
                    {participatingIds.has(t.technician_id) ? ' (on visit)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={!handoffTechId || busy === 'handoff'}
              onClick={() => runAction('handoff', () =>
                handoffVisitTechnician(callerPhone, appointment.id, handoffTechId).then(() => setHandoffTechId('')))}
              className="px-3 py-2 border border-gold/40 text-gold text-sm rounded-lg hover:bg-gold/10 disabled:opacity-50"
            >
              {busy === 'handoff' ? 'Handing off…' : 'Handoff'}
            </button>
          </div>
        </>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

/** Badge showing multiple technician names when 2+ participate. */
export function MultiTechBadge({ appointment, visitData, theme = 'dark' }) {
  const techs = visitData?.technicians || appointment?.visit_technicians || [];
  const names = techs.length >= 2
    ? techs.map((t) => t.full_name).filter(Boolean).join(', ')
    : null;
  if (!names) return null;
  const isDark = theme === 'dark';
  return (
    <span className={clsx('text-xs px-2 py-0.5 rounded', isDark ? 'bg-gold/20 text-gold' : 'bg-gold/15 text-gold')}>
      {names}
    </span>
  );
}
