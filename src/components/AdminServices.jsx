import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Sidebar from './Sidebar';

export default function AdminServices() {
  const [activeSubTab, setActiveSubTab] = useState('services');
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', duration_minutes: '', category: '', });
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');

  const [catForm, setCatForm] = useState({ name: '', sort_order: '' });
  const [catEditing, setCatEditing] = useState(null);
  const [catSaving, setCatSaving] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);

  useEffect(() => { fetchServices(); fetchCategories(); }, []);

  const fetchServices = async () => {
    setLoading(true);
    const { data } = await supabase.from('services').select('*').order('category').order('name');
    if (data) setServices(data);
    setLoading(false);
  };

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
    const currentUser = JSON.parse(localStorage.getItem('salon_user_data') || '{}');
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

  const handleDelete = async (id) => {
    if (!confirm('Delete this service? This cannot be undone.')) return;
    setApiError('');
    const currentUser = JSON.parse(localStorage.getItem('salon_user_data') || '{}');
    const { error } = await supabase.rpc('manage_service', {
      admin_phone: currentUser.phone,
      action: 'delete', service_data: {}, service_id: id,
    });
    if (error) { setApiError(error.message); return; }
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
    const currentUser = JSON.parse(localStorage.getItem('salon_user_data') || '{}');
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
    const currentUser = JSON.parse(localStorage.getItem('salon_user_data') || '{}');
    const { error } = await supabase.rpc('manage_service_category', {
      admin_phone: currentUser.phone,
      action: 'delete', category_id: id,
    });
    if (error) { setApiError(error.message); return; }
    fetchCategories();
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
        <div className="px-4 sm:px-6 lg:px-8 py-6 border-b" style={{ borderColor: 'rgba(197, 160, 89, 0.1)' }}>
          <h1 className="font-heading text-3xl text-gold">Services Management</h1>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-4 flex gap-2 border-b" style={{ borderColor: 'rgba(197, 160, 89, 0.1)' }}>
          <button onClick={() => setActiveSubTab('services')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeSubTab === 'services' ? 'bg-gold text-charcoal' : 'bg-offwhite/10 text-offwhite/60 hover:bg-offwhite/20'}`}>Services</button>
          <button onClick={() => setActiveSubTab('categories')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeSubTab === 'categories' ? 'bg-gold text-charcoal' : 'bg-offwhite/10 text-offwhite/60 hover:bg-offwhite/20'}`}>Categories</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pb-24 lg:pb-8">
          {activeSubTab === 'services' && (
            <div className="bg-offwhite/5 border border-gold/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-xl text-offwhite">All Services</h2>
                <button onClick={openAdd} className="px-4 py-2 bg-gold text-charcoal rounded-lg hover:bg-gold/90 transition-colors">+ Add Service</button>
              </div>

              {showForm && (
                <div className="mb-6 p-4 bg-offwhite/10 rounded-xl border border-gold/30">
                  <h3 className="text-gold font-heading mb-4">{editing ? 'Edit Service' : 'Add Service'}</h3>
                  {apiError && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm">{apiError}</div>}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-offwhite/60 text-xs mb-1">Name</label>
                      <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg text-sm" placeholder="Service name" />
                    </div>
                    <div>
                      <label className="block text-offwhite/60 text-xs mb-1">Price</label>
                      <input type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full px-3 py-2 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg text-sm" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-offwhite/60 text-xs mb-1">Duration (min)</label>
                      <input type="number" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: e.target.value})} className="w-full px-3 py-2 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg text-sm" placeholder="60" />
                    </div>
                    <div>
                      <label className="block text-offwhite/60 text-xs mb-1">Category</label>
                      <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-3 py-2 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg text-sm">
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleSave} disabled={saving || !form.name || !form.price} className="px-6 py-2 bg-gold text-charcoal rounded-lg hover:bg-gold/90 disabled:opacity-50 transition-colors">{saving ? 'Saving...' : 'Save'}</button>
                    <button onClick={() => setShowForm(false)} className="px-6 py-2 border border-offwhite/30 text-offwhite/60 hover:text-offwhite rounded-lg transition-colors">Cancel</button>
                  </div>
                </div>
              )}

              {apiError && !showForm && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm">{apiError}</div>}

              {loading ? (
                <div className="text-offwhite/40 text-center py-12">Loading services...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-offwhite/50 text-sm border-b border-offwhite/10">
                        <th className="text-left py-3 px-4">Name</th>
                        <th className="text-left py-3 px-4">Category</th>
                      <th className="text-left py-3 px-4">Price</th>
                      <th className="text-left py-3 px-4">Duration</th>
                      <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map(svc => (
                        <tr key={svc.id} className="border-b border-offwhite/5 hover:bg-offwhite/5">
                          <td className="py-3 px-4 text-offwhite font-medium">{svc.name}</td>
                          <td className="py-3 px-4 text-offwhite/60">{svc.category || '—'}</td>
                          <td className="py-3 px-4 text-gold">${parseFloat(svc.price).toFixed(2)}</td>
                        <td className="py-3 px-4 text-offwhite/60">{svc.duration_minutes || 0} min</td>
                        <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <button onClick={() => openEdit(svc)} className="text-gold hover:underline text-sm">Edit</button>
                              <button onClick={() => handleDelete(svc.id)} className="text-red-400 hover:underline text-sm">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {services.length === 0 && <tr><td colSpan="5" className="py-8 text-center text-offwhite/40">No services found</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'categories' && (
            <div className="bg-offwhite/5 border border-gold/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-xl text-offwhite">Service Categories</h2>
                <button onClick={catOpenAdd} className="px-4 py-2 bg-gold text-charcoal rounded-lg hover:bg-gold/90 transition-colors">+ Add Category</button>
              </div>

              {showCatForm && (
                <div className="mb-6 p-4 bg-offwhite/10 rounded-xl border border-gold/30">
                  <h3 className="text-gold font-heading mb-4">{catEditing ? 'Edit Category' : 'Add Category'}</h3>
                  {apiError && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm">{apiError}</div>}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-offwhite/60 text-xs mb-1">Name</label>
                      <input value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} className="w-full px-3 py-2 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg text-sm" placeholder="Category name" />
                    </div>
                    <div>
                      <label className="block text-offwhite/60 text-xs mb-1">Sort Order</label>
                      <input type="number" value={catForm.sort_order} onChange={e => setCatForm({...catForm, sort_order: e.target.value})} className="w-full px-3 py-2 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg text-sm" placeholder="1" />
                    </div>
                    <div className="flex items-end gap-2">
                      <button onClick={catHandleSave} disabled={catSaving || !catForm.name} className="px-4 py-2 bg-gold text-charcoal rounded-lg hover:bg-gold/90 disabled:opacity-50 transition-colors">{catSaving ? 'Saving...' : 'Save'}</button>
                      <button onClick={() => { setShowCatForm(false); setCatEditing(null); setCatForm({ name: '', sort_order: '' }); setApiError(''); }} className="px-4 py-2 border border-offwhite/30 text-offwhite/60 hover:text-offwhite rounded-lg transition-colors">Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-offwhite/50 text-sm border-b border-offwhite/10">
                      <th className="text-left py-3 px-4">Name</th>
                      <th className="text-left py-3 px-4">Sort Order</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(cat => (
                      <tr key={cat.id} className="border-b border-offwhite/5 hover:bg-offwhite/5">
                        <td className="py-3 px-4 text-offwhite font-medium">{cat.name}</td>
                        <td className="py-3 px-4 text-offwhite/60">{cat.sort_order}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <button onClick={() => catOpenEdit(cat)} className="text-gold hover:underline text-sm">Edit</button>
                            <button onClick={() => catHandleDelete(cat.id)} className="text-red-400 hover:underline text-sm">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {categories.length === 0 && <tr><td colSpan="3" className="py-8 text-center text-offwhite/40">No categories found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
