import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { linesToChecklist, checklistToLines } from '@nail-couture/shared/utils/serviceChecklist.js';
import { useAuth } from '../../contexts/AuthContext';
import { StaffScreenLayout } from '../../components/staff/StaffScreenLayout';
import { AppModal, ModalButton } from '../../components/AppModal';
import { ScrollSelect } from '../../components/forms/ScrollSelect';
import { useThemeStyles } from '../../theme/useThemeStyles';

type ServiceRecord = {
  id: number;
  name: string;
  price: number;
  duration_minutes?: number;
  category?: string;
  metadata?: { checklist?: string[] };
};

type CategoryRecord = {
  id: number;
  name: string;
  sort_order?: number;
};

export function AdminServicesScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const [activeSubTab, setActiveSubTab] = useState<'services' | 'categories'>('services');
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', price: '', duration_minutes: '', category: '', checklistLines: '' });
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ServiceRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [showCatForm, setShowCatForm] = useState(false);
  const [catEditing, setCatEditing] = useState<number | null>(null);
  const [catForm, setCatForm] = useState({ name: '', sort_order: '' });
  const [catSaving, setCatSaving] = useState(false);
  const [catDeleteTarget, setCatDeleteTarget] = useState<CategoryRecord | null>(null);

  const fetchServices = useCallback(async () => {
    const { data } = await getSupabase().from('services').select('*').order('category').order('name');
    setServices((data as ServiceRecord[]) || []);
    setLoading(false);
  }, []);

  const fetchCategories = useCallback(async () => {
    const { data } = await getSupabase().from('service_categories').select('*').order('sort_order');
    setCategories((data as CategoryRecord[]) || []);
  }, []);

  useEffect(() => {
    fetchServices();
    fetchCategories();
  }, [fetchServices, fetchCategories]);

  const filteredServices = services.filter((service) => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return true;
    return (
      service.name.toLowerCase().includes(search) ||
      (service.category || '').toLowerCase().includes(search) ||
      String(service.price || '').includes(search)
    );
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', price: '', duration_minutes: '', category: categories[0]?.name || '', checklistLines: '' });
    setApiError('');
    setShowForm(true);
  };

  const openEdit = (svc: ServiceRecord) => {
    setEditing(svc.id);
    setForm({
      name: svc.name,
      price: String(svc.price || ''),
      duration_minutes: String(svc.duration_minutes || ''),
      category: svc.category || categories[0]?.name || '',
      checklistLines: checklistToLines(svc.metadata?.checklist),
    });
    setApiError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    setSaving(true);
    setApiError('');
    const payload = {
      name: form.name,
      price: parseFloat(form.price),
      duration_minutes: parseInt(form.duration_minutes) || 0,
      category: form.category,
      metadata: { checklist: linesToChecklist(form.checklistLines) },
    };
    const result = editing
      ? await getSupabase().rpc('manage_service', { admin_phone: user?.phone, action: 'update', service_data: payload, service_id: editing })
      : await getSupabase().rpc('manage_service', { admin_phone: user?.phone, action: 'insert', service_data: payload, service_id: null });
    setSaving(false);
    if (result.error) { setApiError(result.error.message); return; }
    setShowForm(false);
    fetchServices();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await getSupabase().rpc('manage_service', {
      admin_phone: user?.phone,
      action: 'delete',
      service_data: null,
      service_id: deleteTarget.id,
    });
    setDeleting(false);
    if (!error) {
      setDeleteTarget(null);
      fetchServices();
    }
  };

  const handleCatSave = async () => {
    if (!catForm.name) return;
    setCatSaving(true);
    const result = catEditing
      ? await getSupabase().rpc('manage_service_category', {
          admin_phone: user?.phone,
          action: 'update',
          category_name: catForm.name,
          category_id: catEditing,
          new_sort_order: parseInt(catForm.sort_order) || 0,
        })
      : await getSupabase().rpc('manage_service_category', {
          admin_phone: user?.phone,
          action: 'insert',
          category_name: catForm.name,
          category_id: null,
          new_sort_order: parseInt(catForm.sort_order) || categories.length,
        });
    setCatSaving(false);
    if (!result.error) {
      setShowCatForm(false);
      setCatEditing(null);
      fetchCategories();
      fetchServices();
    }
  };

  const handleCatDelete = async () => {
    if (!catDeleteTarget) return;
    await getSupabase().rpc('manage_service_category', {
      admin_phone: user?.phone,
      action: 'delete',
      category_name: catDeleteTarget.name,
      category_id: catDeleteTarget.id,
      new_sort_order: null,
    });
    setCatDeleteTarget(null);
    fetchCategories();
  };

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

  const categoryOptions = categories.map((c) => ({ value: c.name, label: c.name }));

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
      title="Services"
      subtitle="Manage pricing and categories"
      headerRight={
        <Pressable
          onPress={() => (activeSubTab === 'services' ? openAdd() : (setCatEditing(null), setCatForm({ name: '', sort_order: '' }), setShowCatForm(true)))}
          style={{ backgroundColor: styles.tokens.goldStrong, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}
        >
          <Text style={{ color: '#121212', fontWeight: '600', fontSize: 13 }}>+ Add</Text>
        </Pressable>
      }
    >
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {(['services', 'categories'] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveSubTab(tab)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: activeSubTab === tab ? styles.tokens.goldStrong : styles.tokens.cardBg,
              borderWidth: 1,
              borderColor: styles.tokens.borderLight,
            }}
          >
            <Text style={{ color: activeSubTab === tab ? '#121212' : styles.tokens.textSecondary, fontWeight: '600' }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeSubTab === 'services' ? (
        <>
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search services..."
            placeholderTextColor={styles.tokens.textMuted}
            style={inputStyle}
          />
          {filteredServices.map((svc) => (
            <View key={svc.id} style={[styles.card, { padding: 14, marginBottom: 10 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.textPrimary, { fontWeight: '600' }]}>{svc.name}</Text>
                  <Text style={styles.textSecondary}>
                    {svc.category} · {svc.duration_minutes || 0} min
                  </Text>
                </View>
                <Text style={[styles.textGold, { fontSize: 18, fontWeight: '600' }]}>${svc.price}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                <Pressable onPress={() => openEdit(svc)}>
                  <Text style={styles.textGold}>Edit</Text>
                </Pressable>
                <Pressable onPress={() => setDeleteTarget(svc)}>
                  <Text style={{ color: '#f87171' }}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      ) : (
        categories.map((cat) => (
          <View key={cat.id} style={[styles.card, { padding: 14, marginBottom: 10 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.textPrimary, { fontWeight: '600' }]}>{cat.name}</Text>
              <Text style={styles.textSecondary}>Order: {cat.sort_order ?? 0}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
              <Pressable onPress={() => { setCatEditing(cat.id); setCatForm({ name: cat.name, sort_order: String(cat.sort_order || 0) }); setShowCatForm(true); }}>
                <Text style={styles.textGold}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => setCatDeleteTarget(cat)}>
                <Text style={{ color: '#f87171' }}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      <AppModal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Service' : 'Add Service'}
        scrollBody
        footer={
          <>
            <ModalButton label="Cancel" onPress={() => setShowForm(false)} />
            <ModalButton label={saving ? 'Saving...' : 'Save'} onPress={handleSave} disabled={saving} />
          </>
        }
      >
        <Text style={styles.textSecondary}>Name *</Text>
        <TextInput value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} style={inputStyle} placeholderTextColor={styles.tokens.textMuted} />
        <Text style={styles.textSecondary}>Price *</Text>
        <TextInput value={form.price} onChangeText={(v) => setForm({ ...form, price: v })} keyboardType="decimal-pad" style={inputStyle} placeholderTextColor={styles.tokens.textMuted} />
        <Text style={styles.textSecondary}>Duration (minutes)</Text>
        <TextInput value={form.duration_minutes} onChangeText={(v) => setForm({ ...form, duration_minutes: v })} keyboardType="number-pad" style={inputStyle} placeholderTextColor={styles.tokens.textMuted} />
        {categoryOptions.length > 0 && (
          <>
            <Text style={styles.textSecondary}>Category</Text>
            <ScrollSelect options={categoryOptions} value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
          </>
        )}
        <Text style={[styles.textSecondary, { marginTop: 8 }]}>Checklist (one item per line)</Text>
        <TextInput value={form.checklistLines} onChangeText={(v) => setForm({ ...form, checklistLines: v })} multiline style={[inputStyle, { minHeight: 80, textAlignVertical: 'top' }]} placeholderTextColor={styles.tokens.textMuted} />
        {apiError ? <Text style={{ color: '#f87171' }}>{apiError}</Text> : null}
      </AppModal>

      <AppModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Service?"
        subtitle={`Remove "${deleteTarget?.name}" permanently?`}
        footer={
          <>
            <ModalButton label="Cancel" onPress={() => setDeleteTarget(null)} />
            <ModalButton label={deleting ? 'Deleting...' : 'Delete'} variant="danger" onPress={handleDelete} disabled={deleting} />
          </>
        }
      />

      <AppModal
        open={showCatForm}
        onClose={() => setShowCatForm(false)}
        title={catEditing ? 'Edit Category' : 'Add Category'}
        footer={
          <>
            <ModalButton label="Cancel" onPress={() => setShowCatForm(false)} />
            <ModalButton label={catSaving ? 'Saving...' : 'Save'} onPress={handleCatSave} disabled={catSaving} />
          </>
        }
      >
        <Text style={styles.textSecondary}>Name</Text>
        <TextInput value={catForm.name} onChangeText={(v) => setCatForm({ ...catForm, name: v })} style={inputStyle} placeholderTextColor={styles.tokens.textMuted} />
        <Text style={styles.textSecondary}>Sort Order</Text>
        <TextInput value={catForm.sort_order} onChangeText={(v) => setCatForm({ ...catForm, sort_order: v })} keyboardType="number-pad" style={inputStyle} placeholderTextColor={styles.tokens.textMuted} />
      </AppModal>

      <AppModal
        open={!!catDeleteTarget}
        onClose={() => setCatDeleteTarget(null)}
        title="Delete Category?"
        subtitle={`Remove "${catDeleteTarget?.name}"?`}
        footer={
          <>
            <ModalButton label="Cancel" onPress={() => setCatDeleteTarget(null)} />
            <ModalButton label="Delete" variant="danger" onPress={handleCatDelete} />
          </>
        }
      />
    </StaffScreenLayout>
  );
}
