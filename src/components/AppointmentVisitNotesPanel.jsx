import { useState, useEffect } from 'react';
import clsx from 'clsx';
import {
  fetchAppointmentVisitNotes,
  formatVisitNoteTimestamp,
} from '../utils/appointmentVisitNotes';
import { getVisitPanelStyles } from './visitPanelStyles';

export default function AppointmentVisitNotesPanel({
  appointment,
  tone = 'admin',
  theme = 'dark',
  className,
}) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const styles = getVisitPanelStyles(tone, theme);

  useEffect(() => {
    if (!appointment?.id) {
      setEntries([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const rows = await fetchAppointmentVisitNotes(appointment);
        if (!cancelled) setEntries(rows);
      } catch (err) {
        console.error('Failed to load visit notes:', err);
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [appointment?.id, appointment?.notes, appointment?.customer_id, appointment?.customer?.id]);

  if (!appointment) return null;

  if (loading) {
    return (
      <div className={clsx('text-sm animate-pulse', styles.mutedClass, className)}>
        Loading notes…
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className={clsx('text-sm', styles.mutedClass, className)}>
        No notes provided
      </div>
    );
  }

  return (
    <div className={clsx('space-y-3', className)}>
      {entries.map((entry) => (
        <div key={entry.id} className={clsx('rounded-lg border p-3', styles.cardClass)}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 mb-1.5">
            <span className={clsx('text-xs font-heading font-medium', styles.accentClass)}>
              {entry.authorName ? `${entry.authorName} · ${entry.source}` : entry.source}
            </span>
            {entry.createdAt && (
              <span className={clsx('text-[10px]', styles.mutedClass)}>
                {formatVisitNoteTimestamp(entry.createdAt)}
              </span>
            )}
          </div>
          <p className={clsx('text-sm leading-relaxed whitespace-pre-wrap', styles.textClass)}>{entry.body}</p>
        </div>
      ))}
    </div>
  );
}
