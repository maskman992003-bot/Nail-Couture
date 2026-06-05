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

function formatAvgMinutes(mins) {
  if (mins == null) return '—';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function TechnicianStats({ stats, weekStats }) {
  const {
    completedToday,
    pendingCount,
    revenueToday,
    avgServiceMinutes,
    nextClient,
    nextClientService,
  } = stats;

  const nextName = nextClient?.customer?.full_name?.split(' ')[0] || '—';

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
          label="Avg Service Time"
          value={formatAvgMinutes(avgServiceMinutes)}
          sub={completedToday > 0 ? `from ${completedToday} service${completedToday !== 1 ? 's' : ''} today` : 'complete a service to track'}
          accent="text-blue-400"
        />
        <StatCard
          label="Next Up"
          value={nextName}
          sub={
            nextClient
              ? nextClientService
              : pendingCount > 0
                ? `${pendingCount} in queue`
                : 'no assignments waiting'
          }
          accent="text-yellow-400"
        />
      </div>

      <div className="bg-card border border-card rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="font-heading text-sm text-gold-strong">This Week</h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-secondary">
            <span>
              {weekStats.completed} / {weekStats.scheduled} completed
            </span>
            {weekStats.completionRate != null && (
              <span className="text-muted">{weekStats.completionRate}% rate</span>
            )}
            {weekStats.weekRevenue > 0 && (
              <span className="text-gold-strong font-medium">
                ${weekStats.weekRevenue.toFixed(0)} revenue
              </span>
            )}
          </div>
        </div>

        {weekStats.scheduled === 0 ? (
          <p className="text-muted text-sm text-center py-4">No appointments scheduled this week</p>
        ) : (
          <div className="flex items-end gap-1.5 h-16">
            {weekStats.byDay.map((count, i) => {
              const done = weekStats.byDayCompleted[i] || 0;
              const barH = Math.max(4, (count / weekStats.max) * 48);
              const doneH = count > 0 ? Math.max(2, (done / count) * barH) : 0;
              const isToday = i === new Date().getDay();

              return (
                <div key={DAY_LABELS[i]} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={clsx(
                      'w-full rounded-t relative bg-gold/15',
                      isToday && 'ring-1 ring-gold/40'
                    )}
                    style={{ height: `${barH}px` }}
                    title={`${done}/${count} completed`}
                  >
                    {done > 0 && (
                      <div
                        className="absolute bottom-0 w-full bg-gold/60 rounded-t"
                        style={{ height: `${doneH}px` }}
                      />
                    )}
                  </div>
                  <span className={clsx('text-[10px]', isToday ? 'text-gold-strong font-medium' : 'text-muted')}>
                    {DAY_LABELS[i]}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
