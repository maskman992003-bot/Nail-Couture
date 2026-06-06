import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { getServices } from '@nail-couture/shared/services/services.js';
import {
  buildAppointmentChecklist,
  getChecklistProgress,
  checklistCompletionCount,
} from '@nail-couture/shared/utils/serviceChecklist.js';
import { useThemeStyles } from '../../../theme/useThemeStyles';
import type { TechnicianAppointment } from './types';

type TechnicianServiceChecklistProps = {
  appointment: TechnicianAppointment;
  onToggleItem: (itemId: string, completed: boolean) => void;
  saving?: boolean;
};

type ChecklistItem = {
  id: string;
  label: string;
};

export function TechnicianServiceChecklist({
  appointment,
  onToggleItem,
  saving = false,
}: TechnicianServiceChecklistProps) {
  const styles = useThemeStyles();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getServices()
      .then((catalog) => {
        if (cancelled) return;
        setItems(buildAppointmentChecklist(appointment, catalog));
      })
      .catch(() => {
        if (!cancelled) setItems(buildAppointmentChecklist(appointment, []));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appointment.id, appointment.service_id, appointment.add_ons, appointment.services]);

  const progress = getChecklistProgress(appointment);
  const { done, total } = checklistCompletionCount(items, progress);

  if (loading) {
    return (
      <View style={{ marginTop: 16 }}>
        <ActivityIndicator color={styles.tokens.goldStrong} size="small" />
      </View>
    );
  }

  if (items.length === 0) return null;

  return (
    <View style={{ marginTop: 16 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1 }]}>SERVICE CHECKLIST</Text>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 8,
            backgroundColor: done === total ? '#4ade8022' : styles.tokens.inputBg,
          }}
        >
          <Text style={{ fontSize: 11, color: done === total ? '#4ade80' : styles.tokens.textSecondary }}>
            {done}/{total}
          </Text>
        </View>
      </View>
      <View style={{ gap: 8 }}>
        {items.map((item) => {
          const checked = !!progress[item.id];
          return (
            <Pressable
              key={item.id}
              onPress={() => !saving && onToggleItem(item.id, !checked)}
              disabled={saving}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: checked ? '#4ade8044' : styles.tokens.borderLight,
                backgroundColor: checked ? '#4ade8010' : styles.tokens.inputBg,
                opacity: saving ? 0.6 : 1,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: checked ? '#4ade80' : styles.tokens.borderLight,
                  backgroundColor: checked ? '#4ade80' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {checked ? <Text style={{ color: '#121212', fontSize: 12, fontWeight: '700' }}>✓</Text> : null}
              </View>
              <Text
                style={[
                  styles.textPrimary,
                  { fontSize: 14, flex: 1 },
                  checked ? { textDecorationLine: 'line-through', opacity: 0.7 } : null,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
