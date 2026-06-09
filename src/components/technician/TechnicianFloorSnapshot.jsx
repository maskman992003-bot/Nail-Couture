import { useState } from 'react';
import clsx from 'clsx';
import { featureFlags } from '../../constants/featureFlags';
import { computeWaitPositions, buildTechnicianFloorRows } from '../../utils/technicianQueue';
import TechnicianFloorGrid from './TechnicianFloorGrid';

const FLOOR_VIEW_STORAGE_KEY = 'technician_floor_view';

function readFloorView() {
  if (typeof window === 'undefined') return 'grid';
  return localStorage.getItem(FLOOR_VIEW_STORAGE_KEY) === 'list' ? 'list' : 'grid';
}

function persistFloorView(view) {
  try {
    localStorage.setItem(FLOOR_VIEW_STORAGE_KEY, view);
  } catch {
    /* ignore */
  }
}

const STATUS_BADGE = {
  waiting: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/30',
  assigned_pending: 'bg-blue-400/15 text-blue-400 border-blue-400/30',
  serving: 'bg-green-400/15 text-green-400 border-green-400/30',
  ready_for_checkout: 'bg-amber-400/15 text-amber-400 border-amber-400/30',
};

function FloorListView({
  floorTechnicians,
  floorAppointments,
  technicianId,
  newAssignmentIds,
}) {
  const waitPositions = computeWaitPositions(floorAppointments);
  const techRows = buildTechnicianFloorRows(floorTechnicians, floorAppointments, technicianId);

  const queueAppointments = floorAppointments.filter(
    (a) => a.status === 'waiting' || a.status === 'ready_for_checkout'
  );

  const sortedQueue = [...queueAppointments].sort(
    (a, b) => new Date(a.checked_in_at) - new Date(b.checked_in_at)
  );

  const isEmpty = techRows.length === 0 && sortedQueue.length === 0;

  if (isEmpty) {
    return (
      <p className="text-muted text-sm text-center py-4">Floor is quiet right now</p>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {techRows.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-muted text-[10px] uppercase tracking-wide px-1">Technicians</p>
          {techRows.map(({ tech, isMe, statusLabel, statusClass, client }) => (
            <div
              key={tech.id}
              className={clsx(
                'flex items-center justify-between p-3 rounded-lg text-sm',
                isMe ? 'bg-gold/10 border border-gold/30' : 'bg-secondary'
              )}
            >
              <div className="min-w-0">
                <div className={clsx('font-medium truncate', isMe ? 'text-gold-strong' : 'text-primary')}>
                  {tech.full_name}
                  {isMe && <span className="text-xs text-gold ml-1">(you)</span>}
                </div>
                {client ? (
                  <div className="text-secondary text-xs truncate">
                    {client.customer?.full_name || 'Customer'}
                    {' · '}
                    {client.add_ons || client.services?.name || 'Service'}
                  </div>
                ) : (
                  <div className="text-muted text-xs">No client assigned</div>
                )}
              </div>
              <span className={clsx('px-2 py-0.5 text-xs border rounded shrink-0 ml-2', statusClass)}>
                {statusLabel}
              </span>
            </div>
          ))}
        </div>
      )}

      {sortedQueue.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-muted text-[10px] uppercase tracking-wide px-1">Queue</p>
          {sortedQueue.slice(0, 10).map((appt) => {
            const isMine = appt.status === 'assigned_pending' && appt.technician_id === technicianId;
            const isNew = newAssignmentIds.includes(appt.id);
            const waitPos = waitPositions.get(appt.id);

            return (
              <div
                key={appt.id}
                className={clsx(
                  'flex items-center justify-between p-3 rounded-lg text-sm',
                  isMine ? 'bg-gold/15 border border-gold/40' : 'bg-secondary'
                )}
              >
                <div className="min-w-0">
                  <div className="text-primary font-medium truncate flex items-center gap-2">
                    {appt.customer?.full_name || 'Guest'}
                    {isNew && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gold text-charcoal rounded uppercase">
                        New
                      </span>
                    )}
                  </div>
                  <div className="text-secondary text-xs truncate">
                    {appt.services?.name || appt.add_ons || 'Service'}
                    {appt.technician?.full_name && ` · ${appt.technician.full_name}`}
                    {waitPos != null && ` · #${waitPos} in queue`}
                  </div>
                </div>
                <span className={clsx(
                  'px-2 py-0.5 text-xs border rounded shrink-0 ml-2',
                  isMine ? 'bg-gold/30 text-gold-strong border-gold/50' : (STATUS_BADGE[appt.status] || 'bg-secondary text-secondary border-light')
                )}>
                  {appt.status === 'waiting' ? (waitPos ? `#${waitPos}` : 'Waiting') :
                   appt.status === 'ready_for_checkout' ? 'Checkout' :
                   isMine ? 'Yours' : 'Assigned'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TechnicianFloorSnapshot({
  floorAppointments,
  floorTechnicians = [],
  technicianId,
  newAssignmentIds = [],
  onBreak = false,
}) {
  const [view, setView] = useState(readFloorView);
  const showGrid = featureFlags.staff.technicianLiveFloor && floorTechnicians.length > 0;

  const selectView = (next) => {
    setView(next);
    persistFloorView(next);
  };

  const waiting = floorAppointments.filter((a) => a.status === 'waiting');
  const serving = floorAppointments.filter((a) => a.status === 'serving');
  const checkoutReady = floorAppointments.filter((a) => a.status === 'ready_for_checkout');
  const myAssigned = floorAppointments.filter(
    (a) => a.status === 'assigned_pending' && a.technician_id === technicianId
  );
  const assignedElsewhere = floorAppointments.filter(
    (a) => a.status === 'assigned_pending' && a.technician_id !== technicianId
  );

  return (
    <div className="bg-card border border-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-lg text-primary">Lobby</h2>
          {myAssigned.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-gold text-charcoal rounded-full animate-pulse">
              {myAssigned.length} for you
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showGrid && (
            <div className="flex rounded-lg border border-light overflow-hidden">
              <button
                type="button"
                onClick={() => selectView('grid')}
                className={clsx(
                  'px-2.5 py-1 text-xs',
                  view === 'grid' ? 'bg-gold/20 text-gold-strong' : 'text-secondary hover:text-primary'
                )}
              >
                Grid
              </button>
              <button
                type="button"
                onClick={() => selectView('list')}
                className={clsx(
                  'px-2.5 py-1 text-xs',
                  view === 'list' ? 'bg-gold/20 text-gold-strong' : 'text-secondary hover:text-primary'
                )}
              >
                List
              </button>
            </div>
          )}
          {onBreak && (
            <span className="px-2 py-0.5 text-xs bg-yellow-400/15 text-yellow-400 border border-yellow-400/30 rounded-full">
              On break
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="text-center p-3 bg-secondary rounded-lg">
          <div className="text-2xl font-heading text-yellow-400">{waiting.length}</div>
          <div className="text-muted text-xs">Waiting</div>
        </div>
        <div className="text-center p-3 bg-secondary rounded-lg">
          <div className="text-2xl font-heading text-green-400">{serving.length}</div>
          <div className="text-muted text-xs">In Chair</div>
        </div>
        <div className="text-center p-3 bg-secondary rounded-lg">
          <div className="text-2xl font-heading text-amber-400">{checkoutReady.length}</div>
          <div className="text-muted text-xs">Checkout</div>
        </div>
        <div className="text-center p-3 bg-secondary rounded-lg">
          <div className="text-2xl font-heading text-blue-400">{assignedElsewhere.length + myAssigned.length}</div>
          <div className="text-muted text-xs">Assigned</div>
        </div>
      </div>

      {showGrid && view === 'grid' ? (
        <TechnicianFloorGrid
          technicians={floorTechnicians}
          floorAppointments={floorAppointments}
          currentTechnicianId={technicianId}
        />
      ) : (
        <FloorListView
          floorTechnicians={floorTechnicians}
          floorAppointments={floorAppointments}
          technicianId={technicianId}
          newAssignmentIds={newAssignmentIds}
        />
      )}
    </div>
  );
}
