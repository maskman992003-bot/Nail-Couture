import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useMysteryGiftAdmin } from '@nail-couture/shared/hooks/useMysteryGift';
import {
  MYSTERY_GIFT_TIERS,
  MYSTERY_GIFT_TRACKING_DAYS,
  MYSTERY_GIFT_CARD_VALIDITY_DAYS,
} from '@nail-couture/shared/utils/mysteryGift';

function formatWhen(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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

function formatMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '$0.00';
  return `$${amount.toFixed(2)}`;
}

export default function MysteryGiftPanel({ callerPhone, role }) {
  const {
    enabled,
    loading,
    acting,
    error,
    message,
    status,
    entries,
    refresh,
    startTracking,
    finalizeAwards,
  } = useMysteryGiftAdmin(callerPhone, role);

  const [confirmStart, setConfirmStart] = useState(false);
  const [confirmFinalize, setConfirmFinalize] = useState(false);

  const phase = useMemo(() => {
    if (!status?.configured) return 'setup';
    if (status.finalized) return 'done';
    if (status.can_finalize) return 'ready_to_finalize';
    return 'tracking';
  }, [status]);

  if (!enabled) return null;

  const handleStart = async () => {
    const result = await startTracking(new Date());
    if (result.success) setConfirmStart(false);
  };

  const handleFinalize = async () => {
    const result = await finalizeAwards();
    if (result.success) setConfirmFinalize(false);
  };

  return (
    <div className="rounded-2xl border border-card bg-card p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div>
          <h3 className="font-heading text-xl text-gold">Mystery Gift</h3>
          <p className="text-secondary text-sm mt-1 max-w-2xl">
            Grand opening campaign: track customer service spend for {MYSTERY_GIFT_TRACKING_DAYS} days,
            then award the top 12 customers promotional gift cards (valid {MYSTERY_GIFT_CARD_VALIDITY_DAYS} days).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading || acting}
          className="shrink-0 text-sm text-gold border border-gold/30 rounded-lg px-3 py-1.5 hover:bg-gold/10 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {MYSTERY_GIFT_TIERS.map((tier) => (
          <div key={tier.label} className="rounded-xl border border-light bg-secondary/40 px-4 py-3">
            <div className="text-[10px] uppercase tracking-widest text-muted">{tier.label}</div>
            <div className="font-heading text-lg text-gold mt-1">{formatMoney(tier.amount)}</div>
          </div>
        ))}
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 text-sm">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-green-300 text-sm">
          {message}
        </div>
      ) : null}

      {loading ? (
        <div className="text-secondary text-sm animate-pulse py-6">Loading campaign status...</div>
      ) : (
        <>
          <div className="rounded-xl border border-light bg-secondary/30 px-4 py-4 mb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted">Status: </span>
                <span className="text-primary font-medium">
                  {phase === 'setup' && 'Not started'}
                  {phase === 'tracking' && `Tracking (${status?.days_remaining ?? 0} days left)`}
                  {phase === 'ready_to_finalize' && 'Tracking ended — ready to finalize'}
                  {phase === 'done' && 'Awards issued'}
                </span>
              </div>
              <div>
                <span className="text-muted">Opening: </span>
                <span className="text-primary">{formatWhen(status?.opening_at)}</span>
              </div>
              <div>
                <span className="text-muted">Tracking ends: </span>
                <span className="text-primary">{formatWhen(status?.tracking_ends_at)}</span>
              </div>
              <div>
                <span className="text-muted">Finalized: </span>
                <span className="text-primary">{formatWhen(status?.awards_finalized_at)}</span>
              </div>
            </div>
          </div>

          {phase === 'setup' && (
            <div className="mb-5">
              {!confirmStart ? (
                <button
                  type="button"
                  onClick={() => setConfirmStart(true)}
                  disabled={acting}
                  className="bg-gold text-charcoal px-4 py-2 rounded-lg text-sm font-heading hover:opacity-90 disabled:opacity-50"
                >
                  Start Mystery Gift tracking
                </button>
              ) : (
                <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 space-y-3">
                  <p className="text-sm text-primary">
                    Start the {MYSTERY_GIFT_TRACKING_DAYS}-day tracking window now? This cannot be undone.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleStart()}
                      disabled={acting}
                      className="bg-gold text-charcoal px-4 py-2 rounded-lg text-sm font-heading disabled:opacity-50"
                    >
                      {acting ? 'Starting...' : 'Confirm start'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmStart(false)}
                      disabled={acting}
                      className="border border-light px-4 py-2 rounded-lg text-sm text-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {(phase === 'tracking' || phase === 'ready_to_finalize' || phase === 'done') && entries.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-light">
              <table className="min-w-full text-sm">
                <thead className="bg-secondary/50 text-muted text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Rank</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    {!status?.finalized ? (
                      <th className="px-4 py-3 font-medium text-right">Spend</th>
                    ) : null}
                    <th className="px-4 py-3 font-medium text-right">Award</th>
                    {status?.finalized ? (
                      <th className="px-4 py-3 font-medium">Gift card</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={`${entry.rank}-${entry.customer_id}`} className="border-t border-light">
                      <td className="px-4 py-3 text-gold font-heading">#{entry.rank}</td>
                      <td className="px-4 py-3 text-primary">{entry.full_name || '—'}</td>
                      <td className="px-4 py-3 text-secondary">{formatPhone(entry.phone)}</td>
                      {!status?.finalized ? (
                        <td className="px-4 py-3 text-right text-primary">{formatMoney(entry.total_spend)}</td>
                      ) : null}
                      <td className="px-4 py-3 text-right text-gold-strong">{formatMoney(entry.award_amount)}</td>
                      {status?.finalized ? (
                        <td className="px-4 py-3 text-secondary font-mono text-xs">
                          {entry.gift_card_code || '—'}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(phase === 'tracking' || phase === 'ready_to_finalize') && entries.length === 0 && (
            <p className="text-secondary text-sm py-4">
              No qualifying customer spend yet. Leaderboard updates as completed checkouts come in.
            </p>
          )}

          {phase === 'ready_to_finalize' && (
            <div className="mt-5">
              {!confirmFinalize ? (
                <button
                  type="button"
                  onClick={() => setConfirmFinalize(true)}
                  disabled={acting || entries.length === 0}
                  className={clsx(
                    'bg-gold text-charcoal px-4 py-2 rounded-lg text-sm font-heading disabled:opacity-50',
                    entries.length === 0 && 'cursor-not-allowed',
                  )}
                >
                  Finalize &amp; issue gift cards
                </button>
              ) : (
                <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 space-y-3">
                  <p className="text-sm text-primary">
                    Issue Mystery Gift cards to the top {entries.length} customer{entries.length === 1 ? '' : 's'}?
                    Cards expire in {MYSTERY_GIFT_CARD_VALIDITY_DAYS} days.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleFinalize()}
                      disabled={acting}
                      className="bg-gold text-charcoal px-4 py-2 rounded-lg text-sm font-heading disabled:opacity-50"
                    >
                      {acting ? 'Issuing...' : 'Confirm finalize'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmFinalize(false)}
                      disabled={acting}
                      className="border border-light px-4 py-2 rounded-lg text-sm text-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
