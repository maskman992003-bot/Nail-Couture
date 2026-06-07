import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  WORKSTATION_AVAILABLE,
  WORKSTATION_ON_BREAK,
  fetchWorkstationStatus,
  setWorkstationStatus,
} from '@nail-couture/shared/utils/technicianWorkstation.js';
import { AppModal, ModalButton } from '../../AppModal';
import { Icon } from '../../icons/Icon';
import { useThemeStyles } from '../../../theme/useThemeStyles';
import { TechnicianQuickLinks } from './TechnicianQuickLinks';
import { TechnicianStats } from './TechnicianStats';
import { TechnicianFloorSnapshot } from './TechnicianFloorSnapshot';
import { TechnicianQueue } from './TechnicianQueue';
import { TechnicianInChairPanel } from './TechnicianInChairPanel';
import { TechnicianNewAssignmentBanner } from './TechnicianNewAssignmentBanner';
import type {
  FloorTechnician,
  NewAssignmentBannerItem,
  QueueStats,
  ServiceUpdatePayload,
  TechnicianAppointment,
  ToastState,
  WeekStats,
} from './types';

type AuthUser = {
  id?: string;
  full_name?: string;
  role?: string;
};

type PaymentRecord = {
  extras_amount?: number;
};

export type TechnicianDashboardProps = {
  user: AuthUser | null;
  floorAppointments: TechnicianAppointment[];
  stats: QueueStats;
  weekStats: WeekStats;
  tipsToday: number;
  paymentsByAppointment: Map<string, PaymentRecord>;
  refreshing: boolean;
  actionId: string | null;
  toast: ToastState | null;
  newAssignmentIds: string[];
  newAssignmentBanner: NewAssignmentBannerItem[];
  refetch: (silent?: boolean) => Promise<void>;
  acceptAssignment: (appt: TechnicianAppointment) => Promise<void>;
  markComplete: (appt: TechnicianAppointment) => Promise<void>;
  declineAssignment: (appt: TechnicianAppointment, reason?: string) => Promise<void>;
  updateServingServices: (
    appt: TechnicianAppointment,
    payload: ServiceUpdatePayload,
  ) => Promise<{ success?: boolean; error?: string }>;
  updateChecklistItem: (
    appt: TechnicianAppointment,
    itemId: string,
    completed: boolean,
  ) => Promise<{ success?: boolean; error?: string }>;
  logProductUsage: (
    appt: TechnicianAppointment,
    payload: { inventoryId: string; quantity: number; logType: string },
  ) => Promise<{ success?: boolean; error?: string }>;
  floorTechnicians: FloorTechnician[];
  dismissToast: () => void;
  dismissNewAssignment: (id: string) => void;
  clearNewAssignments: () => void;
  scrollToAssignments: () => void;
  priceConfirmAppt: TechnicianAppointment | null;
  confirmCompleteWithoutPrice: () => Promise<void>;
  cancelPriceConfirm: () => void;
  onAssignmentsLayout?: (y: number) => void;
};

