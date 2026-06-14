import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { AppModal, ModalButton } from '../AppModal';
import { useThemeStyles } from '../../theme/useThemeStyles';
import { isServiceBookable, isAddOnBookable } from '@nail-couture/shared/utils/serviceVisibility.js';

type ServiceItem = {
  id: number;
  name: string;
  price: number;
  is_addon?: boolean;
};

type AppointmentRecord = {
  id: string;
  customer?: { nail_goal?: string };
};

type LobbyEditModalProps = {
  appointment: AppointmentRecord | null;
  services: ServiceItem[];
  onSave: (appointmentId: string, updates: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
};

export function LobbyEditModal({ appointment, services, onSave, onClose }: LobbyEditModalProps) {
  const styles = useThemeStyles();
  const mainServices = services.filter((s) => isServiceBookable(s));
  const addOnServices = services.filter((s) => isAddOnBookable(s));

  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [nailGoal, setNailGoal] = useState(appointment?.customer?.nail_goal || '');
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [saving, setSaving] = useState(false);

  if (!appointment) return null;

  const addOnPrice = selectedAddons.reduce((sum, name) => {
    const svc = addOnServices.find((s) => s.name === name);
    return sum + (svc?.price || 0);
  }, 0);
  const mainPrice = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
  const basePrice = mainPrice + addOnPrice;
  const totalAfterDiscount = discountAmount
    ? (discountType === 'percent'
        ? basePrice * (1 - parseFloat(discountAmount) / 100)
        : basePrice - parseFloat(discountAmount))
    : basePrice;
  const finalDisplayPrice = Math.max(0, totalAfterDiscount).toFixed(2);

  const toggleMain = (service: ServiceItem) => {
    setSelectedServices((prev) =>
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
    setSaving(true);
    await onSave(appointment.id, {
      service_id: selectedServices[0]?.id || null,
      selected_service_names: selectedServices.map((s) => s.name).join(', ') || null,
      add_ons: selectedAddons.join(', ') || null,
      final_price: parseFloat(finalDisplayPrice),
      nail_goal: nailGoal || null,
    });
    setSaving(false);
    onClose();
  };

  const inputStyle = {
    backgroundColor: styles.tokens.inputBg,
    borderWidth: 1,
    borderColor: styles.tokens.borderLight,
    borderRadius: 8,
    padding: 10,
    color: styles.tokens.textPrimary,
    marginBottom: 8,
  };

  return (
    <AppModal
      open
      onClose={onClose}
      title="Edit Appointment"
      scrollBody
      footer={
        <>
          <ModalButton label="Cancel" onPress={onClose} />
          <ModalButton
            label={saving ? 'Saving...' : 'Save'}
            onPress={handleSave}
            disabled={saving || selectedServices.length === 0}
          />
        </>
      }
    >
      <Text style={styles.textSecondary}>Services</Text>
      {mainServices.map((s) => (
        <Pressable key={s.id} onPress={() => toggleMain(s)} style={[styles.card, { padding: 10, marginBottom: 6, borderWidth: selectedServices.some((sv) => sv.id === s.id) ? 2 : 1, borderColor: selectedServices.some((sv) => sv.id === s.id) ? styles.tokens.goldStrong : styles.tokens.borderLight }]}>
          <Text style={styles.textPrimary}>{s.name} — ${s.price}</Text>
        </Pressable>
      ))}
      {addOnServices.length > 0 && (
        <>
          <Text style={[styles.textSecondary, { marginTop: 8 }]}>Add-ons</Text>
          {addOnServices.map((s) => (
            <Pressable key={s.id} onPress={() => toggleAddon(s.name)} style={[styles.card, { padding: 10, marginBottom: 6, borderWidth: selectedAddons.includes(s.name) ? 2 : 1, borderColor: selectedAddons.includes(s.name) ? styles.tokens.goldStrong : styles.tokens.borderLight }]}>
              <Text style={styles.textPrimary}>+{s.name} — ${s.price}</Text>
            </Pressable>
          ))}
        </>
      )}
      <Text style={[styles.textSecondary, { marginTop: 8 }]}>Nail Goal</Text>
      <TextInput value={nailGoal} onChangeText={setNailGoal} style={inputStyle} placeholderTextColor={styles.tokens.textMuted} />
      <Text style={styles.textSecondary}>Discount</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput value={discountAmount} onChangeText={setDiscountAmount} keyboardType="decimal-pad" style={[inputStyle, { flex: 1 }]} placeholder="0" placeholderTextColor={styles.tokens.textMuted} />
        <Pressable onPress={() => setDiscountType('amount')} style={{ padding: 10, borderRadius: 8, backgroundColor: discountType === 'amount' ? styles.tokens.goldStrong : styles.tokens.cardBg }}>
          <Text style={{ color: discountType === 'amount' ? '#121212' : styles.tokens.textPrimary }}>$</Text>
        </Pressable>
        <Pressable onPress={() => setDiscountType('percent')} style={{ padding: 10, borderRadius: 8, backgroundColor: discountType === 'percent' ? styles.tokens.goldStrong : styles.tokens.cardBg }}>
          <Text style={{ color: discountType === 'percent' ? '#121212' : styles.tokens.textPrimary }}>%</Text>
        </Pressable>
      </View>
      <Text style={[styles.textGold, { fontSize: 22, fontWeight: '600', textAlign: 'right', marginTop: 8 }]}>
        ${finalDisplayPrice}
      </Text>
    </AppModal>
  );
}
