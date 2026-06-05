import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { getCustomerDetailPath } from '../../utils/routes';

export default function TechnicianQueue({
  pendingAssignments,
  actionId,
  onAccept,
  userRole,
  newAssignmentIds = [],
}) {
  if (pendingAssignments.length === 0) return null;

  return (
    <div className="bg-card border border-card rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="font-heading text-lg text-primary">My Assignments</h2>
        {newAssignmentIds.length > 0 && (
          <span className="px-2 py-0.5 text-xs font-bold bg-gold text-charcoal rounded-full animate-pulse">
            {newAssignmentIds.length} new
          </span>
        )}
      </div>
      <div className="space-y-3">
        {pendingAssignments.map((appt, index) => {
          const isNew = newAssignmentIds.includes(appt.id);
          return (
          <div
            key={appt.id}
            className={clsx(
              'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg',
              isNew ? 'bg-gold/15 border border-gold/40' : 'bg-secondary'
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-gold/20 rounded-full flex items-center justify-center text-gold font-heading shrink-0">
                {index + 1}
              </div>
              <div className="min-w-0">
                <Link
                  to={getCustomerDetailPath(userRole, appt.customer_id)}
                  className="text-primary font-medium hover:text-gold-strong transition-colors truncate block"
                >
                  {appt.customer?.full_name || 'Guest'}
                  {isNew && (
                    <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-gold text-charcoal rounded uppercase">
                      New
                    </span>
                  )}
                </Link>
                <div className="text-secondary text-sm truncate">
                  {appt.add_ons || appt.services?.name || 'Service'}
                </div>
                {appt.customer?.nail_goal && (
                  <div className="text-gold-strong/70 text-xs mt-0.5 truncate">
                    Goal: {appt.customer.nail_goal}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 sm:flex-col sm:items-end">
              <span className="text-secondary text-xs">
                {appt.checked_in_at
                  ? new Date(appt.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : ''}
              </span>
              <button
                type="button"
                onClick={() => onAccept(appt)}
                disabled={actionId === appt.id}
                className={clsx(
                  'px-5 py-2.5 rounded-lg font-medium text-sm transition-colors min-w-[120px]',
                  actionId === appt.id
                    ? 'bg-gold/50 text-charcoal cursor-wait'
                    : 'bg-gold text-charcoal hover:bg-gold/90'
                )}
              >
                {actionId === appt.id ? 'Starting…' : 'Accept & Start'}
              </button>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
