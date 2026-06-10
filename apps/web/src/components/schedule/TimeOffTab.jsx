import { useState } from 'react';
import { getInitials, sortTimeOffRequests } from '@nail-couture/shared/utils/scheduleUtils';

function StatusBadge({ status }) {
  const classes = {
    pending: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
    approved: 'bg-green-500/15 text-green-400 border border-green-500/20',
    rejected: 'bg-red-500/15 text-red-400 border border-red-500/20',
  };
  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-full self-start ${classes[status] || classes.pending}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatDateRange(startDate, endDate) {
  const start = new Date(startDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (startDate === endDate) return start;
  const end = new Date(endDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${start} – ${end}`;
}

function EmployeeTimeOffTab({
  requests,
  showRequestForm,
  onToggleForm,
  requestForm,
  onFormChange,
  onSubmit,
  submitting,
  formError,
  formSuccess,
}) {
  const sorted = sortTimeOffRequests(requests);

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-secondary">Submit requests for manager approval</p>
        <button
          type="button"
          onClick={onToggleForm}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-gold text-charcoal hover:bg-gold/90 transition-colors"
        >
          {showRequestForm ? 'Cancel' : 'Request Time Off'}
        </button>
      </div>

      {formSuccess && <p className="text-sm text-green-400">{formSuccess}</p>}

      {showRequestForm && (
        <form onSubmit={onSubmit} className="rounded-2xl border border-light bg-secondary p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-secondary">Start date</span>
              <input
                type="date"
                value={requestForm.startDate}
                onChange={(e) => onFormChange({ ...requestForm, startDate: e.target.value })}
                className="w-full mt-1.5 text-sm bg-input border border-light rounded-lg px-3 py-2.5 text-primary focus:border-gold focus:outline-none"
                required
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-secondary">End date</span>
              <input
                type="date"
                value={requestForm.endDate}
                onChange={(e) => onFormChange({ ...requestForm, endDate: e.target.value })}
                className="w-full mt-1.5 text-sm bg-input border border-light rounded-lg px-3 py-2.5 text-primary focus:border-gold focus:outline-none"
                required
              />
            </label>
          </div>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-secondary">Reason (optional)</span>
            <textarea
              value={requestForm.reason}
              onChange={(e) => onFormChange({ ...requestForm, reason: e.target.value })}
              rows={3}
              className="w-full mt-1.5 text-sm bg-input border border-light rounded-lg px-3 py-2.5 text-primary focus:border-gold focus:outline-none resize-none"
              placeholder="Vacation, appointment, personal day..."
            />
          </label>
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-medium bg-gold text-charcoal hover:bg-gold/90 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
        </form>
      )}

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-light bg-secondary p-12 text-center">
          <h2 className="font-heading text-xl text-primary mb-2">No Requests Yet</h2>
          <p className="text-secondary text-sm">You have not submitted any time-off requests.</p>
        </div>
      ) : (
        sorted.map((request) => (
          <div
            key={request.id}
            className={`rounded-2xl p-5 bg-secondary ${
              request.status === 'pending' ? 'border border-gold/30' : 'border border-light'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="text-primary font-medium">{formatDateRange(request.start_date, request.end_date)}</div>
                {request.reason && <p className="text-sm text-secondary mt-1">{request.reason}</p>}
                {request.reviewed_at && (
                  <p className="text-[10px] text-muted mt-2">
                    Reviewed {new Date(request.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                )}
                {request.status === 'rejected' && request.review_note && (
                  <p className="text-sm text-red-300/90 mt-2">
                    <span className="text-[10px] uppercase tracking-wider text-red-400/80">Note from manager</span>
                    <br />
                    {request.review_note}
                  </p>
                )}
              </div>
              <StatusBadge status={request.status} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ManagerTimeOffTab({ requests, onReview, onViewSchedule }) {
  const sorted = sortTimeOffRequests(requests);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNote, setRejectNote] = useState('');

  const startReject = (requestId) => {
    setRejectingId(requestId);
    setRejectNote('');
  };

  const cancelReject = () => {
    setRejectingId(null);
    setRejectNote('');
  };

  const confirmReject = (requestId) => {
    onReview(requestId, 'rejected', rejectNote.trim() || null);
    cancelReject();
  };

  return (
    <div className="space-y-3 max-w-3xl">
      {sorted.length === 0 ? (
        <div className="rounded-2xl p-12 text-center bg-secondary border border-light">
          <h2 className="font-heading text-xl text-primary mb-2">No Time-Off Requests</h2>
          <p className="text-secondary text-sm">All caught up.</p>
        </div>
      ) : (
        sorted.map((request) => (
          <div
            key={request.id}
            className={`rounded-2xl p-5 bg-secondary ${request.status === 'pending' ? 'border border-gold/30' : 'border border-light'}`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                  <span className="text-gold text-xs font-heading">{getInitials(request.staff_name)}</span>
                </div>
                <div>
                  <div className="text-primary font-medium">{request.staff_name}</div>
                  <div className="text-secondary text-xs">
                    {formatDateRange(request.start_date, request.end_date)}
                  </div>
                  {request.reason && <p className="text-sm text-secondary mt-1">{request.reason}</p>}
                  {request.status === 'rejected' && request.review_note && (
                    <p className="text-sm text-red-300/90 mt-2">Note: {request.review_note}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-2">
                <StatusBadge status={request.status} />
                {onViewSchedule && (
                  <button
                    type="button"
                    onClick={() => onViewSchedule(request.staff_id, request.start_date)}
                    className="text-xs text-gold hover:text-gold/80 transition-colors"
                  >
                    View schedule →
                  </button>
                )}
                {request.status === 'pending' && rejectingId !== request.id && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onReview(request.id, 'approved')}
                      className="px-4 py-2 bg-green-500/15 text-green-400 border border-green-500/20 rounded-xl text-sm hover:bg-green-500/25"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => startReject(request.id)}
                      className="px-4 py-2 bg-red-500/15 text-red-400 border border-red-500/20 rounded-xl text-sm hover:bg-red-500/25"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
            {request.status === 'pending' && rejectingId === request.id && (
              <div className="mt-4 pt-4 border-t border-light space-y-3">
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wider text-secondary">Rejection note (optional)</span>
                  <textarea
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    rows={3}
                    className="w-full mt-1.5 text-sm bg-input border border-light rounded-lg px-3 py-2.5 text-primary focus:border-gold focus:outline-none resize-none"
                    placeholder="e.g. Short-staffed that week, please pick another date..."
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => confirmReject(request.id)}
                    className="px-4 py-2 bg-red-500/15 text-red-400 border border-red-500/20 rounded-xl text-sm hover:bg-red-500/25"
                  >
                    Confirm reject
                  </button>
                  <button
                    type="button"
                    onClick={cancelReject}
                    className="px-4 py-2 border border-light rounded-xl text-sm text-secondary hover:text-primary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default function TimeOffTab({ variant = 'employee', ...props }) {
  if (variant === 'manager') {
    return (
      <ManagerTimeOffTab
        requests={props.requests}
        onReview={props.onReview}
        onViewSchedule={props.onViewSchedule}
      />
    );
  }
  return <EmployeeTimeOffTab {...props} />;
}

