import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { useTheme } from '../../contexts/ThemeContext';
import TechnicianQuickLinks from './TechnicianQuickLinks';
import TechnicianFloorSnapshot from './TechnicianFloorSnapshot';
import TechnicianQueue from './TechnicianQueue';
import TechnicianInChairPanel from './TechnicianInChairPanel';
import TechnicianNotificationBanner from './TechnicianNotificationBanner';
import TechnicianNewAssignmentBanner from './TechnicianNewAssignmentBanner';
import AppModal, { modalBtnPrimary, modalBtnSecondary } from '../AppModal';
import {
  WORKSTATION_AVAILABLE,
  WORKSTATION_ON_BREAK,
  fetchWorkstationStatus,
  setWorkstationStatus,
} from '@nail-couture/shared/utils/technicianWorkstation';

export default function TechnicianDashboard({
  user,
  floorAppointments,
  stats,
  weekStats,
  tipsToday,
  paymentsByAppointment,
  refreshing,
  actionId,
  toast,
  newAssignmentIds,
  newAssignmentBanner,
  refetch,
  acceptAssignment,
  markComplete,
  declineAssignment,
  updateServingServices,
  updateChecklistItem,
  floorTechnicians,
  dismissToast,
  dismissNewAssignment,
  clearNewAssignments,
  scrollToAssignments,
  priceConfirmAppt,
  confirmCompleteWithoutPrice,
  cancelPriceConfirm,
}) {
  const { theme } = useTheme();
  const firstName = user?.full_name?.split(' ')[0] || 'Technician';
  const hasWork = stats.currentAppointment || stats.pendingCount > 0;
  const [workstationStatus, setWorkstationStatusState] = useState(WORKSTATION_AVAILABLE);
  const [statusSaving, setStatusSaving] = useState(false);
  const [profilePreferences, setProfilePreferences] = useState({});

  useEffect(() => {
    if (!user?.id) return;
    fetchWorkstationStatus(user.id).then(({ status, preferences }) => {
      setWorkstationStatusState(status);
      setProfilePreferences(preferences);
    });
  }, [user?.id]);

  const toggleBreak = useCallback(async () => {
    if (!user?.id || statusSaving) return;
    const next = workstationStatus === WORKSTATION_ON_BREAK
      ? WORKSTATION_AVAILABLE
      : WORKSTATION_ON_BREAK;
    setStatusSaving(true);
    const result = await setWorkstationStatus(user.id, next, profilePreferences);
    setStatusSaving(false);
    if (result.success) {
      setWorkstationStatusState(next);
      if (result.preferences) setProfilePreferences(result.preferences);
    }
  }, [user?.id, statusSaving, workstationStatus, profilePreferences]);

  const onBreak = workstationStatus === WORKSTATION_ON_BREAK;

  return (
    <>
      <style>{`.technician-dashboard select, .technician-dashboard option { background: var(--input-bg); color: var(--text-primary); } .technician-dashboard select { color-scheme: ${theme}; }`}</style>

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

      <div className="technician-dashboard p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-light">
          <div>
            <h1 className="font-heading text-3xl text-gold-strong">Hello, {firstName}</h1>
            <p className="text-secondary text-sm mt-1">Your workstation</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleBreak}
              disabled={statusSaving}
              className={clsx(
                'px-3 py-1.5 text-sm border rounded-lg min-h-[44px] transition-colors disabled:opacity-50',
                onBreak
                  ? 'bg-yellow-400/15 text-yellow-400 border-yellow-400/30'
                  : 'bg-secondary border-light text-secondary hover:border-theme'
              )}
            >
              {statusSaving ? 'Updating…' : onBreak ? 'On Break' : 'Available'}
            </button>
            <span className="text-secondary text-sm hidden sm:block">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={refreshing}
              className="px-3 py-1.5 text-sm bg-secondary border border-light rounded-lg text-secondary hover:border-theme disabled:opacity-50 min-h-[44px]"
            >
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </header>

        <div className="space-y-6">
          <TechnicianNotificationBanner />

          {onBreak && (
            <div className="p-4 bg-yellow-400/10 border border-yellow-400/30 rounded-xl text-sm text-yellow-400">
              You&apos;re on break — lobby won&apos;t assign new clients until you&apos;re available again.
            </div>
          )}

          <TechnicianNewAssignmentBanner
            assignments={newAssignmentBanner}
            onView={scrollToAssignments}
            onDismissAll={clearNewAssignments}
          />

          {stats.currentAppointment && (
            <TechnicianInChairPanel
              appointment={stats.currentAppointment}
              actionId={actionId}
              onComplete={markComplete}
              onUpdateServices={updateServingServices}
              onToggleChecklistItem={updateChecklistItem}
              userRole={user?.role}
            />
          )}

          <div id="my-assignments">
            <TechnicianQueue
              pendingAssignments={stats.pendingAssignments}
              actionId={actionId}
              onAccept={acceptAssignment}
              onDecline={declineAssignment}
              onDismissNew={dismissNewAssignment}
              userRole={user?.role}
              newAssignmentIds={newAssignmentIds}
            />
          </div>

          <TechnicianFloorSnapshot
            floorAppointments={floorAppointments}
            floorTechnicians={floorTechnicians}
            technicianId={user?.id}
            newAssignmentIds={newAssignmentIds}
            onBreak={onBreak}
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

          <TechnicianQuickLinks role={user?.role} />
        </div>
      </div>

      <AppModal
        open={!!priceConfirmAppt}
        onClose={cancelPriceConfirm}
        title="Send without price?"
        maxWidth="max-w-md"
        footer={
          <>
            <button type="button" onClick={cancelPriceConfirm} className={modalBtnSecondary}>
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmCompleteWithoutPrice}
              disabled={actionId === priceConfirmAppt?.id}
              className={modalBtnPrimary}
            >
              {actionId === priceConfirmAppt?.id ? 'Sending…' : 'Send anyway'}
            </button>
          </>
        }
      >
        <p className="text-secondary text-sm">
          No final price is set for{' '}
          <span className="text-primary font-medium">
            {priceConfirmAppt?.customer?.full_name || 'this client'}
          </span>
          . Cashier can adjust at checkout.
        </p>
      </AppModal>
    </>
  );
}
