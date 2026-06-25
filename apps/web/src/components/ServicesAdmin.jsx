import { useState, useEffect } from 'react';
import { getServices, updateService, createService } from '@nail-couture/shared/services/services';
import Sidebar from './Sidebar';

export default function ServicesAdmin() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', price: '', duration_minutes: '', is_addon: false, category: '' });
  const [saving, setSaving] = useState(false);
  const [showAddOnModal, setShowAddOnModal] = useState(false);
  const [addOnForm, setAddOnForm] = useState({ name: '', price: '', duration_minutes: '' });
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const data = await getServices();
      // Filter services locally if we have a search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const filtered = data.filter(service => 
          service.name.toLowerCase().includes(term) ||
          (service.description && service.description.toLowerCase().includes(term)) ||
          service.category.toLowerCase().includes(term)
        );
        setServices(filtered);
      } else {
        setServices(data);
      }
    } catch (err) {
      console.error('Error fetching services:', err);
    }
    setLoading(false);
  };

  const startEdit = (service) => {
    setEditingId(service.id);
    setEditForm({
      name: service.name || '',
      description: service.description || '',
      price: service.price?.toString() || '',
      duration_minutes: service.duration_minutes?.toString() || '',
      is_addon: service.is_addon || false,
      category: service.category || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', description: '', price: '', duration_minutes: '', is_addon: false, category: '' });
  };

  const saveEdit = async (serviceId) => {
    setSaving(true);
    const success = await updateService(serviceId, {
      name: editForm.name,
      description: editForm.description,
      price: parseFloat(editForm.price),
      duration_minutes: parseInt(editForm.duration_minutes),
      is_addon: editForm.is_addon,
      category: editForm.category
    });

    if (success) {
      setServices((prev) => prev.map((s) =>
        s.id === serviceId
          ? { ...s, name: editForm.name, description: editForm.description, price: parseFloat(editForm.price), duration_minutes: parseInt(editForm.duration_minutes), is_addon: editForm.is_addon, category: editForm.category }
          : s
      ));
      setEditingId(null);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-primary text-primary transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading services...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-primary text-primary transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
      <Sidebar />
      <div className="max-w-7xl mx-auto px-6 py-8 mobile-page">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h1 className="font-heading text-3xl text-gold mb-2">Service Editor</h1>
                  <p className="text-offwhite/60">Manage services and pricing</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddOnModal(true)}
                    className="px-5 py-2.5 border border-gold/40 text-gold/80 hover:bg-gold hover:text-charcoal rounded-lg text-sm font-heading flex items-center gap-2 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add New Add-On
                  </button>
                  <div className="relative w-64">
                    <input
                      type="text"
                      placeholder="Search services..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        // Trigger re-filter when search term changes
                        fetchServices();
                      }}
                      className="w-full px-4 py-3 bg-offwhite/10 border border-offwhite/20 rounded-xl text-offwhite placeholder-offwhite/40 focus:border-gold focus:outline-none"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-offwhite/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 8a3 3 0 100 6 3 3 0 000-6z" />
                    </svg>
                  </div>
                </div>
              </div>

          {editingId ? (
            <div className="rounded-xl p-6" style={{ backgroundColor: '#1a1a1a' }}>
              <h2 className="font-heading text-xl text-gold mb-4">Edit Service</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-offwhite/60 text-xs block mb-1">Service Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-offwhite/60 text-xs block mb-1">Price ($)</label>
                  <input
                    type="number"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    className="w-full px-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="text-offwhite/60 text-xs block mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    value={editForm.duration_minutes}
                    onChange={(e) => setEditForm({ ...editForm, duration_minutes: e.target.value })}
                    className="w-full px-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-offwhite/60 text-xs block mb-1">Description</label>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-offwhite/60 text-xs block mb-1">Category</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg"
                  >
                    <option value="">No category</option>
                    <option value="manicure">Manicure</option>
                    <option value="pedicure">Pedicure</option>
                    <option value="nail_art">Nail Art</option>
                    <option value="addon">Add-On</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 md:col-span-2">
                  <label className="text-offwhite/60 text-xs flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.is_addon}
                      onChange={(e) => setEditForm({ ...editForm, is_addon: e.target.checked })}
                      className="w-5 h-5 accent-gold"
                    />
                    <span>Mark as Add-On</span>
                  </label>
                  {editForm.is_addon && (
                    <span className="text-xs px-3 py-1 rounded-full bg-gold/10 text-gold border border-gold/30">Add-on</span>
                  )}
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <button
                    onClick={() => saveEdit(editingId)}
                    disabled={saving}
                    className="flex-1 py-3 bg-gold text-charcoal font-heading hover:bg-gold/90 rounded-lg disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-6 py-3 border border-offwhite/30 text-offwhite/60 hover:text-offwhite rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-6 flex-wrap">
                {['all', 'manicure', 'pedicure', 'nail_art', 'addon'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-lg text-sm font-heading capitalize transition-all ${
                      filter === f ? 'bg-gold text-charcoal' : 'bg-offwhite/5 text-offwhite/60 hover:bg-offwhite/10'
                    }`}
                  >
                    {f === 'all' ? 'All Services' : f.replace('_', ' ')}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((service) => {
                  if (filter !== 'all' && service.category !== filter) return null;
                  return (
                    <div
                      key={service.id}
                      className="rounded-xl p-5 border border-gold/20 hover:border-gold/40 transition-all"
                      style={{ backgroundColor: '#1a1a1a' }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-2">
                          <h3 className="font-heading text-lg text-gold">{service.name}</h3>
                          {service.is_addon && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-gold/10 text-gold/70 border border-gold/20 mt-0.5">ADD-ON</span>
                          )}
                        </div>
                        <span className="font-heading text-xl text-offwhite">${service.price?.toFixed(0)}</span>
                      </div>
                      <p className="text-offwhite/50 text-xs mb-3">{service.description || 'No description'}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-offwhite/40 text-sm">{service.duration_minutes} min</span>
                        <button
                          onClick={() => startEdit(service)}
                          className="px-4 py-2 border border-gold/50 text-gold/80 hover:bg-gold hover:text-charcoal rounded-lg text-sm"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {showAddOnModal && (
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
              <div className="w-full max-w-md flex flex-col max-h-[min(90dvh,calc(100dvh-2rem))] bg-[#1a1a1a] rounded-t-2xl sm:rounded-xl overflow-hidden mx-0 sm:mx-4 border border-gold/10 shadow-2xl" style={{ borderColor: 'rgba(197,160,89,0.3)' }}>
                <div className="flex items-center justify-between gap-4 p-4 sm:p-6 border-b border-gold/10">
                  <h2 className="font-heading text-xl text-gold mb-0">Add New Add-On</h2>
                  <button onClick={() => setShowAddOnModal(false)} className="text-offwhite/40 hover:text-offwhite text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5">&times;</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  <div>
                    <label className="text-offwhite/60 text-xs block mb-1">Add-On Name</label>
                    <input
                      type="text"
                      value={addOnForm.name}
                      onChange={(e) => setAddOnForm({ ...addOnForm, name: e.target.value })}
                      placeholder="e.g. Nail Art Design"
                      className="w-full px-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-offwhite/60 text-xs block mb-1">Price ($)</label>
                    <input
                      type="number"
                      value={addOnForm.price}
                      onChange={(e) => setAddOnForm({ ...addOnForm, price: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="text-offwhite/60 text-xs block mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      value={addOnForm.duration_minutes}
                      onChange={(e) => setAddOnForm({ ...addOnForm, duration_minutes: e.target.value })}
                      placeholder="15"
                      className="w-full px-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={async () => {
                      if (!addOnForm.name || !addOnForm.price) return
                      const newSvc = await createService({
                        name: addOnForm.name,
                        price: parseFloat(addOnForm.price),
                        duration_minutes: parseInt(addOnForm.duration_minutes) || 15,
                        is_addon: true,
                        category: 'addon',
                        description: ''
                      })
                      if (newSvc) {
                        setServices((prev) => [...prev, newSvc])
                        setShowAddOnModal(false)
                        setAddOnForm({ name: '', price: '', duration_minutes: '' })
                      }
                    }}
                    className="flex-1 py-3 bg-gold text-charcoal font-heading hover:bg-gold/90 rounded-lg"
                  >
                    Add Add-On
                  </button>
                  <button
                    onClick={() => { setShowAddOnModal(false); setAddOnForm({ name: '', price: '', duration_minutes: '' }); }}
                    className="px-6 py-3 border border-offwhite/30 text-offwhite/60 hover:text-offwhite rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
)}
        </div>
    </div>
  );
}