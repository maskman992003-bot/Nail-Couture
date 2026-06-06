import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { getServices } from '@nail-couture/shared/services/services.js';
import {
  parseAppointmentLineItems,
  calculateLineItemTotal,
  buildServiceUpdatePayload,
} from '@nail-couture/shared/utils/appointmentServices.js';
import { AppModal, ModalButton } from '../../AppModal';
import { Icon } from '../../icons/Icon';
import { useThemeStyles } from '../../../theme/useThemeStyles';
import type { TechnicianAppointment, ServiceUpdatePayload } from './types';

type ServiceRecord = {
  id: string;
  name: string;
  price: number;
};

type TechnicianServiceEditorProps = {
  open: boolean;
  onClose: () => void;
  appointment: TechnicianAppointment;
  onSave: (appointment: TechnicianAppointment, payload: ServiceUpdatePayload) => Promise<{ success?: boolean; error?: string }>;
  saving?: boolean;
};

export function TechnicianServiceEditor({
  open,
  onClose,
  appointment,
  onSave,
  saving = false,
}: TechnicianServiceEditorProps) {
  const styles = useThemeStyles();
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMain, setSelectedMain] = useState<ServiceRecord[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [error, setError] = useState('');

  const parsed = parseAppointmentLineItems(appointment, services);
  const { mainServices, addOnServices } = parsed;
  const total = calculateLineItemTotal(selectedMain, selectedAddons, addOnServices);

  useEffect(() => {
    if (!open) return;
    setError('');
    setLoading(true);
    getServices()
      .then((data) => {
        setServices(data);
        const next = parseAppointmentLineItems(appointment, data);
        setSelectedMain(next.selectedMain);
        setSelectedAddons(next.selectedAddons);
      })
      .catch(() => setError('Failed to load services'))
      .finally(() => setLoading(false));
  }, [open, appointment]);

  const toggleMain = (service: ServiceRecord) => {
    setSelectedMain((prev) =>
      prev.some((s) => s.id === service.id)
        ? prev.filter((s) => s.id !== service.id)
        : [...prev, service],
    );
  };

  const toggleAddon = (name: string) => {
    setSelectedAddons((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const handleSave = async () => {
    if (selectedMain.length === 0) {
      setError('Select at least one service');
      return;
    }
    setError('');
    const payload = buildServiceUpdatePayload(selectedMain, selectedAddons, addOnServices);
    const result = await onSave(appointment, payload);
    if (result?.success !== false) onClose();
    else setError(result.error || 'Failed to update services');
  };

  const checkboxRow = (
    label: string,
    priceLabel: string,
    checked: boolean,
    onPress: () => void,
  ) => (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: styles.tokens.borderLight,
        backgroundColor: styles.tokens.inputBg,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          borderWidth: 2,
          borderColor: checked ? styles.tokens.goldStrong : styles.tokens.borderLight,
          backgroundColor: checked ? styles.tokens.goldStrong : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <Icon name="check" size={12} color="#121212" strokeWidth={3} /> : null}
      </View>
      <Text style={[styles.textPrimary, { flex: 1, fontSize: 14 }]}>{label}</Text>
      <Text style={{ color: '#4ade80', fontSize: 14 }}>{priceLabel}</Text>
    </Pressable>
  );

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Update services"
      subtitle={
        appointment.customer?.full_name ? `For ${appointment.customer.full_name}` : undefined
      }
      scrollBody
      footer={
        <>
          <ModalButton label="Cancel" onPress={onClose} disabled={saving} />
          <ModalButton
            label={saving ? 'Saving…' : 'Save services'}
            variant="primary"
            onPress={handleSave}
            disabled={saving || loading || selectedMain.length === 0}
          />
        </>
      }
    >
      {loading ? (
        <ActivityIndicator color={styles.tokens.goldStrong} />
      ) : (
        <View style={{ gap: 16 }}>
          <Text style={[styles.textSecondary, { fontSize: 12 }]}>
            Add or remove services while the client is in chair. Total updates for checkout.
          </Text>

          <View>
            <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, marginBottom: 8 }]}>
              SERVICES
            </Text>
            <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
              {mainServices.map((s) =>
                checkboxRow(
                  s.name,
                  `$${s.price}`,
                  selectedMain.some((sv) => sv.id === s.id),
                  () => toggleMain(s),
                ),
              )}
            </ScrollView>
          </View>

          {addOnServices.length > 0 ? (
            <View>
              <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, marginBottom: 8 }]}>
                ADD-ONS
              </Text>
              <ScrollView style={{ maxHeight: 140 }} nestedScrollEnabled>
                {addOnServices.map((s) =>
                  checkboxRow(
                    s.name,
                    `+$${s.price}`,
                    selectedAddons.includes(s.name),
                    () => toggleAddon(s.name),
                  ),
                )}
              </ScrollView>
            </View>
          ) : null}

          {selectedMain.length > 0 ? (
            <View
              style={{
                padding: 16,
                borderRadius: 12,
                backgroundColor: `${styles.tokens.goldStrong}14`,
                borderWidth: 1,
                borderColor: `${styles.tokens.goldStrong}33`,
              }}
            >
              {selectedMain.map((s) => (
                <View key={s.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={styles.textSecondary}>{s.name}</Text>
                  <Text style={styles.textPrimary}>${Number(s.price).toFixed(2)}</Text>
                </View>
              ))}
              {selectedAddons.map((name) => {
                const svc = addOnServices.find((s) => s.name === name);
                return svc ? (
                  <View key={name} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={styles.textSecondary}>{svc.name}</Text>
                    <Text style={styles.textPrimary}>+${Number(svc.price).toFixed(2)}</Text>
                  </View>
                ) : null;
              })}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: `${styles.tokens.goldStrong}33`,
                }}
              >
                <Text style={styles.textSecondary}>Estimated total</Text>
                <Text style={[styles.textGold, { fontSize: 22, fontWeight: '600' }]}>
                  ${total.toFixed(2)}
                </Text>
              </View>
            </View>
          ) : null}

          {error ? <Text style={{ color: '#f87171', fontSize: 13 }}>{error}</Text> : null}
        </View>
      )}
    </AppModal>
  );
}
