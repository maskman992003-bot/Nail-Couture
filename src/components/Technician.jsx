import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { getHomePath } from '../utils/routes';
import { useTechnicianQueue } from '../hooks/useTechnicianQueue';
import Sidebar from './Sidebar';
import TechnicianQuickLinks from './technician/TechnicianQuickLinks';
import TechnicianStats from './technician/TechnicianStats';
import TechnicianFloorSnapshot from './technician/TechnicianFloorSnapshot';
import TechnicianQueue from './technician/TechnicianQueue';
import TechnicianInChairPanel from './technician/TechnicianInChairPanel';
import TechnicianPostCompletePrompt from './technician/TechnicianPostCompletePrompt';

export default function Technician() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.role;

  const {
    floorAppointments,
    stats,
    weekStats,
    loading,
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
  } = useTechnicianQueue(user?.id, user?.phone);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (userRole && userRole !== 'technician') {
      navigate(getHomePath(userRole));
    }
  }, [user, userRole, navigate]);

  const firstName = user?.full_name?.split(' ')[0] || 'Technician';
  const hasWork = stats.currentAppointment || stats.pendingCount > 0;

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-primary text-primary pl-0 md:pl-20 lg:pl-64">
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-primary text-primary transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
      <Sidebar />

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
          <button type="button" onClick={dismissToast} className="float-right ml-3 opacity-70 hover:opacity-100">×</button>
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
          <TechnicianQuickLinks role={userRole} />

          <TechnicianStats stats={stats} weekStats={weekStats} />

          {stats.currentAppointment && (
            <TechnicianInChairPanel
              appointment={stats.currentAppointment}
              actionId={actionId}
              onComplete={markComplete}
              userRole={userRole}
            />
          )}

          {postComplete && (
            <TechnicianPostCompletePrompt
              data={postComplete}
              onDismiss={dismissPostComplete}
              userRole={userRole}
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
                className="w-full py-4 bg-gold text-charcoal font-heading text-lg rounded-xl shadow-lg disabled:opacity-70"
              >
                {actionId === stats.currentAppointment.id ? 'Completing…' : 'Complete Service'}
              </button>
            </div>
          )}

          <TechnicianQueue
            pendingAssignments={stats.pendingAssignments}
            actionId={actionId}
            onAccept={acceptAssignment}
            userRole={userRole}
            newAssignmentIds={newAssignmentIds}
          />
        </div>
      </div>
    </div>
  );
}
