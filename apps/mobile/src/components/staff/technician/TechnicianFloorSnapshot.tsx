import { ScrollView, Text, View } from 'react-native';
import { useThemeStyles } from '../../../theme/useThemeStyles';
import {
  computeWaitPositions,
  buildTechnicianFloorRows,
} from '@nail-couture/shared/utils/technicianQueue.js';
import type { FloorTechnician, TechnicianAppointment } from './types';

type TechnicianFloorSnapshotProps = {
  floorAppointments: TechnicianAppointment[];
  floorTechnicians?: FloorTechnician[];
  technicianId?: string;
  newAssignmentIds?: string[];
  onBreak?: boolean;
};

const STATUS_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  waiting: { bg: '#fbbf2422', text: '#fbbf24', border: '#fbbf2444' },
  assigned_pending: { bg: '#60a5fa22', text: '#60a5fa', border: '#60a5fa44' },
  serving: { bg: '#4ade8022', text: '#4ade80', border: '#4ade8044' },
  ready_for_checkout: { bg: '#f59e0b22', text: '#f59e0b', border: '#f59e0b44' },
};

function FloorListView({
  floorTechnicians,
  floorAppointments,
  technicianId,
  newAssignmentIds,
}: {
  floorTechnicians: FloorTechnician[];
  floorAppointments: TechnicianAppointment[];
  technicianId?: string;
  newAssignmentIds: string[];
}) {
  const styles = useThemeStyles();
  const waitPositions = computeWaitPositions(floorAppointments);
  const techRows = buildTechnicianFloorRows(
    floorTechnicians,
    floorAppointments,
    technicianId,
  ) as Array<{
    tech: FloorTechnician;
    isMe: boolean;
    statusLabel: string;
    client: TechnicianAppointment | undefined;
  }>;

  const queueAppointments = floorAppointments.filter(
    (a) => a.status === 'waiting' || a.status === 'ready_for_checkout',
  );

  const sortedQueue = [...queueAppointments].sort(
    (a, b) => new Date(a.checked_in_at || 0).getTime() - new Date(b.checked_in_at || 0).getTime(),
  );

  const isEmpty = techRows.length === 0 && sortedQueue.length === 0;

  if (isEmpty) {
    return (
      <Text style={[styles.textSecondary, { textAlign: 'center', paddingVertical: 16, fontSize: 13 }]}>
        Floor is quiet right now
      </Text>
    );
  }

  return (
    <ScrollView style={{ maxHeight: 260 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
      <View style={{ gap: 8 }}>
        {techRows.length > 0 ? (
          <View style={{ gap: 6 }}>
            <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, paddingHorizontal: 4 }]}>
              TECHNICIANS
            </Text>
            {techRows.map(({ tech, isMe, statusLabel, client }) => {
              const techBadge =
                statusLabel === 'Busy'
                  ? { bg: '#f8717122', text: '#f87171', border: '#f8717144' }
                  : statusLabel === 'On Break'
                    ? { bg: '#fbbf2422', text: '#fbbf24', border: '#fbbf2444' }
                    : statusLabel === 'Pending'
                      ? { bg: '#60a5fa22', text: '#60a5fa', border: '#60a5fa44' }
                      : { bg: '#4ade8022', text: '#4ade80', border: '#4ade8044' };

              return (
                <View
                  key={tech.id}
                  style={[
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 12,
                      borderRadius: 12,
                    },
                    isMe
                      ? { backgroundColor: `${styles.tokens.goldStrong}18`, borderWidth: 1, borderColor: `${styles.tokens.goldStrong}44` }
                      : { backgroundColor: styles.tokens.inputBg },
                  ]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={{
                        fontWeight: '600',
                        color: isMe ? styles.tokens.goldStrong : styles.tokens.textPrimary,
                      }}
                      numberOfLines={1}
                    >
                      {tech.full_name}
                      {isMe ? ' (you)' : ''}
                    </Text>
                    {client ? (
                      <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 2 }]} numberOfLines={1}>
                        {client.customer?.full_name || 'Customer'}
                        {' · '}
                        {client.add_ons || client.services?.name || 'Service'}
                      </Text>
                    ) : (
                      <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 2 }]}>
                        No client assigned
                      </Text>
                    )}
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                      borderWidth: 1,
                      marginLeft: 8,
                      backgroundColor: techBadge.bg,
                      borderColor: techBadge.border,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: techBadge.text }}>{statusLabel}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {sortedQueue.length > 0 ? (
          <View style={{ gap: 6, paddingTop: 4 }}>
            <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, paddingHorizontal: 4 }]}>
              QUEUE
            </Text>
            {sortedQueue.slice(0, 10).map((appt) => {
              const isMine =
                appt.status === 'assigned_pending' && appt.technician_id === technicianId;
              const isNew = newAssignmentIds.includes(appt.id);
              const waitPos = waitPositions.get(appt.id);
              const badgeStyle =
                isMine
                  ? { bg: `${styles.tokens.goldStrong}33`, text: styles.tokens.goldStrong, border: `${styles.tokens.goldStrong}66` }
                  : STATUS_BADGE[appt.status] || {
                      bg: styles.tokens.inputBg,
                      text: styles.tokens.textSecondary,
                      border: styles.tokens.borderLight,
                    };

              const statusLabel =
                appt.status === 'waiting'
                  ? waitPos
                    ? `#${waitPos}`
                    : 'Waiting'
                  : appt.status === 'ready_for_checkout'
                    ? 'Checkout'
                    : isMine
                      ? 'Yours'
                      : 'Assigned';

              return (
                <View
                  key={appt.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: isMine
                      ? `${styles.tokens.goldStrong}18`
                      : styles.tokens.inputBg,
                    borderWidth: isMine ? 1 : 0,
                    borderColor: `${styles.tokens.goldStrong}44`,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.textPrimary, { fontWeight: '600' }]} numberOfLines={1}>
                        {appt.customer?.full_name || 'Guest'}
                      </Text>
                      {isNew ? (
                        <View
                          style={{
                            backgroundColor: styles.tokens.goldStrong,
                            borderRadius: 4,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                          }}
                        >
                          <Text style={{ color: '#121212', fontSize: 9, fontWeight: '700' }}>NEW</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 2 }]} numberOfLines={1}>
                      {appt.services?.name || appt.add_ons || 'Service'}
                      {appt.technician?.full_name ? ` · ${appt.technician.full_name}` : ''}
                      {waitPos != null ? ` · #${waitPos} in queue` : ''}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                      borderWidth: 1,
                      marginLeft: 8,
                      backgroundColor: badgeStyle.bg,
                      borderColor: badgeStyle.border,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: badgeStyle.text }}>{statusLabel}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

