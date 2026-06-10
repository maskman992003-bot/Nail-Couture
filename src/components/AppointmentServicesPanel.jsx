import { useState, useEffect } from 'react';
import clsx from 'clsx';
import {
  fetchAppointmentServiceHistory,
  fetchServicePriceMap,
  buildVisitServiceSummary,
  namesFromVisit,
} from '../utils/appointmentServiceHistory';
import { getAppointmentServiceGroups, getAppointmentServices } from '../utils/appointmentHelpers';
import { getVisitPanelStyles } from './visitPanelStyles';

function splitNames(value) {
  if (!value) return [];
  return value.split(',').map((n) => n.trim()).filter(Boolean);
}

function collectHistoryServiceNames(appointment, rows) {
  const names = new Set(namesFromVisit(appointment));
  (rows || []).forEach((row) => {
    ['previous_service_names', 'new_service_names', 'previous_addons', 'new_addons'].forEach((field) => {
      splitNames(row[field]).forEach((n) => names.add(n));
    });
  });
  return [...names];
}

function formatStepDate(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function normalizeLineItems(items) {
  if (!items?.length) return [];
  return items.map((item) => (typeof item === 'string' ? { name: item, price: null } : item));
}

function ServiceLineList({ label, items, variant = 'main', styles }) {
  const lineItems = normalizeLineItems(items);
  if (!lineItems.length) return null;

  const dotColor = variant === 'addon'
    ? 'bg-amber-400/80'
    : variant === 'removed'
      ? 'bg-red-400/60'
      : 'bg-gold/80';

  return (
    <div>
      <div className={clsx('text-[10px] uppercase tracking-widest mb-1.5', styles.labelClass)}>{label}</div>
      <ul className="space-y-1">
        {lineItems.map((item) => (
          <li key={`${variant}-${item.name}`} className="flex items-start justify-between gap-2 text-sm">
            <div className="flex items-start gap-2 min-w-0">
              <span className={clsx('mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0', dotColor)} />
              <span className={clsx(styles.textClass, variant === 'removed' && clsx('line-through', styles.mutedClass))}>
                {variant === 'addon' ? `+ ${item.name}` : variant === 'removed' ? `− ${item.name}` : item.name}
              </span>
            </div>
            {item.price != null && (
              <span className={clsx('text-gold font-heading flex-shrink-0 text-xs', variant === 'removed' && 'line-through opacity-60')}>
                ${Number(item.price).toFixed(2)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ServiceChangeStep({ entry, stepNumber, isLast, styles }) {
  return (
    <div className="flex gap-2.5">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-6 h-6 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center text-[10px] font-heading text-gold">
          {stepNumber}
        </div>
        {!isLast && <div className={clsx('w-px flex-1 min-h-[0.75rem] mt-1', styles.lineClass)} />}
      </div>
      <div className={clsx('flex-1 min-w-0', !isLast && 'pb-3')}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
          <span className={clsx('font-heading font-medium text-xs', styles.accentClass)}>{entry.action}</span>
          <span className={clsx('text-[10px]', styles.mutedClass)}>{formatStepDate(entry.date)}</span>
        </div>
        <div className={clsx('mt-1.5 p-2.5 rounded-lg border space-y-2', styles.cardClass)}>
          {entry.action === 'Services removed' ? (
            <>
              <ServiceLineList label="Removed services" items={entry.removedMainItems || entry.removedMain} variant="removed" styles={styles} />
              <ServiceLineList label="Removed add-ons" items={entry.removedAddonItems || entry.removedAddons} variant="removed" styles={styles} />
            </>
          ) : (
            <>
              <ServiceLineList label="Services" items={entry.mainItems || entry.mainServices} styles={styles} />
              {(entry.addonItems?.length > 0 || entry.addons?.length > 0) && (
                <ServiceLineList label="Add-ons" items={entry.addonItems || entry.addons} variant="addon" styles={styles} />
              )}
            </>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px]">
          <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border', styles.badgeClass)}>
            <span className={styles.accentClass}>{entry.changedByName}</span>
            <span>· {entry.changedByRole}</span>
          </span>
          {entry.stepPrice != null && entry.stepPrice > 0 && (
            <span className="text-gold font-heading text-xs">${Number(entry.stepPrice).toFixed(2)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AppointmentServicesPanel({
  appointment,
  tone = 'admin',
  theme = 'dark',
  showHistory = true,
  showFinalServices = true,
  className,
}) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const styles = getVisitPanelStyles(tone, theme);

  useEffect(() => {
    if (!appointment?.id) {
      setSummary(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const historyMap = await fetchAppointmentServiceHistory([appointment.id]);
        const rows = historyMap[appointment.id] || [];
        const serviceNames = collectHistoryServiceNames(appointment, rows);
        const priceMap = await fetchServicePriceMap(serviceNames);
        const built = buildVisitServiceSummary(appointment, rows, priceMap);
        if (!cancelled) setSummary(built);
      } catch (err) {
        console.error('Failed to load appointment services:', err);
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [appointment?.id]);

  if (!appointment) return null;

  if (loading) {
    return (
      <div className={clsx('py-3 text-center text-sm animate-pulse', styles.mutedClass, className)}>
        Loading services…
      </div>
    );
  }

  const finalItems = summary?.finalWithPrices || (() => {
    const groups = getAppointmentServiceGroups(appointment);
    return {
      mainItems: groups.main.map((name) => ({ name, price: null })),
      addonItems: groups.addons.map((name) => ({ name, price: null })),
    };
  })();

  const changeLog = showHistory ? (summary?.changeLog || []) : [];
  const allServices = getAppointmentServices(appointment);
  const totalItems = finalItems.mainItems.length + finalItems.addonItems.length || allServices.length;
  const hasFinalItems = showFinalServices && (finalItems.mainItems.length > 0 || finalItems.addonItems.length > 0);
  const hasChangeLog = changeLog.length > 0;

  if (!hasFinalItems && !hasChangeLog) {
    return (
      <div className={className}>
        <ul className={clsx('space-y-2', styles.textClass)}>
          {allServices.map((service, idx) => (
            <li key={`${service}-${idx}`}>{service}</li>
          ))}
          {allServices.length === 0 && (
            <li className={styles.mutedClass}>No services listed</li>
          )}
        </ul>
      </div>
    );
  }

  return (
    <div className={clsx('space-y-3', className)}>
      {hasFinalItems && (
        <div>
          <div className={clsx('text-[10px] uppercase tracking-widest mb-2', styles.labelClass)}>
            Services performed · {totalItems} item{totalItems === 1 ? '' : 's'}
          </div>
          <ServiceLineList label="Services" items={finalItems.mainItems} styles={styles} />
          {finalItems.addonItems.length > 0 && (
            <div className="mt-2">
              <ServiceLineList label="Add-ons" items={finalItems.addonItems} variant="addon" styles={styles} />
            </div>
          )}
        </div>
      )}

      {hasChangeLog && (
        <div className={clsx(hasFinalItems && 'pt-3 border-t', styles.sectionBorder)}>
          <div className={clsx('text-[10px] uppercase tracking-widest mb-2', styles.labelClass)}>Service history</div>
          <div className="pl-0.5">
            {changeLog.map((entry, index) => (
              <ServiceChangeStep
                key={entry.id}
                entry={entry}
                stepNumber={index + 1}
                isLast={index === changeLog.length - 1}
                styles={styles}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
