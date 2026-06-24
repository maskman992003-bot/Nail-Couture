import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  clearStuckKioskCheckIns,
  fetchStuckKioskCheckIns,
} from '@nail-couture/shared/utils/stuckKioskCheckIns';

function formatWhen(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatPhone(phone) {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function statusLabel(status) {
  if (status === 'checking_in') return 'Stuck in kiosk';
  if (status === 'waiting') return 'In lobby';
  return status || '—';
}

function statusClass(status) {
  if (status === 'checking_in') {
    return 'bg-amber-500/15 text-amber-200 border-amber-500/30';
  }
  if (status === 'waiting') {
    return 'bg-yellow-500/15 text-yellow-200 border-yellow-500/30';
  }
  return 'bg-secondary text-secondary border-light';
}

export default function StuckCheckInsPanel({ callerPhone }) {
  const [appointments, setAppointments] = useState([]);
  const [checkingInCount, setCheckingInCount] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedCheckingInCount = useMemo(
    () => appointments.filter((row) => selectedSet.has(row.id) && row.status === 'checking_in').length,
    [appointments, selectedSet],
  );

  const allSelected = appointments.length > 0 && selectedIds.length === appointments.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const loadStuck = useCallback(async () => {
    if (!callerPhone) {
      setAppointments([]);
      setCheckingInCount(0);
      setWaitingCount(0);
      setSelectedIds([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    const result = await fetchStuckKioskCheckIns(callerPhone);
    if (!result.success) {
      setMessage({ type: 'error', text: result.error });
      setAppointments([]);
      setCheckingInCount(0);
      setWaitingCount(0);
      setSelectedIds([]);
    } else {
      setAppointments(result.appointments || []);
      setCheckingInCount(result.checkingInCount ?? 0);
      setWaitingCount(result.waitingCount ?? 0);
      setSelectedIds([]);
    }
    setLoading(false);
  }, [callerPhone]);

  useEffect(() => {
    void loadStuck();
  }, [loadStuck]);

  const toggleRow = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : appointments.map((row) => row.id));
  };

  const handleClear = async (action) => {
    if (!callerPhone || selectedIds.length === 0) return;

    const targetIds =
      action === 'move_to_waiting'
        ? appointments
            .filter((row) => selectedSet.has(row.id) && row.status === 'checking_in')
            .map((row) => row.id)
        : selectedIds;

    if (targetIds.length === 0) return;

    const confirmed = window.confirm(
      action === 'cancel'
        ? `Cancel ${targetIds.length} selected walk-in${targetIds.length === 1 ? '' : 's'}?`
        : `Move ${targetIds.length} selected customer${targetIds.length === 1 ? '' : 's'} to the lobby?`,
    );
    if (!confirmed) return;

    setActing(true);
    setMessage({ type: '', text: '' });
    const result = await clearStuckKioskCheckIns(callerPhone, action, targetIds);
    setActing(false);

    if (!result.success) {
      setMessage({ type: 'error', text: result.error });
      return;
    }

    setMessage({
      type: 'success',
      text:
        action === 'cancel'
          ? `Cancelled ${result.affected_count} walk-in${result.affected_count === 1 ? '' : 's'}.`
          : `Moved ${result.affected_count} customer${result.affected_count === 1 ? '' : 's'} to the lobby.`,
    });
    await loadStuck();
  };

  return (
    <div className="rounded-2xl border border-card bg-card p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div>
          <h3 className="font-heading text-xl text-gold">Kiosk Walk-In Cleanup</h3>
          <p className="text-secondary text-sm mt-1">
            Select open walk-in visits to cancel or send stuck kiosk sessions to the lobby.
          </p>
          {!loading && appointments.length > 0 ? (
            <p className="text-muted text-xs mt-2">
              {checkingInCount} stuck in kiosk · {waitingCount} in lobby · {appointments.length} total
              {selectedIds.length > 0 ? ` · ${selectedIds.length} selected` : ''}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void loadStuck()}
          disabled={loading || acting}
          className="shrink-0 px-4 py-2 rounded-lg border border-light text-secondary text-sm hover:border-theme hover:text-primary transition-colors disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {message.text ? (
        <p
          className={clsx(
            'text-sm mb-4 rounded-lg border px-3 py-2',
            message.type === 'success'
              ? 'text-green-300 border-green-500/30 bg-green-500/10'
              : 'text-red-400 border-red-500/30 bg-red-500/10',
          )}
        >
          {message.text}
        </p>
      ) : null}

      {loading ? (
        <p className="text-secondary text-sm animate-pulse">Loading walk-ins…</p>
      ) : appointments.length === 0 ? (
        <p className="text-secondary text-sm">No open kiosk walk-ins right now.</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mb-3">
            <button
              type="button"
              onClick={toggleAll}
              disabled={acting}
              className="text-sm text-gold hover:text-gold-strong transition-colors disabled:opacity-50"
            >
              {allSelected ? 'Clear selection' : 'Select all'}
            </button>
            {someSelected ? (
              <span className="text-muted text-xs">{selectedIds.length} of {appointments.length} selected</span>
            ) : null}
          </div>

          <div className="rounded-xl border border-light overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-secondary text-left">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = someSelected;
                        }}
                        onChange={toggleAll}
                        disabled={acting}
                        aria-label="Select all walk-ins"
                        className="h-4 w-4 rounded border-light accent-[var(--gold)]"
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Started</th>
                    <th className="px-4 py-3 font-medium">Checked in</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((row) => {
                    const isSelected = selectedSet.has(row.id);
                    return (
                      <tr
                        key={row.id}
                        className={clsx(
                          'border-t border-light cursor-pointer transition-colors',
                          isSelected ? 'bg-gold/5' : 'hover:bg-secondary/30',
                        )}
                        onClick={() => !acting && toggleRow(row.id)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRow(row.id)}
                            disabled={acting}
                            aria-label={`Select ${row.customer_name || 'guest'}`}
                            className="h-4 w-4 rounded border-light accent-[var(--gold)]"
                          />
                        </td>
                        <td className="px-4 py-3 text-primary">{row.customer_name || 'Guest'}</td>
                        <td className="px-4 py-3 text-secondary">{formatPhone(row.customer_phone)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={clsx(
                              'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium',
                              statusClass(row.status),
                            )}
                          >
                            {statusLabel(row.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-secondary">{formatWhen(row.created_at)}</td>
                        <td className="px-4 py-3 text-secondary">{formatWhen(row.checked_in_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              type="button"
              onClick={() => void handleClear('cancel')}
              disabled={acting || selectedIds.length === 0}
              className="px-5 py-2.5 rounded-lg border border-red-400/40 text-red-300 text-sm font-heading hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              {acting ? 'Working…' : `Cancel selected (${selectedIds.length})`}
            </button>
            <button
              type="button"
              onClick={() => void handleClear('move_to_waiting')}
              disabled={acting || selectedCheckingInCount === 0}
              className="px-5 py-2.5 rounded-lg bg-gold text-charcoal text-sm font-heading hover:bg-gold/90 transition-colors disabled:opacity-50"
              title={
                selectedIds.length > 0 && selectedCheckingInCount === 0
                  ? 'Select at least one customer stuck in kiosk'
                  : undefined
              }
            >
              {acting ? 'Working…' : `Send selected to lobby (${selectedCheckingInCount})`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
