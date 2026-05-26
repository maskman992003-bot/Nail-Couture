import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Sidebar from './Sidebar';

export default function AdminServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', duration_minutes: '', category: 'Nails', is_addon: false });
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => { fetchServices(); }, []);

  const fetchServices = async () => {
    setLoading(true);
    const { data } = await supabase.from('services').select('*').order('category').order('name');
    if (data) setServices(data);
    setLoading(false);
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', price: '', duration_minutes: '', category: 'Nails', is_addon: false });
    setShowForm(true);
  };

  const openEdit = (svc) => {
    setEditing(svc.id);
    setForm({
      name: svc.name,
      price: String(svc.price || ''),
      duration_minutes: String(svc.duration_minutes || ''),
      category: svc.category || 'Nails',
      is_addon: svc.is_addon || false,
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
      is_addon: form.is_addon,
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
    if (result.error) {
      setApiError(result.error.message);
      return;
    }
    setShowForm(false);
    fetchServices();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this service? This cannot be undone.')) return;
    setApiError('');
    const currentUser = JSON.parse(localStorage.getItem('salon_user_data') || '{}');
    const { error } = await supabase.rpc('manage_service', {
      admin_phone: currentUser.phone,
      action: 'delete',
      service_data: {},
      service_id: id,
    });
    if (error) { setApiError(error.message); return; }
    fetchServices();
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
        <div className="px-4 sm:px-6 lg:px-8 py-6 border-b" style={{ borderColor: 'rgba(197, 160, 89, 0.1)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-3xl text-gold">Services Management</h1>
              <p className="text-offwhite/60 text-sm mt-1">Add, edit, or remove services offered</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pb-24 lg:pb-8">
          <div className="bg-offwhite/5 border border-gold/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl text-offwhite">All Services</h2>
              <button onClick={openAdd} className="px-4 py-2 bg-gold text-charcoal rounded-lg hover:bg-gold/90 transition-colors">
                + Add Service
              </button>
            </div>

            {showForm && (
              <div className="mb-6 p-4 bg-offwhite/10 rounded-xl border border-gold/30">
                <h3 className="text-gold font-heading mb-4">{editing ? 'Edit Service' : 'Add Service'}</h3>
                {apiError && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm">{apiError}</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
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
                      <option value="Nails">Nails</option>
                      <option value="Pedicure">Pedicure</option>
                      <option value="Waxing">Waxing</option>
                      <option value="Lashes">Lashes</option>
                      <option value="Brows">Brows</option>
                      <option value="Packages">Packages</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.is_addon} onChange={e => setForm({...form, is_addon: e.target.checked})} className="accent-gold" />
                      <span className="text-offwhite/60 text-sm">Add-on</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSave} disabled={saving || !form.name || !form.price} className="px-6 py-2 bg-gold text-charcoal rounded-lg hover:bg-gold/90 disabled:opacity-50 transition-colors">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setShowForm(false)} className="px-6 py-2 border border-offwhite/30 text-offwhite/60 hover:text-offwhite rounded-lg transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {apiError && !showForm && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm">{apiError}</div>
            )}

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
                      <th className="text-left py-3 px-4">Type</th>
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
                          <span className={`px-2 py-1 text-xs rounded ${svc.is_addon ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {svc.is_addon ? 'Add-on' : 'Main'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <button onClick={() => openEdit(svc)} className="text-gold hover:underline text-sm">Edit</button>
                            <button onClick={() => handleDelete(svc.id)} className="text-red-400 hover:underline text-sm">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {services.length === 0 && (
                      <tr><td colSpan="6" className="py-8 text-center text-offwhite/40">No services found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
