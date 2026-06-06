import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { getServices } from '../../services/services';
import {
  buildAppointmentChecklist,
  getChecklistProgress,
  checklistCompletionCount,
} from '../../utils/serviceChecklist';

export default function TechnicianServiceChecklist({
  appointment,
  onToggleItem,
  saving = false,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getServices()
      .then((catalog) => {
        if (cancelled) return;
        setItems(buildAppointmentChecklist(appointment, catalog));
      })
      .catch(() => {
        if (!cancelled) setItems(buildAppointmentChecklist(appointment, []));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [appointment.id, appointment.service_id, appointment.add_ons, appointment.services]);

  const progress = getChecklistProgress(appointment);
  const { done, total } = checklistCompletionCount(items, progress);

  if (loading) {
    return (
      <div className="mt-4">
        <p className="text-secondary text-xs animate-pulse">Loading checklist…</p>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-secondary text-xs uppercase tracking-wide">Service Checklist</h3>
        <span className={clsx(
          'text-xs px-2 py-0.5 rounded',
          done === total ? 'bg-green-400/15 text-green-400' : 'bg-secondary text-secondary'
        )}>
          {done}/{total}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => {
          const checked = !!progress[item.id];
          return (
            <li key={item.id}>
              <label className={clsx(
                'flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors',
                checked
                  ? 'bg-green-400/10 border-green-400/30'
                  : 'bg-secondary border-light hover:border-theme',
                saving && 'opacity-60 pointer-events-none'
              )}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleItem(item.id, !checked)}
                  className="accent-gold w-4 h-4 shrink-0"
                />
                <span className={clsx('text-sm', checked ? 'text-primary line-through opacity-70' : 'text-primary')}>
                  {item.label}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
