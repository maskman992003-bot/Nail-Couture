import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServices, updateService } from '../services/services';
import Navbar from './Navbar';
import StaffNav from './StaffNav';

export default function ServicesAdmin() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', price: '', duration_minutes: '' });
  const [saving, setSaving] = useState(false);

  const handleNavigate = (page) => {
    if (page === 'home') navigate('/');
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const data = await getServices();
      setServices(data);
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
      duration_minutes: service.duration_minutes?.toString() || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', description: '', price: '', duration_minutes: '' });
  };

  const saveEdit = async (serviceId) => {
    setSaving(true);
    const success = await updateService(serviceId, {
      name: editForm.name,
      description: editForm.description,
      price: parseFloat(editForm.price),
      duration_minutes: parseInt(editForm.duration_minutes)
    });

    if (success) {
      setServices((prev) => prev.map((s) =>
        s.id === serviceId
          ? { ...s, name: editForm.name, description: editForm.description, price: parseFloat(editForm.price), duration_minutes: parseInt(editForm.duration_minutes) }
          : s
      ));
      setEditingId(null);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex" style={{ backgroundColor: '#0a0a0a' }}>
        <StaffNav />
        <div className="flex-1 overflow-x-hidden">
          <Navbar currentPage="admin" onNavigate={handleNavigate} />
          <div className="flex items-center justify-center py-20 px-6">
            <div className="text-gold animate-pulse">Loading services...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0a0a0a' }}>
      <StaffNav />
      <div className="flex-1 overflow-x-hidden">
        <Navbar currentPage="admin" onNavigate={handleNavigate} />
        <div className="max-w-7xl mx-auto px-6 py-8 pb-24 lg:pb-8">
          <div className="mb-8">
            <h1 className="font-heading text-3xl text-gold mb-2">Service Editor</h1>
            <p className="text-offwhite/60">Manage services and pricing</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => {
              return (
                <div
                  key={service.id}
                  className="rounded-xl p-5 border border-gold/20 hover:border-gold/40 transition-all"
                  style={{ backgroundColor: '#1a1a1a' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-heading text-lg text-gold">{service.name}</h3>
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
        )}
      </div>
    </div>
  );
}