import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { featureFlags } from '../../constants/featureFlags';
import {
  fetchMaterialInventory,
  fetchAppointmentUsageLogs,
} from '../../utils/inventoryUsage';

export default function TechnicianProductUsage({
  appointment,
  onLogUsage,
  saving = false,
}) {
  const [materials, setMaterials] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const usageEnabled = featureFlags.operations.usageLogging;
  const wasteEnabled = featureFlags.operations.wasteTracking;

  useEffect(() => {
    if (!usageEnabled) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchMaterialInventory(),
      fetchAppointmentUsageLogs(appointment.id),
    ])
      .then(([inv, usageLogs]) => {
        if (cancelled) return;
        setMaterials(inv);
        setLogs(usageLogs);
        if (inv.length > 0 && !selectedId) setSelectedId(inv[0].id);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [appointment.id, usageEnabled, selectedId]);

  if (!usageEnabled) return null;

  const selected = materials.find((m) => m.id === selectedId);
  const maxQty = selected?.quantity ?? 0;

  const handleLog = async (logType) => {
    if (!selectedId || quantity < 1) return;
    setMsg('');
    const result = await onLogUsage({
      inventoryId: selectedId,
      quantity,
      logType,
    });
    if (result?.success) {
      setMsg(logType === 'waste' ? 'Waste logged' : 'Usage logged');
      const [inv, usageLogs] = await Promise.all([
        fetchMaterialInventory(),
        fetchAppointmentUsageLogs(appointment.id),
      ]);
      setMaterials(inv);
      setLogs(usageLogs);
      setQuantity(1);
    } else {
      setMsg(result?.error || 'Failed to log');
    }
  };

  if (loading) {
    return (
      <div className="mt-4">
        <p className="text-secondary text-xs animate-pulse">Loading products…</p>
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="mt-4 p-3 bg-secondary border border-light rounded-lg">
        <p className="text-secondary text-xs">No material inventory items — add products in Admin Inventory.</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h3 className="text-secondary text-xs uppercase tracking-wide mb-2">Product Usage</h3>
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[140px]">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-input border border-input rounded-lg text-primary"
          >
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.item_name} ({m.quantity} {m.unit || 'units'})
              </option>
            ))}
          </select>
        </div>
        <div className="w-20">
          <input
            type="number"
            min={1}
            max={Math.max(maxQty, 1)}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-full px-2 py-2 text-sm bg-input border border-input rounded-lg text-primary text-center"
          />
        </div>
        <button
          type="button"
          onClick={() => handleLog('usage')}
          disabled={saving || maxQty < quantity}
          className="px-3 py-2 text-xs bg-gold/15 text-gold-strong border border-gold/30 rounded-lg hover:bg-gold/25 disabled:opacity-50 min-h-[36px]"
        >
          Log usage
        </button>
        {wasteEnabled && (
          <button
            type="button"
            onClick={() => handleLog('waste')}
            disabled={saving || maxQty < quantity}
            className="px-3 py-2 text-xs bg-red-400/15 text-red-400 border border-red-400/30 rounded-lg hover:bg-red-400/25 disabled:opacity-50 min-h-[36px]"
          >
            Log waste
          </button>
        )}
      </div>
      {maxQty < quantity && (
        <p className="text-yellow-400 text-xs mt-1">Only {maxQty} in stock</p>
      )}
      {msg && (
        <p className={clsx('text-xs mt-1', msg.includes('Failed') || msg.includes('stock') ? 'text-red-400' : 'text-green-400')}>
          {msg}
        </p>
      )}
      {logs.length > 0 && (
        <ul className="mt-3 space-y-1 max-h-24 overflow-y-auto">
          {logs.map((log) => (
            <li key={log.id} className="text-xs text-secondary flex justify-between gap-2">
              <span className="truncate">
                {log.inventory?.item_name || 'Item'} {log.quantity_changed}
              </span>
              <span className="shrink-0 text-muted">{log.reason}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
