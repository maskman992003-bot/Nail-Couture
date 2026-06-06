import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { StaffScreenLayout } from '../../components/staff/StaffScreenLayout';
import { AppModal, ModalButton } from '../../components/AppModal';
import { Icon } from '../../components/icons/Icon';
import { useThemeStyles } from '../../theme/useThemeStyles';

type InventoryItem = {
  id: string;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  reorder_threshold: number;
};

const EMPTY_FORM = { item_name: '', category: 'material', quantity: '', unit: '', reorder_threshold: '' };

function getStatus(item: InventoryItem) {
  if (item.quantity === 0) return { label: 'Out of Stock', color: '#f87171' };
  if (item.quantity <= item.reorder_threshold) return { label: 'Low Stock', color: '#fb923c' };
  return { label: 'In Stock', color: '#4ade80' };
}

export function AdminInventoryScreen() {
  const styles = useThemeStyles();
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [qtyEdits, setQtyEdits] = useState<Record<string, string>>({});

  const fetchInventory = useCallback(async () => {
    const { data } = await getSupabase().from('inventory').select('*').order('item_name');
    setInventory((data as InventoryItem[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const adjustStock = async (id: string, delta: number) => {
    const item = inventory.find((s) => s.id === id);
    if (!item || item.quantity + delta < 0) return;
    setAdjustingId(id);
    const newQty = item.quantity + delta;
    const { error } = await getSupabase().from('inventory').update({ quantity: newQty }).eq('id', id);
    if (!error) {
      setInventory((prev) => prev.map((s) => (s.id === id ? { ...s, quantity: newQty } : s)));
    }
    setAdjustingId(null);
  };

  const saveQuantity = async (id: string, newQty: number) => {
    if (newQty < 0) return;
    const item = inventory.find((s) => s.id === id);
    if (!item || item.quantity === newQty) return;
    setAdjustingId(id);
    const { error } = await getSupabase().from('inventory').update({ quantity: newQty }).eq('id', id);
    if (!error) {
      setInventory((prev) => prev.map((s) => (s.id === id ? { ...s, quantity: newQty } : s)));
    }
    setAdjustingId(null);
  };

  const handleAddItem = async () => {
    if (!addForm.item_name || !addForm.quantity || !addForm.unit) {
      setAddError('Name, quantity, and unit are required');
      return;
    }
    setAddLoading(true);
    setAddError('');
    try {
      const { error } = await getSupabase().from('inventory').insert({
        item_name: addForm.item_name.trim(),
        category: addForm.category,
        quantity: parseInt(addForm.quantity) || 0,
        unit: addForm.unit.trim(),
        reorder_threshold: parseInt(addForm.reorder_threshold) || 5,
      });
      if (error) throw error;
      setShowAddModal(false);
      setAddForm(EMPTY_FORM);
      fetchInventory();
    } catch (err) {
      setAddError((err as Error).message || 'Failed to add item');
    }
    setAddLoading(false);
  };

  const filteredStock = inventory.filter((item) => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = inventory.filter((s) => s.quantity > 0 && s.quantity <= s.reorder_threshold).length;
  const outOfStockCount = inventory.filter((s) => s.quantity === 0).length;

  if (loading) {
    return (
      <StaffScreenLayout>
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <ActivityIndicator color={styles.tokens.goldStrong} />
        </View>
      </StaffScreenLayout>
    );
  }

  const inputStyle = {
    backgroundColor: styles.tokens.inputBg,
    borderColor: styles.tokens.borderLight,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: styles.tokens.textPrimary,
    marginBottom: 12,
  };

  return (
    <StaffScreenLayout
      title="Inventory"
      subtitle="Track refreshments and materials"
      headerRight={
        <Pressable
          onPress={() => { setAddForm(EMPTY_FORM); setAddError(''); setShowAddModal(true); }}
          style={{ backgroundColor: styles.tokens.goldStrong, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}
        >
          <Text style={{ color: '#121212', fontWeight: '600', fontSize: 13 }}>+ Add</Text>
        </Pressable>
      }
    >
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {lowStockCount > 0 && (
            <Text style={{ color: '#fb923c', fontSize: 12 }}>{lowStockCount} low stock</Text>
          )}
          {outOfStockCount > 0 && (
            <Text style={{ color: '#f87171', fontSize: 12 }}>{outOfStockCount} out of stock</Text>
          )}
        </View>
      )}

      <TextInput
        value={searchTerm}
        onChangeText={setSearchTerm}
        placeholder="Search items..."
        placeholderTextColor={styles.tokens.textMuted}
        style={inputStyle}
      />

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {(['all', 'refreshment', 'material'] as const).map((cat) => (
          <Pressable
            key={cat}
            onPress={() => setFilterCategory(cat)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: filterCategory === cat ? styles.tokens.goldStrong : styles.tokens.cardBg,
              borderWidth: 1,
              borderColor: styles.tokens.borderLight,
            }}
          >
            <Text style={{ color: filterCategory === cat ? '#121212' : styles.tokens.textSecondary, fontSize: 13 }}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {filteredStock.length === 0 ? (
        <View style={[styles.card, { padding: 32, alignItems: 'center' }]}>
          <Text style={styles.textSecondary}>No items found</Text>
        </View>
      ) : (
        filteredStock.map((item) => {
          const status = getStatus(item);
          const qtyValue = qtyEdits[item.id] ?? String(item.quantity);
          return (
            <View key={item.id} style={[styles.card, { padding: 14, marginBottom: 10 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.textPrimary, { fontWeight: '600' }]}>{item.item_name}</Text>
                  <Text style={styles.textSecondary}>
                    {item.category} · Min: {item.reorder_threshold} {item.unit}
                  </Text>
                  {item.category === 'refreshment' && (
                    <Text style={{ color: item.quantity > 0 ? styles.tokens.goldStrong : styles.tokens.textMuted, fontSize: 11, marginTop: 2 }}>
                      {item.quantity > 0 ? 'Offered to customers' : 'Hidden from menus'}
                    </Text>
                  )}
                </View>
                <Text style={{ color: status.color, fontSize: 12, fontWeight: '600' }}>{status.label}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable
                  onPress={() => adjustStock(item.id, -1)}
                  disabled={item.quantity === 0 || adjustingId === item.id}
                  style={{ width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: styles.tokens.borderLight, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="minus" size={18} color={styles.tokens.textPrimary} />
                </Pressable>
                <TextInput
                  value={qtyValue}
                  onChangeText={(v) => setQtyEdits((prev) => ({ ...prev, [item.id]: v }))}
                  onBlur={() => saveQuantity(item.id, parseInt(qtyValue) || 0)}
                  keyboardType="number-pad"
                  style={{
                    width: 56,
                    textAlign: 'center',
                    backgroundColor: styles.tokens.inputBg,
                    borderRadius: 8,
                    paddingVertical: 6,
                    color: styles.tokens.textPrimary,
                    borderWidth: 1,
                    borderColor: styles.tokens.borderLight,
                  }}
                />
                <Pressable
                  onPress={() => adjustStock(item.id, 1)}
                  disabled={adjustingId === item.id}
                  style={{ width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: styles.tokens.borderLight, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="plus" size={18} color={styles.tokens.textPrimary} />
                </Pressable>
              </View>
            </View>
          );
        })
      )}

      <AppModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Item"
        scrollBody
        footer={
          <>
            <ModalButton label="Cancel" onPress={() => setShowAddModal(false)} />
            <ModalButton label={addLoading ? 'Adding...' : 'Add Item'} onPress={handleAddItem} disabled={addLoading} />
          </>
        }
      >
        <Text style={[styles.textSecondary, { marginBottom: 4 }]}>Item Name *</Text>
        <TextInput value={addForm.item_name} onChangeText={(v) => setAddForm({ ...addForm, item_name: v })} style={inputStyle} placeholder="e.g. OPI Nail Polish" placeholderTextColor={styles.tokens.textMuted} />
        <Text style={[styles.textSecondary, { marginBottom: 4 }]}>Category</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {(['material', 'refreshment'] as const).map((cat) => (
            <Pressable key={cat} onPress={() => setAddForm({ ...addForm, category: cat })} style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: addForm.category === cat ? styles.tokens.goldStrong : styles.tokens.cardBg, alignItems: 'center' }}>
              <Text style={{ color: addForm.category === cat ? '#121212' : styles.tokens.textPrimary }}>{cat}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.textSecondary, { marginBottom: 4 }]}>Unit *</Text>
        <TextInput value={addForm.unit} onChangeText={(v) => setAddForm({ ...addForm, unit: v })} style={inputStyle} placeholder="e.g. bottle" placeholderTextColor={styles.tokens.textMuted} />
        <Text style={[styles.textSecondary, { marginBottom: 4 }]}>Initial Quantity *</Text>
        <TextInput value={addForm.quantity} onChangeText={(v) => setAddForm({ ...addForm, quantity: v })} keyboardType="number-pad" style={inputStyle} placeholder="0" placeholderTextColor={styles.tokens.textMuted} />
        <Text style={[styles.textSecondary, { marginBottom: 4 }]}>Low Stock Alert</Text>
        <TextInput value={addForm.reorder_threshold} onChangeText={(v) => setAddForm({ ...addForm, reorder_threshold: v })} keyboardType="number-pad" style={inputStyle} placeholder="5" placeholderTextColor={styles.tokens.textMuted} />
        {addError ? <Text style={{ color: '#f87171', fontSize: 13 }}>{addError}</Text> : null}
      </AppModal>
    </StaffScreenLayout>
  );
}