export function TechnicianDashboard({
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
  logProductUsage,
  floorTechnicians,
  dismissToast,
  dismissNewAssignment,
  clearNewAssignments,
  scrollToAssignments,
  priceConfirmAppt,
  confirmCompleteWithoutPrice,
  cancelPriceConfirm,
  onAssignmentsLayout,
}: TechnicianDashboardProps) {
  const styles = useThemeStyles();
  const hasWork = stats.currentAppointment || stats.pendingCount > 0;
  const [workstationStatus, setWorkstationStatusState] = useState(WORKSTATION_AVAILABLE);
  const [statusSaving, setStatusSaving] = useState(false);
  const [profilePreferences, setProfilePreferences] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!user?.id) return;
    fetchWorkstationStatus(user.id).then(({ status, preferences }) => {
      setWorkstationStatusState(status);
      setProfilePreferences(preferences || {});
    });
  }, [user?.id]);

  const toggleBreak = useCallback(async () => {
    if (!user?.id || statusSaving) return;
    const next =
      workstationStatus === WORKSTATION_ON_BREAK ? WORKSTATION_AVAILABLE : WORKSTATION_ON_BREAK;
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
      {toast ? (
        <View
          style={{
            marginBottom: 16,
            padding: 14,
            borderRadius: 12,
            backgroundColor: toast.type === 'error' ? '#dc2626' : styles.tokens.goldStrong,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <Text
            style={{
              flex: 1,
              color: toast.type === 'error' ? '#fff' : '#121212',
              fontSize: 14,
              fontWeight: '500',
            }}
          >
            {toast.message}
          </Text>
          <Pressable onPress={dismissToast} hitSlop={8} accessibilityLabel="Dismiss">
            <Icon
              name="close"
              size={20}
              color={toast.type === 'error' ? '#fff' : '#121212'}
              style={{ opacity: 0.7 }}
            />
          </Pressable>
        </View>
      ) : null}

      <View style={{ gap: 0 }}>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 8,
            marginBottom: 16,
          }}
        >
          <Pressable
            onPress={toggleBreak}
            disabled={statusSaving}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 12,
              borderWidth: 1,
              backgroundColor: onBreak ? '#fbbf2422' : styles.tokens.inputBg,
              borderColor: onBreak ? '#fbbf2444' : styles.tokens.borderLight,
              opacity: statusSaving ? 0.5 : 1,
            }}
          >
            <Text style={{ color: onBreak ? '#fbbf24' : styles.tokens.textSecondary, fontSize: 13 }}>
              {statusSaving ? 'Updating…' : onBreak ? 'On Break' : 'Available'}
            </Text>
          </Pressable>
          <Text style={[styles.textSecondary, { fontSize: 12 }]}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          <Pressable
            onPress={() => refetch()}
            disabled={refreshing}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: styles.tokens.borderLight,
              backgroundColor: styles.tokens.inputBg,
              opacity: refreshing ? 0.5 : 1,
            }}
          >
            <Text style={styles.textSecondary}>{refreshing ? 'Refreshing…' : 'Refresh'}</Text>
          </Pressable>
        </View>

        {onBreak ? (
          <View
            style={{
              padding: 16,
              marginBottom: 16,
              borderRadius: 16,
              backgroundColor: '#fbbf2418',
              borderWidth: 1,
              borderColor: '#fbbf2433',
            }}
          >
            <Text style={{ color: '#fbbf24', fontSize: 14 }}>
              You&apos;re on break — lobby won&apos;t assign new clients until you&apos;re available again.
            </Text>
          </View>
        ) : null}

        <TechnicianNewAssignmentBanner
          assignments={newAssignmentBanner}
          onView={scrollToAssignments}
          onDismissAll={clearNewAssignments}
        />

        {stats.currentAppointment ? (
          <TechnicianInChairPanel
            appointment={stats.currentAppointment}
            actionId={actionId}
            onComplete={markComplete}
            onUpdateServices={updateServingServices}
            onToggleChecklistItem={updateChecklistItem}
            onLogProductUsage={logProductUsage}
          />
        ) : null}

        <TechnicianFloorSnapshot
          floorAppointments={floorAppointments}
          floorTechnicians={floorTechnicians}
          technicianId={user?.id}
          newAssignmentIds={newAssignmentIds}
          onBreak={onBreak}
        />

        {!stats.currentAppointment && !hasWork ? (
          <View style={[styles.card, { padding: 32, marginBottom: 16, alignItems: 'center' }]}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>✨</Text>
            <Text style={styles.cardTitle}>All clear!</Text>
            <Text style={[styles.textSecondary, { fontSize: 13, marginTop: 4, textAlign: 'center' }]}>
              No assignments right now. Check the floor snapshot for salon activity.
            </Text>
          </View>
        ) : null}

        {!stats.currentAppointment && stats.pendingCount > 0 ? (
          <View
            style={[
              styles.card,
              {
                padding: 20,
                marginBottom: 16,
                alignItems: 'center',
                borderStyle: 'dashed',
              },
            ]}
          >
            <Text style={[styles.textSecondary, { fontSize: 13, textAlign: 'center' }]}>
              You have {stats.pendingCount} assignment{stats.pendingCount !== 1 ? 's' : ''} waiting — accept
              one below to start.
            </Text>
          </View>
        ) : null}

        <View
          onLayout={(event) => onAssignmentsLayout?.(event.nativeEvent.layout.y)}
          collapsable={false}
        >
          <TechnicianQueue
            pendingAssignments={stats.pendingAssignments}
            actionId={actionId}
            onAccept={acceptAssignment}
            onDecline={declineAssignment}
            onDismissNew={dismissNewAssignment}
            newAssignmentIds={newAssignmentIds}
          />
        </View>

        <TechnicianStats
          stats={stats}
          weekStats={weekStats}
          tipsToday={tipsToday}
          paymentsByAppointment={paymentsByAppointment}
        />

        <View style={{ marginTop: 16 }}>
          <TechnicianQuickLinks />
        </View>
      </View>

      <AppModal
        open={!!priceConfirmAppt}
        onClose={cancelPriceConfirm}
        title="Send without price?"
        footer={
          <>
            <ModalButton label="Cancel" onPress={cancelPriceConfirm} />
            <ModalButton
              label={actionId === priceConfirmAppt?.id ? 'Sending…' : 'Send anyway'}
              variant="primary"
              onPress={confirmCompleteWithoutPrice}
              disabled={actionId === priceConfirmAppt?.id}
            />
          </>
        }
      >
        <Text style={styles.textSecondary}>
          No final price is set for{' '}
          <Text style={styles.textPrimary}>
            {priceConfirmAppt?.customer?.full_name || 'this client'}
          </Text>
          . Cashier can adjust at checkout.
        </Text>
      </AppModal>
    </>
  );
}
