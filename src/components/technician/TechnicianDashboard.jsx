import clsx from 'clsx';
import TechnicianQuickLinks from './TechnicianQuickLinks';
import TechnicianStats from './TechnicianStats';
import TechnicianFloorSnapshot from './TechnicianFloorSnapshot';
import TechnicianQueue from './TechnicianQueue';
import TechnicianInChairPanel from './TechnicianInChairPanel';
import TechnicianPostCompletePrompt from './TechnicianPostCompletePrompt';

export default function TechnicianDashboard({
  user,
  floorAppointments,
  stats,
  weekStats,
  refreshing,
  actionId,
  toast,
  newAssignmentIds,
  postComplete,
  refetch,
  acceptAssignment,
  markComplete,
  dismissToast,
  dismissPostComplete,
}) {
  const firstName = user?.full_name?.split(' ')[0] || 'Technician';
  const hasWork = stats.currentAppointment || stats.pendingCount > 0;

  return (
    <>
      {toast && (
        <div
          className={clsx(
            'fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-sm',
            toast.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-gold text-charcoal'
          )}
          role="status"
        >
          <button
            type="button"
            onClick={dismissToast}
            className="float-right ml-3 opacity-70 hover:opacity-100"
          >
            ×
          </button>
          {toast.message}
        </div>
      )}

      <div className="p-4 md:p-6 lg:p-8 pb-28 lg:pb-8">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-light">
          <div>
            <h1 className="font-heading text-3xl text-gold-strong">Hello, {firstName}</h1>
            <p className="text-secondary text-sm mt-1">Your workstation</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-secondary text-sm hidden sm:block">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={refreshing}
              className="px-3 py-1.5 text-sm bg-secondary border border-light rounded-lg text-secondary hover:border-theme disabled:opacity-50"
            >
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </header>

        <div className="space-y-6">
          <TechnicianQuickLinks role={user?.role} />

          <TechnicianStats stats={stats} weekStats={weekStats} />

          {stats.currentAppointment && (
            <TechnicianInChairPanel
              appointment={stats.currentAppointment}
              actionId={actionId}
              onComplete={markComplete}
              userRole={user?.role}
            />
          )}

          {postComplete && (
            <TechnicianPostCompletePrompt
              data={postComplete}
              onDismiss={dismissPostComplete}
              userRole={user?.role}
            />
          )}

          <TechnicianFloorSnapshot
            floorAppointments={floorAppointments}
            technicianId={user?.id}
            newAssignmentIds={newAssignmentIds}
          />

          {!stats.currentAppointment && !hasWork && (
            <div className="bg-card border border-card rounded-xl p-8 flex flex-col items-center justify-center text-center">
              <div className="text-5xl mb-3">✨</div>
              <h3 className="font-heading text-xl text-primary">All clear!</h3>
              <p className="text-secondary text-sm mt-1">
                No assignments right now. Check the floor snapshot for salon activity.
              </p>
            </div>
          )}

          {!stats.currentAppointment && stats.pendingCount > 0 && (
            <div className="bg-card border border-dashed border-theme rounded-xl p-6 text-center">
              <p className="text-secondary text-sm">
                You have {stats.pendingCount} assignment{stats.pendingCount !== 1 ? 's' : ''} waiting — accept one below to start.
              </p>
            </div>
          )}

          {stats.currentAppointment && (
            <div className="lg:hidden fixed bottom-20 left-4 right-4 z-40">
              <button
                type="button"
                onClick={() => markComplete(stats.currentAppointment)}
                disabled={actionId === stats.currentAppointment.id}
                className="w-full py-4 min-h-[52px] bg-gold text-charcoal font-heading text-lg rounded-xl shadow-lg disabled:opacity-70"
              >
                {actionId === stats.currentAppointment.id ? 'Completing…' : 'Complete Service'}
              </button>
            </div>
          )}

          <TechnicianQueue
            pendingAssignments={stats.pendingAssignments}
            actionId={actionId}
            onAccept={acceptAssignment}
            userRole={user?.role}
            newAssignmentIds={newAssignmentIds}
          />
        </div>
      </div>
    </>
  );
}
