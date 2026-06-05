import clsx from 'clsx';

const STATUS_BADGE = {
  waiting: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  assigned_pending: 'bg-blue-100 text-blue-800 border-blue-300',
  serving: 'bg-green-100 text-green-800 border-green-300',
};

export default function TechnicianFloorSnapshot({ floorAppointments, technicianId }) {
  const waiting = floorAppointments.filter((a) => a.status === 'waiting');
  const serving = floorAppointments.filter((a) => a.status === 'serving');
  const assignedElsewhere = floorAppointments.filter(
    (a) => a.status === 'assigned_pending' && a.technician_id !== technicianId
  );

  return (
    <div className="bg-card border border-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-lg text-primary">Salon Floor</h2>
        <span className="text-secondary text-xs">Read-only</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-3 bg-secondary rounded-lg">
          <div className="text-2xl font-heading text-yellow-400">{waiting.length}</div>
          <div className="text-muted text-xs">Waiting</div>
        </div>
        <div className="text-center p-3 bg-secondary rounded-lg">
          <div className="text-2xl font-heading text-green-400">{serving.length}</div>
          <div className="text-muted text-xs">In Chair</div>
        </div>
        <div className="text-center p-3 bg-secondary rounded-lg">
          <div className="text-2xl font-heading text-blue-400">{assignedElsewhere.length}</div>
          <div className="text-muted text-xs">Assigned</div>
        </div>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {floorAppointments.length === 0 ? (
          <p className="text-muted text-sm text-center py-4">Floor is quiet right now</p>
        ) : (
          floorAppointments.slice(0, 8).map((appt) => (
            <div
              key={appt.id}
              className="flex items-center justify-between p-3 bg-secondary rounded-lg text-sm"
            >
              <div className="min-w-0">
                <div className="text-primary font-medium truncate">
                  {appt.customer?.full_name || 'Guest'}
                </div>
                <div className="text-secondary text-xs truncate">
                  {appt.services?.name || appt.add_ons || 'Service'}
                  {appt.technician?.full_name && ` · ${appt.technician.full_name}`}
                </div>
              </div>
              <span className={clsx('px-2 py-0.5 text-xs border rounded shrink-0 ml-2', STATUS_BADGE[appt.status] || 'bg-gray-100 text-gray-800')}>
                {appt.status === 'waiting' ? 'Waiting' :
                 appt.status === 'serving' ? 'Serving' : 'Assigned'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
