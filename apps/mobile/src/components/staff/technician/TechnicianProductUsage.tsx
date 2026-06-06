import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { featureFlags } from '@nail-couture/shared/constants/featureFlags.js';
import {
  fetchMaterialInventory,
  fetchAppointmentUsageLogs,
} from '@nail-couture/shared/utils/inventoryUsage.js';
import { ScrollSelect } from '../../forms/ScrollSelect';
import type { SelectOption } from '../../../constants/birthdayOptions';
import { useThemeStyles } from '../../../theme/useThemeStyles';
import type { TechnicianAppointment } from './types';

type InventoryItem = {
  id: string;
  item_name?: string;
  quantity?: number;
  unit?: string;
};

type UsageLog = {
  id: string;
  quantity_changed?: number;
  reason?: string;
  inventory?: { item_name?: string };
};

type TechnicianProductUsageProps = {
  appointment: TechnicianAppointment;
  onLogUsage: (payload: { inventoryId: string; quantity: number; logType: string }) => Promise<{ success?: boolean; error?: string }>;
  saving?: boolean;
};

export function TechnicianProductUsage({
  appointment,
  onLogUsage,
  saving = false,
}: TechnicianProductUsageProps) {
  const styles = useThemeStyles();
  const [materials, setMaterials] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const usageEnabled = featureFlags.operations.usageLogging;
  const wasteEnabled = featureFlags.operations.wasteTracking;

  useEffect(() => {
    if (!usageEnabled) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchMaterialInventory(), fetchAppointmentUsageLogs(appointment.id)])
      .then(([inv, usageLogs]) => {
        if (cancelled) return;
        setMaterials(inv);
        setLogs(usageLogs);
        if (inv.length > 0) setSelectedId(inv[0].id);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appointment.id, usageEnabled]);

  if (!usageEnabled) return null;

  const materialOptions: SelectOption[] = materials.map((m) => ({
    value: m.id,
    label: `${m.item_name} (${m.quantity ?? 0} ${m.unit || 'units'})`,
  }));

  const selected = materials.find((m) => m.id === selectedId);
  const maxQty = selected?.quantity ?? 0;
  const qtyNum = Math.max(1, parseInt(quantity, 10) || 1);

  const handleLog = async (logType: string) => {
    if (!selectedId || qtyNum < 1) return;
    setMsg('');
    const result = await onLogUsage({ inventoryId: selectedId, quantity: qtyNum, logType });
    if (result?.success) {
      setMsg(logType === 'waste' ? 'Waste logged' : 'Usage logged');
      const [inv, usageLogs] = await Promise.all([
        fetchMaterialInventory(),
        fetchAppointmentUsageLogs(appointment.id),
      ]);
      setMaterials(inv);
      setLogs(usageLogs);
      setQuantity('1');
    } else {
      setMsg(result?.error || 'Failed to log');
    }
  };

  if (loading) {
    return (
      <View style={{ marginTop: 16 }}>
        <ActivityIndicator color={styles.tokens.goldStrong} size="small" />
      </View>
    );
  }

  if (materials.length === 0) {
    return (
      <View style={[styles.card, { padding: 12, marginTop: 16, backgroundColor: styles.tokens.inputBg }]}>
        <Text style={[styles.textSecondary, { fontSize: 12 }]}>
          No material inventory items — add products in Admin Inventory.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 16 }}>
      <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1, marginBottom: 8 }]}>
        PRODUCT USAGE
      </Text>
      <View style={{ gap: 8 }}>
        <ScrollSelect
          value={selectedId}
          onChange={setSelectedId}
          options={materialOptions}
          placeholder="Select product"
        />
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
          style={[styles.input, { textAlign: 'center' }]}
          placeholder="Qty"
          placeholderTextColor={styles.tokens.textMuted}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => handleLog('usage')}
            disabled={saving || maxQty < qtyNum}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: `${styles.tokens.goldStrong}22`,
              borderWidth: 1,
              borderColor: `${styles.tokens.goldStrong}44`,
              alignItems: 'center',
              opacity: saving || maxQty < qtyNum ? 0.5 : 1,
            }}
          >
            <Text style={styles.textGold}>Log usage</Text>
          </Pressable>
          {wasteEnabled ? (
            <Pressable
              onPress={() => handleLog('waste')}
              disabled={saving || maxQty < qtyNum}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: '#ef444422',
                borderWidth: 1,
                borderColor: '#ef444444',
                alignItems: 'center',
                opacity: saving || maxQty < qtyNum ? 0.5 : 1,
              }}
            >
              <Text style={{ color: '#f87171' }}>Log waste</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      {maxQty < qtyNum ? (
        <Text style={{ color: '#fbbf24', fontSize: 12, marginTop: 4 }}>Only {maxQty} in stock</Text>
      ) : null}
      {msg ? (
        <Text
          style={{
            fontSize: 12,
            marginTop: 4,
            color: msg.includes('logged') ? '#4ade80' : '#f87171',
          }}
        >
          {msg}
        </Text>
      ) : null}
      {logs.length > 0 ? (
        <ScrollView style={{ maxHeight: 96, marginTop: 8 }} nestedScrollEnabled>
          {logs.map((log) => (
            <View
              key={log.id}
              style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 4 }}
            >
              <Text style={[styles.textSecondary, { fontSize: 11, flex: 1 }]} numberOfLines={1}>
                {log.inventory?.item_name || 'Item'} {log.quantity_changed}
              </Text>
              <Text style={[styles.textSecondary, { fontSize: 11 }]}>{log.reason}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}