export function TechnicianFloorSnapshot({
  floorAppointments,
  floorTechnicians = [],
  technicianId,
  newAssignmentIds = [],
  onBreak = false,
}: TechnicianFloorSnapshotProps) {
  const styles = useThemeStyles();

  const waiting = floorAppointments.filter((a) => a.status === 'waiting');
  const serving = floorAppointments.filter((a) => a.status === 'serving');
  const checkoutReady = floorAppointments.filter((a) => a.status === 'ready_for_checkout');
  const myAssigned = floorAppointments.filter(
    (a) => a.status === 'assigned_pending' && a.technician_id === technicianId,
  );
  const assignedElsewhere = floorAppointments.filter(
    (a) => a.status === 'assigned_pending' && a.technician_id !== technicianId,
  );

  const statBox = (value: number, label: string, color: string) => (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        padding: 12,
        backgroundColor: styles.tokens.inputBg,
        borderRadius: 12,
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: '600', color }}>{value}</Text>
      <Text style={[styles.textSecondary, { fontSize: 11, marginTop: 4 }]}>{label}</Text>
    </View>
  );

  return (
    <View style={[styles.card, { padding: 16, marginBottom: 16 }]}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Text style={[styles.textPrimary, { fontSize: 18, fontWeight: '600' }]}>Lobby</Text>
          {myAssigned.length > 0 ? (
            <View
              style={{
                backgroundColor: styles.tokens.goldStrong,
                borderRadius: 12,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text style={{ color: '#121212', fontSize: 11, fontWeight: '700' }}>
                {myAssigned.length} for you
              </Text>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {onBreak ? (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                backgroundColor: '#fbbf2422',
                borderWidth: 1,
                borderColor: '#fbbf2444',
              }}
            >
              <Text style={{ color: '#fbbf24', fontSize: 11 }}>On break</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {statBox(waiting.length, 'Waiting', '#fbbf24')}
        {statBox(serving.length, 'In Chair', '#4ade80')}
        {statBox(checkoutReady.length, 'Checkout', '#f59e0b')}
        {statBox(assignedElsewhere.length + myAssigned.length, 'Assigned', '#60a5fa')}
      </View>

      <FloorListView
        floorTechnicians={floorTechnicians}
        floorAppointments={floorAppointments}
        technicianId={technicianId}
        newAssignmentIds={newAssignmentIds}
      />
    </View>
  );
}
