import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  Pressable,
  Text,
  View,
} from 'react-native';
import { MULTI_TECH_VISITS } from '@nail-couture/shared/constants/featureFlags.js';
import { getServices } from '@nail-couture/shared/services/services.js';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { formatAppointmentTime, getAppointmentTotalPrice } from '@nail-couture/shared/utils/appointmentHelpers.js';
import { canManageVisitTechnicians } from '@nail-couture/shared/utils/staffCustomerAccess.js';
import {
  getWorkstationStatus,
  getAssignmentPriority,
  WORKSTATION_ON_BREAK,
  WORKSTATION_BUSY,
} from '@nail-couture/shared/utils/technicianWorkstation.js';
import { useAuth } from '../../contexts/AuthContext';
import { StaffScreenLayout } from '../../components/staff/StaffScreenLayout';
import { AppModal, ModalButton } from '../../components/AppModal';
import { LobbyEditModal } from '../../components/admin/LobbyEditModal';
import { VisitTechnicianManager } from '../../components/admin/VisitTechnicianManager';
import { Icon } from '../../components/icons/Icon';
import { useThemeStyles } from '../../theme/useThemeStyles';

type AppointmentRecord = {
  id: string;
  status: string;
  technician_id?: string;
  customer_id?: string;
  booking_type?: string;
  checked_in_at?: string;
  add_ons?: string;
  final_price?: number;
  services?: { name?: string; price?: number };
  customer?: { full_name?: string; phone?: string; refreshment_pref?: string; nail_goal?: string };
};

type TechnicianRecord = {
  id: string;
  full_name?: string;
  preferences?: Record<string, unknown>;
};

type TechWorkload = {
  id: string;
  daily_points?: number;
  workstation_status?: string;
  assignment_priority?: boolean;
  last_dispatch_reason?: string;
};

type DispatchLogEntry = {
  id: string;
  created_at: string;
  customer_name?: string;
  technician_name?: string;
  reason_detail?: string;
};

type ServiceItem = { id: number; name: string; price: number; is_addon?: boolean };

