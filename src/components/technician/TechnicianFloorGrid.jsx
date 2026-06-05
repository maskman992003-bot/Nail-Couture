import clsx from 'clsx';
import { getWorkstationStatus, WORKSTATION_ON_BREAK } from '../../utils/technicianWorkstation';

export default function TechnicianFloorGrid({
  technicians = [],
  floorAppointments = [],
  currentTechnicianId,
}) {
  const serving = floorAppointments.filter((a) => a.status === 'serving');
  const pending = floorAppointments.filter((a) => a.status === 'assigned_pending');
  const waiting = floorAppointments.filter((a) => a.status === 'waiting');

  if (technicians.length === 0) {
    return (
      <p className="text-muted text-sm text-center py-4">No technicians on the floor</p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {technicians.map((tech) => {
        const isMe = tech.id === currentTechnicianId;
        const activeCustomer = serving.find((a) => a.technician_id === tech.id);
        const pendingCustomer = pending.find((a) => a.technician_id === tech.id);
        const onBreak = getWorkstationStatus(tech.preferences) === WORKSTATION_ON_BREAK;
        const isBusy = !!activeCustomer;
        const isPending = !!pendingCustomer;

        const statusLabel = isBusy
          ? 'Busy'
          : onBreak
            ? 'On Break'
            : isPending
              ? 'Pending'
              : 'Available';

        const statusClass = isBusy
          ? 'bg-red-400/15 text-red-400 border-red-400/30'
          : onBreak
            ? 'bg-yellow-400/15 text-yellow-400 border-yellow-400/30'
            : isPending
              ? 'bg-blue-400/15 text-blue-400 border-blue-400/30'
              : 'bg-green-400/15 text-green-400 border-green-400/30';

        const client = activeCustomer || pendingCustomer;

        return (
          <div
            key={tech.id}
            className={clsx(
              'rounded-xl p-4 border-2 transition-colors',
              isMe ? 'border-gold/50 bg-gold/5' : 'border-light bg-secondary',
              onBreak && !isBusy && 'border-yellow-400/30'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className={clsx('font-heading text-sm text-primary truncate', isMe && 'text-gold-strong')}>
                {tech.full_name}
                {isMe && <span className="text-xs text-gold ml-1">(you)</span>}
              </h4>
              <span className={clsx('text-[10px] px-2 py-0.5 rounded border shrink-0', statusClass)}>
                {statusLabel}
              </span>
            </div>
            {client ? (
              <div className="text-xs">
                <p className="text-primary font-medium truncate">{client.customer?.full_name || 'Customer'}</p>
                <p className="text-secondary truncate mt-0.5">
                  {client.add_ons || client.services?.name || 'Service'}
                </p>
              </div>
            ) : (
              <p className="text-muted text-xs">
                {onBreak ? 'Taking a break' : 'Ready for next client'}
              </p>
            )}
          </div>
        );
      })}

      {waiting.length > 0 && (
        <div className="rounded-xl p-4 border-2 border-dashed border-yellow-400/30 bg-yellow-400/5 sm:col-span-2 lg:col-span-3">
          <p className="text-yellow-400 text-xs font-medium uppercase tracking-wide mb-2">
            Waiting queue ({waiting.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {waiting.slice(0, 6).map((a, i) => (
              <span
                key={a.id}
                className="px-2 py-1 text-xs bg-secondary border border-light rounded-lg text-primary"
              >
                #{i + 1} {a.customer?.full_name || 'Guest'}
              </span>
            ))}
            {waiting.length > 6 && (
              <span className="text-muted text-xs self-center">+{waiting.length - 6} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
