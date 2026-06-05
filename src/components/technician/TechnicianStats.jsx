import clsx from 'clsx';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-card border border-card rounded-xl p-5">
      <div className="text-secondary text-sm mb-1">{label}</div>
      <div className={clsx('font-heading text-3xl sm:text-4xl', accent || 'text-primary')}>{value}</div>
      {sub && <div className="text-muted text-xs mt-1">{sub}</div>}
    </div>
  );
}

export default function TechnicianStats({ stats, weekStats }) {
  const {
    completedToday,
    pendingCount,
    revenueToday,
    avgServiceMinutes,
    nextClient,
  } = stats;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Done Today" value={completedToday} accent="text-green-400" />
        <StatCard
          label="Revenue Today"
          value={`$${revenueToday.toFixed(0)}`}
          accent="text-gold-strong"
        />
        <StatCard
          label="My Queue"
          value={pendingCount}
          sub={pendingCount === 1 ? 'assignment waiting' : 'assignments waiting'}
        />
        <StatCard
          label="Next Client"
          value={nextClient?.customer?.full_name?.split(' ')[0] || '—'}
          sub={avgServiceMinutes != null ? `Avg ${avgServiceMinutes} min/service` : undefined}
          accent="text-yellow-400"
        />
      </div>

      {weekStats.scheduled > 0 && (
        <div className="bg-card border border-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading text-sm text-gold-strong">This Week</h3>
            <span className="text-secondary text-xs">
              {weekStats.completed} / {weekStats.scheduled} completed
            </span>
          </div>
          <div className="flex items-end gap-1.5 h-16">
            {weekStats.byDay.map((count, i) => (
              <div key={DAY_LABELS[i]} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-gold/30 rounded-t"
                  style={{ height: `${Math.max(4, (count / weekStats.max) * 48)}px` }}
                  title={`${count} appt${count !== 1 ? 's' : ''}`}
                />
                <span className="text-muted text-[10px]">{DAY_LABELS[i]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