export function AdminLobbyScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const [lobbyAppointments, setLobbyAppointments] = useState<AppointmentRecord[]>([]);
  const [servingAppointments, setServingAppointments] = useState<AppointmentRecord[]>([]);
  const [checkoutReady, setCheckoutReady] = useState<AppointmentRecord[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<AppointmentRecord[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianRecord[]>([]);
  const [techWorkload, setTechWorkload] = useState<Record<string, TechWorkload>>({});
  const [dispatchLog, setDispatchLog] = useState<DispatchLogEntry[]>([]);
  const [showDispatchLog, setShowDispatchLog] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; name?: string } | null>(null);
  const [todayTotal, setTodayTotal] = useState(0);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentRecord | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<AppointmentRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [assignTarget, setAssignTarget] = useState<AppointmentRecord | null>(null);
  const [draggingAppt, setDraggingAppt] = useState<AppointmentRecord | null>(null);
  const [dropHighlightTechId, setDropHighlightTechId] = useState<string | null>(null);
  const [managingTechsFor, setManagingTechsFor] = useState<AppointmentRecord | null>(null);
  const dragPosition = useRef(new Animated.ValueXY()).current;
  const showManageTechs = MULTI_TECH_VISITS && canManageVisitTechnicians(user?.role || '');

  const busyTechnicians = servingAppointments
    .filter((a) => a.status === 'serving' && a.technician_id)
    .map((a) => a.technician_id);
  const pendingTechnicians = pendingAppointments
    .filter((a) => a.status === 'assigned_pending' && a.technician_id)
    .map((a) => a.technician_id);
  const allBusyTechnicians = [...busyTechnicians, ...pendingTechnicians];

  const showToast = (message: string, name?: string) => {
    setNotification({ message, name });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchAll = useCallback(async () => {
    if (!user?.phone) return;
    const phone = user.phone;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [waiting, serving, checkout, pending, techs, workload, audit, countRes] = await Promise.all([
      getSupabase().rpc('get_appointments', { caller_phone: phone, status_filter: 'waiting', order_asc: true }),
      getSupabase().rpc('get_appointments', { caller_phone: phone, status_filter: 'serving', order_asc: true }),
      getSupabase().rpc('get_appointments', { caller_phone: phone, status_filter: 'ready_for_checkout', order_asc: true }),
      getSupabase().rpc('get_appointments', { caller_phone: phone, status_filter: 'assigned_pending', order_asc: true }),
      getSupabase().from('profiles').select('*').eq('role', 'technician').order('full_name'),
      getSupabase().rpc('get_floor_technician_workload'),
      getSupabase().rpc('get_dispatch_audit_log', { caller_phone: phone, p_limit: 20 }),
      getSupabase().rpc('get_appointments_count', { caller_phone: phone, status_filter: 'completed', date_from: today.toISOString() }),
    ]);
    setLobbyAppointments((waiting.data as AppointmentRecord[]) || []);
    setServingAppointments((serving.data as AppointmentRecord[]) || []);
    setCheckoutReady((checkout.data as AppointmentRecord[]) || []);
    setPendingAppointments((pending.data as AppointmentRecord[]) || []);
    setTechnicians((techs.data as TechnicianRecord[]) || []);
    const map: Record<string, TechWorkload> = {};
    ((workload.data as TechWorkload[]) || []).forEach((row) => {
      map[row.id] = row;
    });
    setTechWorkload(map);
    setDispatchLog((audit.data as DispatchLogEntry[]) || []);
    setTodayTotal((countRes.data as number) || 0);
    setLoading(false);
  }, [user?.phone]);

  useEffect(() => {
    fetchAll();
    getServices().then((data) => setServices(data as ServiceItem[])).catch(() => {});
    const channel = getSupabase()
      .channel('floor-manager')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchAll())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => fetchAll())
      .subscribe();
    return () => { getSupabase().removeChannel(channel); };
  }, [fetchAll]);

  const handleAutoAssign = async () => {
    if (!user?.phone) return;
    setAutoAssigning(true);
    try {
      const { data, error } = await getSupabase().rpc('run_cumulative_effort_dispatcher', {
        caller_phone: user.phone,
      });
      if (error) {
        showToast('Auto-assign failed', error.message);
      } else {
        const results = (data?.results as Array<{ assigned?: boolean; reason_detail?: string }>) || [];
        const lastAssigned = [...results].reverse().find((r) => r?.assigned);
        showToast(lastAssigned?.reason_detail || `Assigned ${data?.assigned_count || 0} client(s)`, 'Dispatcher');
      }
      await fetchAll();
    } finally {
      setAutoAssigning(false);
    }
  };

  const assignToTechnician = async (
    appointmentId: string,
    technicianId: string,
    isReallocation = false,
    pendingAppt?: AppointmentRecord,
  ) => {
    const targetTech = technicians.find((t) => String(t.id) === technicianId);
    const targetWs = targetTech ? getWorkstationStatus(targetTech.preferences) : 'available';
    const targetOnBreak = targetWs === WORKSTATION_ON_BREAK;
    const targetWorkstationBusy = targetWs === WORKSTATION_BUSY;
    if (targetOnBreak) {
      showToast('Technician is on break', targetTech?.full_name);
      return;
    }
    if (targetWorkstationBusy && !isReallocation) {
      showToast('Technician is busy');
      return;
    }
    const targetIsServing = servingAppointments.some(
      (a) => String(a.technician_id) === technicianId && a.status === 'serving',
    );
    const targetHasOtherAssignment = pendingAppointments.some(
      (a) => String(a.technician_id) === technicianId && String(a.id) !== String(appointmentId),
    );
    if (targetIsServing || targetHasOtherAssignment) {
      showToast('Technician is busy');
      return;
    }
    if (!isReallocation && allBusyTechnicians.map(String).includes(technicianId)) {
      showToast('Technician is busy');
      return;
    }

    setUpdating(appointmentId);
    const { error } = await getSupabase().rpc('update_appointment', {
      caller_phone: user?.phone,
      appointment_id: appointmentId,
      p_technician_id: technicianId,
      p_status: 'assigned_pending',
    });
    if (error) {
      showToast('Assignment failed', error.message);
    } else if (isReallocation && pendingAppt) {
      showToast(`Reassigned to ${targetTech?.full_name}`, pendingAppt.customer?.full_name);
    }
    await fetchAll();
    setUpdating(null);
    setAssignTarget(null);
    setDraggingAppt(null);
  };

  const returnToWaiting = async (appointmentId: string, appt?: AppointmentRecord) => {
    setUpdating(appointmentId);
    await getSupabase().rpc('update_appointment', {
      caller_phone: user?.phone,
      appointment_id: appointmentId,
      p_status: 'waiting',
      p_technician_id: null,
    });
    showToast('Returned to waiting', appt?.customer?.full_name);
    await fetchAll();
    setUpdating(null);
  };

  const acceptAssignment = async (appointmentId: string) => {
    setUpdating(appointmentId);
    await getSupabase().rpc('update_appointment', {
      caller_phone: user?.phone,
      appointment_id: appointmentId,
      p_status: 'serving',
      p_start_time: new Date().toISOString(),
    });
    await fetchAll();
    setUpdating(null);
  };

  const sendToCheckout = async (appointmentId: string) => {
    setUpdating(appointmentId);
    const appt = servingAppointments.find((a) => a.id === appointmentId);
    const estimatedPrice = appt?.final_price ?? appt?.services?.price ?? null;
    const { error } = await getSupabase().rpc('send_to_checkout', {
      caller_phone: user?.phone,
      appointment_id: appointmentId,
      p_final_price: estimatedPrice,
    });
    if (!error) showToast('Sent to Checkout', appt?.customer?.full_name);
    await fetchAll();
    setUpdating(null);
  };

  const handleEditSave = async (appointmentId: string, updates: Record<string, unknown>) => {
    const { nail_goal, ...apptUpdates } = updates;
    await getSupabase().rpc('update_appointment', {
      caller_phone: user?.phone,
      appointment_id: appointmentId,
      p_service_id: apptUpdates.service_id || null,
      p_add_ons: apptUpdates.add_ons || null,
      p_selected_service_names: apptUpdates.selected_service_names || null,
      p_final_price: apptUpdates.final_price || null,
    });
    if (nail_goal && editingAppointment?.customer_id) {
      await getSupabase().rpc('update_profile_field', {
        caller_phone: user?.phone,
        profile_id: editingAppointment.customer_id,
        field_name: 'nail_goal',
        field_value: nail_goal,
      });
    }
    await fetchAll();
    setEditingAppointment(null);
  };

  const cancelAppointment = async () => {
    if (!cancelConfirm || !cancelReason) return;
    setUpdating(cancelConfirm.id);
    await getSupabase().rpc('cancel_appointment', {
      caller_phone: user?.phone,
      appointment_id: cancelConfirm.id,
    });
    showToast(`Cancelled: ${cancelReason}`, cancelConfirm.customer?.full_name);
    await fetchAll();
    setUpdating(null);
    setCancelConfirm(null);
    setCancelReason('');
  };

  const createDragResponder = (appt: AppointmentRecord) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setDraggingAppt(appt);
        dragPosition.setOffset({ x: 0, y: 0 });
        dragPosition.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: dragPosition.x, dy: dragPosition.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gesture) => {
        dragPosition.flattenOffset();
        if (dropHighlightTechId) {
          const pendingAppt = pendingAppointments.find((a) => String(a.id) === String(appt.id));
          assignToTechnician(appt.id, dropHighlightTechId, !!pendingAppt, pendingAppt);
        }
        setDraggingAppt(null);
        setDropHighlightTechId(null);
        dragPosition.setValue({ x: 0, y: 0 });
        if (gesture.dy < -200 && pendingAppointments.some((a) => String(a.id) === String(appt.id))) {
          returnToWaiting(appt.id, appt);
        }
      },
    });

  const renderWaitingCard = (appt: AppointmentRecord) => {
    const panResponder = createDragResponder(appt);
    return (
      <Animated.View
        key={appt.id}
        {...panResponder.panHandlers}
        style={[
          styles.card,
          {
            padding: 14,
            marginBottom: 8,
            opacity: draggingAppt?.id === appt.id ? 0.5 : 1,
            transform: draggingAppt?.id === appt.id
              ? [{ translateX: dragPosition.x }, { translateY: dragPosition.y }]
              : [],
          },
        ]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.textPrimary, { fontWeight: '600' }]}>
              {appt.customer?.full_name || 'Guest'}
            </Text>
            <Text style={styles.textSecondary}>
              {appt.services?.name || appt.add_ons || 'Service'}
            </Text>
            <Text style={[styles.textSecondary, { fontSize: 11 }]}>
              {formatAppointmentTime(appt.checked_in_at)} · Long-press & drag to assign
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <Pressable onPress={() => setAssignTarget(appt)}>
              <Text style={styles.textGold}>Assign</Text>
            </Pressable>
            {showManageTechs && (
              <Pressable onPress={() => setManagingTechsFor(appt)}>
                <Text style={styles.textGold}>Manage techs</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setEditingAppointment(appt)}>
              <Text style={styles.textSecondary}>Edit</Text>
            </Pressable>
            <Pressable onPress={() => setCancelConfirm(appt)}>
              <Icon name="close" size={18} color="#f87171" />
            </Pressable>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderTechCard = (tech: TechnicianRecord) => {
    const workload = techWorkload[tech.id] || {};
    const wsStatus = workload.workstation_status || getWorkstationStatus(tech.preferences);
    const isBusy = busyTechnicians.includes(tech.id) || wsStatus === WORKSTATION_BUSY;
    const isOnBreak = wsStatus === WORKSTATION_ON_BREAK;
    const assignmentPriority = workload.assignment_priority ?? getAssignmentPriority(tech.preferences);
    const pendingAppt = pendingAppointments.find((a) => String(a.technician_id) === String(tech.id));
    const servingAppt = servingAppointments.find((a) => String(a.technician_id) === String(tech.id));
    const isHighlighted = dropHighlightTechId === tech.id;

    return (
      <Pressable
        key={tech.id}
        onPressIn={() => draggingAppt && setDropHighlightTechId(tech.id)}
        onPressOut={() => setDropHighlightTechId(null)}
        style={[
          styles.card,
          {
            padding: 14,
            marginBottom: 10,
            borderWidth: 2,
            borderColor: isHighlighted
              ? styles.tokens.goldStrong
              : isBusy
                ? 'rgba(239,68,68,0.4)'
                : isOnBreak
                  ? 'rgba(234,179,8,0.4)'
                  : styles.tokens.borderLight,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.textPrimary, { fontWeight: '600' }]}>{tech.full_name}</Text>
            <Text style={[styles.textSecondary, { fontSize: 11, marginTop: 2 }]}>
              {workload.daily_points ?? 0} pts today
              {workload.last_dispatch_reason ? ` · ${workload.last_dispatch_reason}` : ''}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            {assignmentPriority && (
              <Text style={{ fontSize: 10, color: '#c084fc', fontWeight: '600' }}>Priority</Text>
            )}
            <Text style={{ fontSize: 11, color: isBusy ? '#f87171' : isOnBreak ? '#facc15' : pendingAppt ? '#fbbf24' : '#4ade80' }}>
            {isBusy ? 'Busy' : isOnBreak ? 'On Break' : pendingAppt ? 'Pending' : 'Available'}
          </Text>
          </View>
        </View>
        {isBusy && servingAppt ? (
          <>
            <Text style={styles.textSecondary}>{servingAppt.customer?.full_name}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
              {showManageTechs && (
                <Pressable onPress={() => setManagingTechsFor(servingAppt)}>
                  <Text style={styles.textGold}>Manage techs</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => sendToCheckout(servingAppt.id)}
                disabled={updating === servingAppt.id}
                style={{ backgroundColor: styles.tokens.goldStrong, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }}
              >
                <Text style={{ color: '#121212', fontWeight: '600' }}>
                  {updating === servingAppt.id ? 'Sending...' : 'Send to Checkout'}
                </Text>
              </Pressable>
            </View>
          </>
        ) : pendingAppt ? (
          <>
            <Text style={styles.textSecondary}>{pendingAppt.customer?.full_name}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <Pressable onPress={() => acceptAssignment(pendingAppt.id)} style={{ backgroundColor: '#22c55e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>Confirm Start</Text>
              </Pressable>
              {showManageTechs && (
                <Pressable onPress={() => setManagingTechsFor(pendingAppt)}>
                  <Text style={styles.textGold}>Manage techs</Text>
                </Pressable>
              )}
              <Pressable onPress={() => returnToWaiting(pendingAppt.id, pendingAppt)}>
                <Text style={styles.textGold}>Return to Waiting</Text>
              </Pressable>
            </View>
          </>
        ) : isOnBreak ? (
          <Text style={{ color: '#facc15', fontSize: 12 }}>On break — cannot assign</Text>
        ) : (
          <Text style={[styles.textSecondary, { fontSize: 12 }]}>
            {draggingAppt ? 'Drop here to assign' : 'Tap waiting customer to assign'}
          </Text>
        )}
      </Pressable>
    );
  };

  if (loading) {
    return (
      <StaffScreenLayout>
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <ActivityIndicator color={styles.tokens.goldStrong} />
        </View>
      </StaffScreenLayout>
    );
  }

  return (
    <StaffScreenLayout
      title="Floor Manager"
      subtitle={`${todayTotal} completed today`}
      headerRight={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={handleAutoAssign}
            disabled={autoAssigning || lobbyAppointments.length === 0}
            style={{
              backgroundColor: styles.tokens.goldStrong,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 8,
              opacity: autoAssigning || lobbyAppointments.length === 0 ? 0.5 : 1,
            }}
          >
            <Text style={{ color: '#121212', fontWeight: '600', fontSize: 12 }}>
              {autoAssigning ? '…' : 'Auto'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setShowDispatchLog((v) => !v)}
            style={{
              borderWidth: 1,
              borderColor: styles.tokens.borderLight,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: styles.tokens.textSecondary, fontSize: 12 }}>Log</Text>
          </Pressable>
        </View>
      }
    >
      {notification && (
        <View style={{ backgroundColor: 'rgba(197,160,89,0.15)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <Text style={styles.textGold}>{notification.name ? `${notification.name}: ` : ''}{notification.message}</Text>
        </View>
      )}

      {showDispatchLog && (
        <View style={[styles.card, { padding: 12, marginBottom: 12 }]}>
          <Text style={[styles.textGold, { fontWeight: '600', marginBottom: 8 }]}>Dispatcher log (today)</Text>
          {dispatchLog.length === 0 ? (
            <Text style={styles.textSecondary}>No dispatch decisions yet today.</Text>
          ) : (
            dispatchLog.map((entry) => (
              <Text key={entry.id} style={[styles.textSecondary, { fontSize: 12, marginBottom: 4 }]}>
                {entry.customer_name || 'Client'}
                {entry.technician_name ? ` → ${entry.technician_name}` : ''}
                {entry.reason_detail ? `: ${entry.reason_detail}` : ''}
              </Text>
            ))
          )}
        </View>
      )}

      <Text style={[styles.textGold, { fontSize: 16, fontWeight: '600', marginBottom: 8 }]}>
        Waiting ({lobbyAppointments.length})
      </Text>
      {lobbyAppointments.length === 0 ? (
        <Text style={[styles.textSecondary, { marginBottom: 16 }]}>No customers waiting</Text>
      ) : (
        lobbyAppointments.map(renderWaitingCard)
      )}

      <Text style={[styles.textGold, { fontSize: 16, fontWeight: '600', marginTop: 8, marginBottom: 8 }]}>
        Ready for Checkout ({checkoutReady.length})
      </Text>
      {checkoutReady.map((appt) => (
        <View key={appt.id} style={[styles.card, { padding: 12, marginBottom: 8 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.textPrimary}>{appt.customer?.full_name || 'Guest'}</Text>
            {showManageTechs && (
              <Pressable onPress={() => setManagingTechsFor(appt)}>
                <Text style={styles.textGold}>Manage techs</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.textGold}>
            ${getAppointmentTotalPrice(appt, services).toFixed(2)}
          </Text>
        </View>
      ))}

      <Text style={[styles.textGold, { fontSize: 16, fontWeight: '600', marginTop: 8, marginBottom: 8 }]}>
        Technician Stations
      </Text>
      {technicians.map(renderTechCard)}

      {editingAppointment && (
        <LobbyEditModal
          appointment={editingAppointment}
          services={services}
          onSave={handleEditSave}
          onClose={() => setEditingAppointment(null)}
        />
      )}

      <AppModal
        open={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        title="Assign to Technician"
        subtitle={assignTarget?.customer?.full_name}
        scrollBody
      >
        {technicians.map((tech) => (
          <Pressable
            key={tech.id}
            onPress={() => assignTarget && assignToTechnician(assignTarget.id, tech.id)}
            style={[styles.card, { padding: 14, marginBottom: 8 }]}
          >
            <Text style={styles.textPrimary}>{tech.full_name}</Text>
          </Pressable>
        ))}
      </AppModal>

      <AppModal
        open={!!managingTechsFor}
        onClose={() => setManagingTechsFor(null)}
        title={`Technicians — ${managingTechsFor?.customer?.full_name || 'Guest'}`}
        scrollBody
        footer={<ModalButton label="Done" onPress={() => setManagingTechsFor(null)} />}
      >
        {managingTechsFor && user?.phone && (
          <VisitTechnicianManager
            appointment={managingTechsFor}
            callerPhone={user.phone}
            technicians={technicians}
            onUpdated={(result) => {
              if (result?.primary_technician_id) {
                setManagingTechsFor((prev) => prev
                  ? { ...prev, technician_id: result.primary_technician_id }
                  : prev);
              }
              fetchAll();
            }}
          />
        )}
      </AppModal>

      <AppModal
        open={!!cancelConfirm}
        onClose={() => setCancelConfirm(null)}
        title="Cancel Appointment?"
        footer={
          <>
            <ModalButton label="Keep" onPress={() => setCancelConfirm(null)} />
            <ModalButton label="Cancel" variant="danger" onPress={cancelAppointment} disabled={!cancelReason} />
          </>
        }
      >
        <Text style={styles.textSecondary}>Select reason (required)</Text>
        {['No-show', 'Customer request', 'Schedule conflict', 'Other'].map((reason) => (
          <Pressable
            key={reason}
            onPress={() => setCancelReason(reason)}
            style={[styles.card, { padding: 12, marginTop: 8, borderWidth: cancelReason === reason ? 2 : 1, borderColor: cancelReason === reason ? styles.tokens.goldStrong : styles.tokens.borderLight }]}
          >
            <Text style={styles.textPrimary}>{reason}</Text>
          </Pressable>
        ))}
      </AppModal>
    </StaffScreenLayout>
  );
}
