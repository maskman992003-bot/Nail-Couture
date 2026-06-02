import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from './Sidebar'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import clsx from 'clsx';
import AppModal, {
  modalLabelClass,
  modalInputClass,
  modalSelectClass,
  modalBtnSecondary,
  modalBtnPrimary,
  modalBtnDanger,
} from './AppModal';

export default function AdminServices() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState('services');
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', duration_minutes: '', category: '', });
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [catForm, setCatForm] = useState({ name: '', sort_order: '' });
  const [catEditing, setCatEditing] = useState(null);
  const [catSaving, setCatSaving] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchServices(); fetchCategories(); }, []);

  const fetchServices = async () => {
    setLoading(true);
    const { data } = await supabase.from('services').select('*').order('category').order('name');
    if (data) setServices(data);
    setLoading(false);
  };

  const filteredServices = services.filter(service => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return true;
    return (
      service.name.toLowerCase().includes(search) ||
      (service.category || '').toLowerCase().includes(search) ||
      String(service.price || '').includes(search) ||
      String(service.duration_minutes || '').includes(search)
    );
  });

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('service_categories').select('*').order('sort_order');
    if (error) {
      console.error('fetchCategories error:', error);
      setCategories([]);
    } else {
      setCategories(data || []);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', price: '', duration_minutes: '', category: categories[0]?.name || '' });
    setShowForm(true);
  };

  const openEdit = (svc) => {
    setEditing(svc.id);
    setForm({
      name: svc.name,
      price: String(svc.price || ''),
      duration_minutes: String(svc.duration_minutes || ''),
      category: svc.category || categories[0]?.name || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    setSaving(true);
    setApiError('');
    const currentUser = user || {};
    const payload = {
      name: form.name,
      price: parseFloat(form.price),
      duration_minutes: parseInt(form.duration_minutes) || 0,
      category: form.category,
    };
    let result;
    if (editing) {
      result = await supabase.rpc('manage_service', {
        admin_phone: currentUser.phone,
        action: 'update',
        service_data: payload,
        service_id: editing,
      });
    } else {
      result = await supabase.rpc('manage_service', {
        admin_phone: currentUser.phone,
        action: 'insert',
        service_data: payload,
        service_id: null,
      });
    }
    setSaving(false);
    if (result.error) { setApiError(result.error.message); return; }
    setShowForm(false);
    fetchServices();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setApiError('');
    const currentUser = user || {};
    const { error } = await supabase.rpc('manage_service', {
      admin_phone: currentUser.phone,
      action: 'delete', service_data: {}, service_id: deleteTarget.id,
    });
    setDeleting(false);
    if (error) {
      setApiError(error.message);
      setDeleteTarget(null);
      return;
    }
    setDeleteTarget(null);
    fetchServices();
  };

  const catOpenAdd = () => {
    setCatEditing(null);
    setCatForm({ name: '', sort_order: String((categories.length || 0) + 1) });
    setShowCatForm(true);
  };

  const catOpenEdit = (cat) => {
    setCatEditing(cat.id);
    setCatForm({ name: cat.name, sort_order: String(cat.sort_order) });
    setShowCatForm(true);
  };

  const catHandleSave = async () => {
    if (!catForm.name) return;
    setCatSaving(true);
    setApiError('');
    const currentUser = user || {};
    let result;
    if (catEditing) {
      result = await supabase.rpc('manage_service_category', {
        admin_phone: currentUser.phone,
        action: 'update',
        category_name: catForm.name,
        category_id: catEditing,
        new_sort_order: parseInt(catForm.sort_order) || 0,
      });
    } else {
      result = await supabase.rpc('manage_service_category', {
        admin_phone: currentUser.phone,
        action: 'insert',
        category_name: catForm.name,
        category_id: null,
        new_sort_order: parseInt(catForm.sort_order) || 0,
      });
    }
    setCatSaving(false);
    if (result.error) { setApiError(result.error.message); return; }
    setShowCatForm(false);
    setCatEditing(null);
    setCatForm({ name: '', sort_order: '' });
    fetchCategories();
  };

  const catHandleDelete = async (id) => {
    if (!confirm('Delete this category? Services using it will keep the text value.')) return;
    setApiError('');
    const currentUser = user || {};
    const { error } = await supabase.rpc('manage_service_category', {
      admin_phone: currentUser.phone,
      action: 'delete', category_id: id,
    });
    if (error) { setApiError(error.message); return; }
    fetchCategories();
  };

  return (
    <div className="min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 bg-primary text-primary">
      <Sidebar />
      
      <div className="admin-services p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
        <div className="px-4 sm:px-6 lg:px-8 py-6 border-b border-light">
          <h1 className="font-heading text-3xl text-gold">Services Management</h1>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-4 flex gap-2 border-b border-light">
          <button onClick={() => setActiveSubTab('services')} className={clsx(
            "px-4 py-2 rounded-lg font-medium transition-colors",
            activeSubTab === 'services' 
              ? 'bg-gold text-charcoal' 
              : 'bg-input text-secondary hover:bg-input/80'
          )}>Services</button>
          <button onClick={() => setActiveSubTab('categories')} className={clsx(
            "px-4 py-2 rounded-lg font-medium transition-colors",
            activeSubTab === 'categories' 
              ? 'bg-gold text-charcoal' 
              : 'bg-input text-secondary hover:bg-input/80'
          )}>Categories</button>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {activeSubTab === 'services' && (
            <div className="bg-secondary border-card border rounded-xl p-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
                <div>
                  <h2 className="font-heading text-xl text-primary">All Services</h2>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Search services..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 bg-input border-input border rounded-lg focus:border-gold focus:outline-none text-sm text-primary placeholder-text-muted"
                  />
                  <button onClick={openAdd} className="px-4 py-2 bg-gold text-charcoal rounded-lg hover:bg-gold/90 transition-colors text-sm font-medium whitespace-nowrap">+ Add Service</button>
                </div>
              </div>

              <AppModal
                open={showForm}
                onClose={() => { setShowForm(false); setEditing(null); }}
                title={editing ? 'Edit Service' : 'Add Service'}
                maxWidth="max-w-md"
                zIndex="z-[100]"
                footer={
                  <>
                    <button
                      type="button"
                      onClick={() => { setShowForm(false); setEditing(null); }}
                      className={modalBtnSecondary}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || !form.name || !form.price}
                      className={modalBtnPrimary}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </>
                }
              >
                <div className="space-y-4">
                  {apiError && (
                    <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-600 dark:text-red-300 text-sm">
                      {apiError}
                    </div>
                  )}
                  <div>
                    <label className={modalLabelClass}>Name</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className={modalInputClass}
                      placeholder="Service name"
                    />
                  </div>
                  <div>
                    <label className={modalLabelClass}>Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className={modalInputClass}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className={modalLabelClass}>Duration (min)</label>
                    <input
                      type="number"
                      value={form.duration_minutes}
                      onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                      className={modalInputClass}
                      placeholder="60"
                    />
                  </div>
                  <div>
                    <label className={modalLabelClass}>Category</label>
                    <div className="relative">
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className={`${modalSelectClass} pr-10`}
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <svg
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold pointer-events-none"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </AppModal>

              {apiError && !showForm && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm">{apiError}</div>}

              {loading ? (
                <div className="text-muted text-center py-12">Loading services...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-muted text-sm border-b border-light">
                        <th className="text-left py-3 px-4">Name</th>
                        <th className="text-left py-3 px-4">Category</th>
                        <th className="text-left py-3 px-4">Price</th>
                        <th className="text-left py-3 px-4">Duration</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredServices.map(svc => (
                        <tr key={svc.id} className="border-b border-light hover:bg-gold/5">
                          <td className="py-3 px-4 font-medium text-primary">{svc.name}</td>
                          <td className="py-3 px-4 text-secondary">{svc.category || '—'}</td>
                          <td className="py-3 px-4 text-gold">${parseFloat(svc.price).toFixed(2)}</td>
                          <td className="py-3 px-4 text-secondary">{svc.duration_minutes || 0} min</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <button onClick={() => openEdit(svc)} className="text-gold hover:underline text-sm">Edit</button>
                              <button onClick={() => setDeleteTarget(svc)} className="text-red-400 hover:underline text-sm">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredServices.length === 0 && <tr><td colSpan="5" className="py-8 text-center text-muted">No services found</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'categories' && (
            <div className="bg-secondary border-card border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-xl text-primary">Service Categories</h2>
                <button onClick={catOpenAdd} className="px-4 py-2 bg-gold text-charcoal rounded-lg hover:bg-gold/90 transition-colors">+ Add Category</button>
              </div>

              {showCatForm && (
                <div className="mb-6 p-4 rounded-xl border border-card bg-input">
                  <h3 className="text-gold font-heading mb-4">{catEditing ? 'Edit Category' : 'Add Category'}</h3>
                  {apiError && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm">{apiError}</div>}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-muted text-xs mb-1">Name</label>
                      <input value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} className="w-full px-3 py-2 bg-secondary border border-light rounded-lg text-sm text-primary" placeholder="Category name" />
                    </div>
                    <div>
                      <label className="block text-muted text-xs mb-1">Sort Order</label>
                      <input type="number" value={catForm.sort_order} onChange={e => setCatForm({...catForm, sort_order: e.target.value})} className="w-full px-3 py-2 bg-secondary border border-light rounded-lg text-sm text-primary" placeholder="1" />
                    </div>
                    <div className="flex items-end gap-2">
                      <button onClick={catHandleSave} disabled={catSaving || !catForm.name} className="px-4 py-2 bg-gold text-charcoal rounded-lg hover:bg-gold/90 disabled:opacity-50 transition-colors">{catSaving ? 'Saving...' : 'Save'}</button>
                      <button onClick={() => { setShowCatForm(false); setCatEditing(null); setCatForm({ name: '', sort_order: '' }); setApiError(''); }} className="px-4 py-2 bg-input text-primary hover:bg-input/80 rounded-lg transition-colors">Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-muted text-sm border-b border-light">
                      <th className="text-left py-3 px-4">Name</th>
                      <th className="text-left py-3 px-4">Sort Order</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(cat => (
                      <tr key={cat.id} className="border-b border-light hover:bg-gold/5">
                        <td className="py-3 px-4 font-medium text-primary">{cat.name}</td>
                        <td className="py-3 px-4 text-secondary">{cat.sort_order}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <button onClick={() => catOpenEdit(cat)} className="text-gold hover:underline text-sm">Edit</button>
                            <button onClick={() => catHandleDelete(cat.id)} className="text-red-400 hover:underline text-sm">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {categories.length === 0 && <tr><td colSpan="3" className="py-8 text-center text-muted">No categories found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden border border-card shadow-2xl bg-card p-5 sm:p-6">
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="font-heading text-xl text-primary mb-2">Delete Service?</h3>
                <p className="text-secondary text-sm">
                  Are you sure you want to delete <span className="text-gold-strong font-medium">{deleteTarget.name}</span>?
                </p>
                <p className="text-secondary text-xs mt-2">
                  Existing bookings will keep the service name as text. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="flex-1 py-3 bg-input text-primary hover:bg-input/80 rounded-xl transition-colors text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className={modalBtnDanger}
                >
                  {deleting ? 'Deleting...' : 'Delete Service'}
                </button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
