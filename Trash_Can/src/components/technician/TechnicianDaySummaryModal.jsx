import { Link } from 'react-router-dom';
import clsx from 'clsx';
import AppModal from '../AppModal';
import { getCustomerDetailPath } from '../../utils/routes';
import { formatServiceDuration } from '../../utils/technicianQueue';

function formatTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function TechnicianDaySummaryModal({
  open,
  onClose,
  workAppointments = [],
  paymentsByAppointment,
  userRole,
}) {
  const totalTips = workAppointments.reduce((sum, appt) => {
    const payment = paymentsByAppointment?.get(appt.id);
    return sum + Number(payment?.extras_amount ?? 0);
  }, 0);

  return (
    <AppModal open={open} onClose={onClose} title="Today's Work" maxWidth="max-w-lg">
      {workAppointments.length === 0 ? (
        <p className="text-secondary text-sm text-center py-6">No completed services yet today.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-secondary pb-2 border-b border-light">
            <span>{workAppointments.length} service{workAppointments.length !== 1 ? 's' : ''}</span>
            {totalTips > 0 && (
              <span className="text-gold-strong font-medium">${totalTips.toFixed(2)} in tips</span>
            )}
          </div>

          {workAppointments.map((appt) => {
            const payment = paymentsByAppointment?.get(appt.id);
            const tip = Number(payment?.extras_amount ?? 0);
            const isPaid = !!payment;
            const endTime = appt.end_time || appt.completed_at;
            const duration = formatServiceDuration(appt.start_time, endTime);
            const price = Number(appt.final_price ?? appt.services?.price ?? 0);

            return (
              <div key={appt.id} className="rounded-lg border border-light bg-secondary p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to={getCustomerDetailPath(userRole, appt.customer_id)}
                      className="text-primary font-medium hover:text-gold-strong truncate block"
                    >
                      {appt.customer?.full_name || 'Guest'}
                    </Link>
                    <p className="text-secondary text-xs mt-0.5 truncate">
                      {appt.add_ons || appt.services?.name || 'Service'}
                    </p>
                  </div>
                  <span
                    className={clsx(
                      'px-2 py-0.5 text-[10px] border rounded shrink-0 uppercase tracking-wide',
                      isPaid
                        ? 'bg-green-400/15 text-green-400 border-green-400/30'
                        : 'bg-amber-400/15 text-amber-400 border-amber-400/30'
                    )}
                  >
                    {isPaid ? 'Paid' : 'At checkout'}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                  {appt.start_time && (
                    <span>
                      {formatTime(appt.start_time)}
                      {endTime ? ` → ${formatTime(endTime)}` : ''}
                    </span>
                  )}
                  {duration && <span>{duration}</span>}
                  {price > 0 && <span>${price.toFixed(0)} service</span>}
                  {isPaid && tip > 0 && (
                    <span className="text-gold-strong">${tip.toFixed(2)} tip</span>
                  )}
                  {isPaid && tip <= 0 && (
                    <span>No tip</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppModal>
  );
}
