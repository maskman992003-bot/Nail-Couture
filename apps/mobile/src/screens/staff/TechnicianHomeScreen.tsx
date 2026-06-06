import { useCallback, useRef } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useTechnicianQueue } from '@nail-couture/shared/hooks/useTechnicianQueue.js';
import { useAuth } from '../../contexts/AuthContext';
import { StaffScreenLayout } from '../../components/staff/StaffScreenLayout';
import { TechnicianDashboard } from '../../components/staff/technician/TechnicianDashboard';
import type { TechnicianDashboardProps } from '../../components/staff/technician/TechnicianDashboard';
import { useThemeStyles } from '../../theme/useThemeStyles';

export function TechnicianHomeScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const scrollRef = useRef<ScrollView>(null);
  const assignmentsY = useRef(0);
  const queue = useTechnicianQueue(user?.id, user?.phone);

  const scrollToAssignments = useCallback(() => {
    scrollRef.current?.scrollTo({ y: assignmentsY.current, animated: true });
  }, []);

  const handleAssignmentsLayout = useCallback((y: number) => {
    assignmentsY.current = y;
  }, []);

  if (queue.loading) {
    return (
      <StaffScreenLayout>
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <ActivityIndicator color={styles.tokens.goldStrong} />
        </View>
      </StaffScreenLayout>
    );
  }

  const firstName = user?.full_name?.split(' ')[0] || 'Technician';

  return (
    <StaffScreenLayout
      scrollRef={scrollRef}
      title={`Hello, ${firstName}`}
      subtitle="Your workstation"
    >
      <TechnicianDashboard
        user={user}
        floorAppointments={queue.floorAppointments}
        stats={queue.stats}
        weekStats={queue.weekStats}
        tipsToday={queue.tipsToday}
        paymentsByAppointment={queue.paymentsByAppointment}
        refreshing={queue.refreshing}
        actionId={queue.actionId}
        toast={queue.toast}
        newAssignmentIds={queue.newAssignmentIds}
        newAssignmentBanner={queue.newAssignmentBanner}
        refetch={queue.refetch}
        acceptAssignment={queue.acceptAssignment}
        markComplete={queue.markComplete}
        declineAssignment={queue.declineAssignment}
        updateServingServices={
          queue.updateServingServices as TechnicianDashboardProps['updateServingServices']
        }
        updateChecklistItem={queue.updateChecklistItem}
        logProductUsage={queue.logProductUsage}
        floorTechnicians={queue.floorTechnicians}
        dismissToast={queue.dismissToast}
        dismissNewAssignment={queue.dismissNewAssignment}
        clearNewAssignments={queue.clearNewAssignments}
        scrollToAssignments={scrollToAssignments}
        priceConfirmAppt={queue.priceConfirmAppt}
        confirmCompleteWithoutPrice={queue.confirmCompleteWithoutPrice}
        cancelPriceConfirm={queue.cancelPriceConfirm}
        onAssignmentsLayout={handleAssignmentsLayout}
      />
    </StaffScreenLayout>
  );
}
