import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useThemeStyles } from '../../../theme/useThemeStyles';
import { TechnicianDaySummaryModal } from './TechnicianDaySummaryModal';
import type { QueueStats, WeekStats } from './types';

type PaymentRecord = {
  extras_amount?: number;
};

type TechnicianStatsProps = {
  stats: QueueStats;
  weekStats: WeekStats;
  tipsToday?: number;
  paymentsByAppointment?: Map<string, PaymentRecord>;
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatAvgMinutes(mins: number | null) {
  if (mins == null) return '—';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function StatCard({
  label,
  value,
  sub,
  accentColor,
  onPress,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accentColor?: string;
  onPress?: () => void;
}) {
  const styles = useThemeStyles();
  const content = (
    <>
      <Text style={[styles.textSecondary, { fontSize: 13, marginBottom: 4 }]}>{label}</Text>
      <Text
        style={{
          fontSize: 32,
          fontWeight: '600',
          color: accentColor || styles.tokens.textPrimary,
        }}
      >
        {value}
      </Text>
      {sub ? (
        <Text style={[styles.textSecondary, { fontSize: 11, marginTop: 4 }]}>{sub}</Text>
      ) : null}
      {onPress ? (
        <Text style={[styles.textSecondary, { fontSize: 10, marginTop: 8, letterSpacing: 1 }]}>
          TAP FOR SUMMARY
        </Text>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={[styles.card, { padding: 16, flex: 1, minWidth: '45%' }]}>
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.card, { padding: 16, flex: 1, minWidth: '45%' }]}>{content}</View>;
}

export function TechnicianStats({
  stats,
  weekStats,
  tipsToday = 0,
  paymentsByAppointment,
}: TechnicianStatsProps) {
  const styles = useThemeStyles();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const {
    completedToday,
    pendingCount,
    avgServiceMinutes,
    nextClient,
    nextClientService,
    todayWorkAppointments = [],
  } = stats;

  const nextName = nextClient?.customer?.full_name?.split(' ')[0] || '—';
  const pendingCheckout = todayWorkAppointments.filter((a) => a.status === 'ready_for_checkout').length;

  return (
    <>
      <View style={{ gap: 16, marginTop: 16 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <StatCard
            label="Done Today"
            value={completedToday}
            accentColor="#4ade80"
            onPress={
              completedToday > 0 || todayWorkAppointments.length > 0
                ? () => setSummaryOpen(true)
                : undefined
            }
          />
          <StatCard
            label="Tips Today"
            value={`$${tipsToday.toFixed(0)}`}
            accentColor={styles.tokens.goldStrong}
            sub={
              pendingCheckout > 0
                ? `${pendingCheckout} at checkout — tips update when paid`
                : tipsToday <= 0
                  ? 'Updates when cashier completes checkout'
                  : undefined
            }
          />
          <StatCard
            label="Avg Service Time"
            value={formatAvgMinutes(avgServiceMinutes)}
            accentColor="#60a5fa"
            sub={
              completedToday > 0
                ? `from ${completedToday} service${completedToday !== 1 ? 's' : ''} today`
                : 'complete a service to track'
            }
          />
          <StatCard
            label="Next Up"
            value={nextName}
            accentColor="#fbbf24"
            sub={
              nextClient
                ? nextClientService || undefined
                : pendingCount > 0
                  ? `${pendingCount} in queue`
                  : 'no assignments waiting'
            }
          />
        </View>

        <View style={[styles.card, { padding: 16 }]}>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <Text style={[styles.textGold, { fontSize: 14, fontWeight: '600' }]}>This Week</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Text style={[styles.textSecondary, { fontSize: 11 }]}>
                {weekStats.completed} / {weekStats.scheduled} completed
              </Text>
              {weekStats.completionRate != null ? (
                <Text style={[styles.textSecondary, { fontSize: 11 }]}>{weekStats.completionRate}% rate</Text>
              ) : null}
              {weekStats.weekRevenue > 0 ? (
                <Text style={[styles.textGold, { fontSize: 11, fontWeight: '600' }]}>
                  ${weekStats.weekRevenue.toFixed(0)} revenue
                </Text>
              ) : null}
            </View>
          </View>

          {weekStats.scheduled === 0 ? (
            <Text style={[styles.textSecondary, { textAlign: 'center', paddingVertical: 16 }]}>
              No appointments scheduled this week
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 64 }}>
              {weekStats.byDay.map((count, i) => {
                const done = weekStats.byDayCompleted[i] || 0;
                const barH = Math.max(4, (count / weekStats.max) * 48);
                const doneH = count > 0 ? Math.max(2, (done / count) * barH) : 0;
                const isToday = i === new Date().getDay();

                return (
                  <View key={DAY_LABELS[i]} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <View
                      style={{
                        width: '100%',
                        height: barH,
                        borderRadius: 4,
                        backgroundColor: `${styles.tokens.goldStrong}22`,
                        borderWidth: isToday ? 1 : 0,
                        borderColor: `${styles.tokens.goldStrong}66`,
                        overflow: 'hidden',
                        justifyContent: 'flex-end',
                      }}
                    >
                      {done > 0 ? (
                        <View
                          style={{
                            width: '100%',
                            height: doneH,
                            backgroundColor: `${styles.tokens.goldStrong}99`,
                            borderTopLeftRadius: 4,
                            borderTopRightRadius: 4,
                          }}
                        />
                      ) : null}
                    </View>
                    <Text
                      style={{
                        fontSize: 10,
                        color: isToday ? styles.tokens.goldStrong : styles.tokens.textSecondary,
                        fontWeight: isToday ? '600' : '400',
                      }}
                    >
                      {DAY_LABELS[i]}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>

      <TechnicianDaySummaryModal
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        workAppointments={todayWorkAppointments}
        paymentsByAppointment={paymentsByAppointment}
      />
    </>
  );
}
