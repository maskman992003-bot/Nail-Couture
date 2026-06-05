import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { getCustomerDetailPath } from '../../utils/routes';
import { parseProfilePreferences, labelForOption, NAIL_SHAPES, NAIL_LENGTHS, NAIL_FINISHES } from '../../utils/profilePreferences';

function AssignmentBrief({ appt, userRole }) {
  const customer = appt.customer || {};
  const prefs = parseProfilePreferences(customer.preferences);
  const prefItems = [
    prefs.nail_shape && labelForOption(NAIL_SHAPES, prefs.nail_shape),
    prefs.nail_length && labelForOption(NAIL_LENGTHS, prefs.nail_length),
    prefs.nail_finish && labelForOption(NAIL_FINISHES, prefs.nail_finish),
  ].filter(Boolean);

  return (
    <div className="mt-3 pt-3 border-t border-light space-y-1.5 text-sm">
      {customer.refreshment_pref && (
        <p className="text-secondary">
          Refreshment: <span className="text-gold-strong">{customer.refreshment_pref}</span>
        </p>
      )}
      {prefItems.length > 0 && (
        <p className="text-secondary">Prefs: {prefItems.join(' · ')}</p>
      )}
      {prefs.allergies && (
        <p className="text-red-400 font-medium">Allergies: {prefs.allergies}</p>
      )}
      {customer.nail_goal && (
        <p className="text-gold-strong/80">Goal: {customer.nail_goal}</p>
      )}
      <Link
        to={getCustomerDetailPath(userRole, appt.customer_id)}
        className="inline-block text-xs text-gold-strong hover:underline mt-1"
        onClick={(e) => e.stopPropagation()}
      >
        Full client profile →
      </Link>
    </div>
  );
}

export default function TechnicianQueue({
  pendingAssignments,
  actionId,
  onAccept,
  userRole,
  newAssignmentIds = [],
}) {
  const [expandedId, setExpandedId] = useState(null);

  if (pendingAssignments.length === 0) return null;

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

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
          const isExpanded = expandedId === appt.id;

          return (
            <div
              key={appt.id}
              className={clsx(
                'rounded-lg overflow-hidden',
                isNew ? 'bg-gold/15 border border-gold/40' : 'bg-secondary border border-transparent'
              )}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleExpand(appt.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpand(appt.id);
                  }
                }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 bg-gold/20 rounded-full flex items-center justify-center text-gold font-heading shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={getCustomerDetailPath(userRole, appt.customer_id)}
                      onClick={(e) => e.stopPropagation()}
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
                    {!isExpanded && appt.customer?.nail_goal && (
                      <div className="text-gold-strong/70 text-xs mt-0.5 truncate">
                        Goal: {appt.customer.nail_goal}
                      </div>
                    )}
                  </div>
                  <span className="text-secondary text-xs sm:hidden shrink-0">
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>

                <div className="flex items-center gap-3 sm:flex-col sm:items-end shrink-0">
                  <span className="text-secondary text-xs hidden sm:block">
                    {appt.checked_in_at
                      ? new Date(appt.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : ''}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAccept(appt);
                    }}
                    disabled={actionId === appt.id}
                    className={clsx(
                      'w-full sm:w-auto px-5 py-3 sm:py-2.5 min-h-[44px] rounded-lg font-medium text-sm transition-colors min-w-[140px]',
                      actionId === appt.id
                        ? 'bg-gold/50 text-charcoal cursor-wait'
                        : 'bg-gold text-charcoal hover:bg-gold/90'
                    )}
                  >
                    {actionId === appt.id ? 'Starting…' : 'Accept & Start'}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4">
                  <AssignmentBrief appt={appt} userRole={userRole} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
