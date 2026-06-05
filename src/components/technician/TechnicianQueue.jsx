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

const DECLINE_REASONS = [
  'Not my specialty',
  'Schedule conflict',
  'Need a break first',
  'Other',
];

export default function TechnicianQueue({
  pendingAssignments,
  actionId,
  onAccept,
  onDecline,
  onDismissNew,
  userRole,
  newAssignmentIds = [],
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [declineId, setDeclineId] = useState(null);
  const [declineReason, setDeclineReason] = useState('');

  if (pendingAssignments.length === 0) return null;

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
    if (onDismissNew && newAssignmentIds.includes(id)) {
      onDismissNew(id);
    }
  };

  const handleDecline = (appt) => {
    if (!onDecline) return;
    onDecline(appt, declineReason);
    setDeclineId(null);
    setDeclineReason('');
  };

  return (
    <div className="bg-card border border-card rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="font-heading text-lg text-primary">My Assignments</h2>
        {newAssignmentIds.length > 0 && (
          <button
            type="button"
            onClick={() => newAssignmentIds.forEach((id) => onDismissNew?.(id))}
            className="px-2 py-0.5 text-xs font-bold bg-gold text-charcoal rounded-full animate-pulse hover:bg-gold/90"
            title="Mark all as seen"
          >
            {newAssignmentIds.length} new
          </button>
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

                <div className="flex items-center gap-2 sm:flex-col sm:items-end shrink-0">
                  <span className="text-secondary text-xs hidden sm:block">
                    {appt.checked_in_at
                      ? new Date(appt.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : ''}
                  </span>
                  <div className="flex gap-2 w-full sm:w-auto">
                    {onDecline && declineId !== appt.id && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeclineId(appt.id);
                          setDeclineReason('');
                        }}
                        disabled={actionId === appt.id}
                        className="px-3 py-3 sm:py-2.5 min-h-[44px] rounded-lg text-sm border border-light text-secondary hover:border-red-400/50 hover:text-red-400 disabled:opacity-50"
                      >
                        Decline
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAccept(appt);
                      }}
                      disabled={actionId === appt.id}
                      className={clsx(
                        'flex-1 sm:flex-none px-5 py-3 sm:py-2.5 min-h-[44px] rounded-lg font-medium text-sm transition-colors min-w-[140px]',
                        actionId === appt.id
                          ? 'bg-gold/50 text-charcoal cursor-wait'
                          : 'bg-gold text-charcoal hover:bg-gold/90'
                      )}
                    >
                      {actionId === appt.id ? 'Starting…' : 'Accept & Start'}
                    </button>
                  </div>
                </div>
              </div>

              {declineId === appt.id && (
                <div className="px-4 pb-3 border-t border-light/50">
                  <p className="text-secondary text-xs mt-3 mb-2">Return this client to the waiting queue?</p>
                  <select
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    className="w-full text-sm px-3 py-2 bg-input border border-input rounded-lg text-primary mb-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="">Reason (optional)</option>
                    {DECLINE_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDeclineId(null); }}
                      className="flex-1 py-2 text-sm border border-light rounded-lg text-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDecline(appt); }}
                      disabled={actionId === appt.id}
                      className="flex-1 py-2 text-sm bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg disabled:opacity-50"
                    >
                      {actionId === appt.id ? 'Returning…' : 'Return to waiting'}
                    </button>
                  </div>
                </div>
              )}

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
