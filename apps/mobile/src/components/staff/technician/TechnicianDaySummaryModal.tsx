import { Text, View } from 'react-native';
import { AppModal } from '../../AppModal';
import { useThemeStyles } from '../../../theme/useThemeStyles';
import { formatServiceDuration } from '@nail-couture/shared/utils/technicianQueue.js';
import type { TechnicianAppointment } from './types';

type PaymentRecord = {
  extras_amount?: number;
};

type TechnicianDaySummaryModalProps = {
  open: boolean;
  onClose: () => void;
  workAppointments?: TechnicianAppointment[];
  paymentsByAppointment?: Map<string, PaymentRecord>;
};

function formatTime(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function TechnicianDaySummaryModal({
  open,
  onClose,
  workAppointments = [],
  paymentsByAppointment,
}: TechnicianDaySummaryModalProps) {
  const styles = useThemeStyles();

  const totalTips = workAppointments.reduce((sum, appt) => {
    const payment = paymentsByAppointment?.get(appt.id);
    return sum + Number(payment?.extras_amount ?? 0);
  }, 0);

  return (
    <AppModal open={open} onClose={onClose} title="Today's Work" scrollBody>
      {workAppointments.length === 0 ? (
        <Text style={[styles.textSecondary, { textAlign: 'center', paddingVertical: 24 }]}>
          No completed services yet today.
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingBottom: 8,
              borderBottomWidth: 1,
              borderBottomColor: styles.tokens.borderLight,
            }}
          >
            <Text style={[styles.textSecondary, { fontSize: 12 }]}>
              {workAppointments.length} service{workAppointments.length !== 1 ? 's' : ''}
            </Text>
            {totalTips > 0 ? (
              <Text style={[styles.textGold, { fontSize: 12, fontWeight: '600' }]}>
                ${totalTips.toFixed(2)} in tips
              </Text>
            ) : null}
          </View>

          {workAppointments.map((appt) => {
            const payment = paymentsByAppointment?.get(appt.id);
            const tip = Number(payment?.extras_amount ?? 0);
            const isPaid = !!payment;
            const endTime = appt.end_time || appt.completed_at;
            const duration = formatServiceDuration(appt.start_time, endTime);
            const price = Number(appt.final_price ?? appt.services?.price ?? 0);

            return (
              <View
                key={appt.id}
                style={[
                  styles.card,
                  { padding: 12, backgroundColor: styles.tokens.inputBg, borderColor: styles.tokens.borderLight },
                ]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.textPrimary, { fontWeight: '600' }]} numberOfLines={1}>
                      {appt.customer?.full_name || 'Guest'}
                    </Text>
                    <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 2 }]} numberOfLines={1}>
                      {appt.add_ons || appt.services?.name || 'Service'}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                      borderWidth: 1,
                      backgroundColor: isPaid ? '#4ade8022' : '#fbbf2422',
                      borderColor: isPaid ? '#4ade8044' : '#fbbf2444',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '600',
                        color: isPaid ? '#4ade80' : '#fbbf24',
                        textTransform: 'uppercase',
                      }}
                    >
                      {isPaid ? 'Paid' : 'At checkout'}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {appt.start_time ? (
                    <Text style={[styles.textSecondary, { fontSize: 11 }]}>
                      {formatTime(appt.start_time)}
                      {endTime ? ` → ${formatTime(endTime)}` : ''}
                    </Text>
                  ) : null}
                  {duration ? (
                    <Text style={[styles.textSecondary, { fontSize: 11 }]}>{duration}</Text>
                  ) : null}
                  {price > 0 ? (
                    <Text style={[styles.textSecondary, { fontSize: 11 }]}>${price.toFixed(0)} service</Text>
                  ) : null}
                  {isPaid && tip > 0 ? (
                    <Text style={[styles.textGold, { fontSize: 11 }]}>${tip.toFixed(2)} tip</Text>
                  ) : null}
                  {isPaid && tip <= 0 ? (
                    <Text style={[styles.textSecondary, { fontSize: 11 }]}>No tip</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </AppModal>
  );
}
