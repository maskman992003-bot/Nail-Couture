import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';

const emptyForm = { name: '', category: 'material', quantity: '', unit: '', min_stock_alert: '' };

export default function AdminStock() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stock, setStock] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [adjustingId, setAdjustingId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [feedback, setFeedback] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const showFeedback = useCallback((id, type) => {
    setFeedback((prev) => ({ ...prev, [id]: type }));
    setTimeout(() => setFeedback((prev) => ({ ...prev, [id]: null })), 1200);
  }, []);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!addForm.name || !addForm.quantity || !addForm.unit) {
      setAddError('Name, quantity, and unit are required');
      return;
    }
    setAddLoading(true);
    setAddError('');
    try {
      const { error } = await supabase.from('stock').insert({
        name: addForm.name.trim(),
        category: addForm.category,
        quantity: parseInt(addForm.quantity) || 0,
        unit: addForm.unit.trim(),
        min_stock_alert: parseInt(addForm.min_stock_alert) || 5,
      });
      if (error) throw error;
      setShowAddModal(false);
      setAddForm(emptyForm);
      fetchStock(true);
    } catch (err) {
      setAddError(err.message || 'Failed to add item');
    } finally {
      setAddLoading(false);
    }
  };

  const fetchStock = async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    try {
      const { data, error } = await supabase.from('stock').select('*').order('name');
      if (error) {
        console.error('Supabase error:', error);
        return;
      }
      setStock(data || []);
    } catch (err) {
      console.error('Error fetching stock:', err);
    } finally {
      setLoading(false);
      if (isRefreshing) setRefreshing(false);
    }
  };

  const adjustStock = useCallback(async (id, delta) => {
    const item = stock.find((s) => s.id === id);
    if (!item) return;
    if (item.quantity + delta < 0) return;

    const newQty = item.quantity + delta;
    setAdjustingId(id);
    showFeedback(id, delta > 0 ? 'plus' : 'minus');

    try {
      const { error } = await supabase
        .from('stock')
        .update({ quantity: newQty })
        .eq('id', id);

      if (error) {
        console.error('Supabase update error:', error);
        showFeedback(id, 'error');
        return;
      }

      setStock((prev) => prev.map((s) => (s.id === id ? { ...s, quantity: newQty } : s)));
      showFeedback(id, 'ok');
    } catch (err) {
      console.error('Error adjusting stock:', err);
      showFeedback(id, 'error');
    } finally {
      setAdjustingId(null);
    }
  }, [stock, showFeedback]);

  const saveQuantity = useCallback(async (id, newQty) => {
    if (newQty < 0) return;

    const item = stock.find((s) => s.id === id);
    if (!item || item.quantity === newQty) return;

    setSavingId(id);

    try {
      const { error } = await supabase
        .from('stock')
        .update({ quantity: newQty })
        .eq('id', id);

      if (error) {
        console.error('Supabase update error:', error);
        showFeedback(id, 'error');
        return;
      }

      setStock((prev) => prev.map((s) => (s.id === id ? { ...s, quantity: newQty } : s)));
      showFeedback(id, 'ok');
    } catch (err) {
      console.error('Error saving quantity:', err);
      showFeedback(id, 'error');
    } finally {
      setSavingId(null);
    }
  }, [stock, showFeedback]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!['admin', 'super_admin', 'owner', 'partner'].includes(user.role)) {
      navigate(user.role === 'technician' ? '/technician' : '/portal');
      return;
    }
    fetchStock();
  }, [user, navigate]);

  const getStatus = (item) => {
    if (item.quantity === 0) return { label: 'Out of Stock', color: 'bg-red-900/50 text-red-300', dot: 'bg-red-500' };
    if (item.quantity <= item.min_stock_alert) return { label: 'Low Stock', color: 'bg-orange-900/50 text-orange-300', dot: 'bg-orange-400' };
    return { label: 'In Stock', color: 'bg-green-900/50 text-green-300', dot: 'bg-green-400' };
  };

  const filteredStock = stock.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = stock.filter((s) => s.quantity > 0 && s.quantity <= s.min_stock_alert).length;
  const outOfStockCount = stock.filter((s) => s.quantity === 0).length;

  if (loading) {
    return (
      <div className="flex h-screen" style={{ backgroundColor: '#0a0a0a' }}>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gold animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-8 py-6 border-b flex-shrink-0" style={{ borderColor: 'rgba(197, 160, 89, 0.1)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-3xl text-gold">Inventory Management</h1>
              <p className="text-offwhite/60 text-sm mt-1">Track refreshments and materials in real time</p>
            </div>
            <div className="flex items-center gap-4">
              {lowStockCount > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: 'rgba(255, 165, 0, 0.1)', border: '1px solid rgba(255, 165, 0, 0.3)' }}>
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></div>
                  <span className="text-orange-300 text-sm font-medium">{lowStockCount} low stock</span>
                </div>
              )}
              {outOfStockCount > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: 'rgba(255, 0, 0, 0.1)', border: '1px solid rgba(255, 0, 0, 0.3)' }}>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-red-300 text-sm font-medium">{outOfStockCount} out of stock</span>
                </div>
              )}
              <button
                onClick={() => { setAddForm(emptyForm); setAddError(''); setShowAddModal(true); }}
                className="px-4 py-2 bg-gold text-charcoal rounded-lg hover:bg-gold/90 transition-colors font-medium text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Item
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(197, 160, 89, 0.1)' }}>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 w-full sm:max-w-sm">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search items..."
                  className="w-full p-3 bg-offwhite/10 border border-offwhite/10 text-offwhite placeholder-offwhite/30 rounded-lg focus:border-gold focus:outline-none text-sm"
                />
              </div>
              <div className="flex gap-2">
                {['all', 'refreshment', 'material'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filterCategory === cat
                        ? 'text-charcoal'
                        : 'text-offwhite/60 border hover:text-offwhite'
                    }`}
                    style={filterCategory === cat ? { background: 'linear-gradient(135deg, #c5a059, #f0d78c)' } : { borderColor: 'rgba(255,255,255,0.1)' }}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredStock.length === 0 ? (
            <div className="rounded-xl p-12 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="text-offwhite/30 text-4xl mb-4">&#128230;</div>
              <h2 className="font-heading text-2xl text-offwhite mb-2">No Items Found</h2>
              <p className="text-offwhite/50 text-sm">No stock items match your current search or filter.</p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(197, 160, 89, 0.1)' }}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="text-offwhite/40 text-xs uppercase tracking-widest border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      <th className="px-6 py-4 text-left font-medium">Item</th>
                      <th className="px-6 py-4 text-left font-medium">Category</th>
                      <th className="px-6 py-4 text-center font-medium">Quantity</th>
                      <th className="px-6 py-4 text-center font-medium">Adjust</th>
                      <th className="px-6 py-4 text-center font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStock.map((item) => {
                      const status = getStatus(item);
                      const isAdjusting = adjustingId === item.id;
                      const isSaving = savingId === item.id;
                      const fb = feedback[item.id];

                      return (
                        <tr
                          key={item.id}
                          className="border-b transition-colors hover:bg-white/3"
                          style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                        >
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-offwhite font-heading text-base">{item.name}</div>
                              <div className="text-offwhite/40 text-xs mt-0.5">Min: {item.min_stock_alert} {item.unit}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className="px-3 py-1 text-xs rounded-full border"
                              style={{
                                backgroundColor: item.category === 'refreshment' ? 'rgba(197, 160, 89, 0.1)' : 'rgba(197, 160, 89, 0.06)',
                                borderColor: 'rgba(197, 160, 89, 0.3)',
                                color: '#c5a059',
                              }}
                            >
                              {item.category === 'refreshment' ? 'Refreshment' : 'Material'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              min={0}
                              defaultValue={item.quantity}
                              key={`qty-${item.id}-${item.quantity}`}
                              onBlur={(e) => saveQuantity(item.id, parseInt(e.target.value) || 0)}
                              className="w-20 text-center p-2 rounded-lg text-offwhite font-heading text-lg border focus:border-gold focus:outline-none"
                              style={{ backgroundColor: '#111', borderColor: savingId === item.id ? '#c5a059' : 'rgba(255,255,255,0.1)' }}
                            />
                            {isSaving && <div className="text-gold text-[10px] mt-0.5 animate-pulse">saving...</div>}
                            {fb === 'ok' && !isSaving && <div className="text-green-400 text-[10px] mt-0.5">saved</div>}
                            {fb === 'error' && <div className="text-red-400 text-[10px] mt-0.5">failed</div>}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => adjustStock(item.id, -1)}
                                disabled={item.quantity === 0 || isAdjusting}
                                className="w-9 h-9 rounded-lg border flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:border-red-400/50 hover:text-red-400"
                                style={{
                                  borderColor: fb === 'minus' ? '#4ade80' : 'rgba(255,255,255,0.1)',
                                  color: fb === 'minus' ? '#4ade80' : '#e2e8f0',
                                }}
                              >
                                {isAdjusting ? (
                                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                                )}
                              </button>
                              <span className="text-offwhite font-heading text-sm w-6 text-center">{item.quantity}</span>
                              <button
                                onClick={() => adjustStock(item.id, 1)}
                                disabled={isAdjusting}
                                className="w-9 h-9 rounded-lg border flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:border-green-400/50 hover:text-green-400"
                                style={{
                                  borderColor: fb === 'plus' ? '#4ade80' : 'rgba(255,255,255,0.1)',
                                  color: fb === 'plus' ? '#4ade80' : '#e2e8f0',
                                }}
                              >
                                {isAdjusting ? (
                                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${status.dot}`}></div>
                              <span className={`px-3 py-1 text-xs rounded-full border ${status.color}`}>
                                {status.label}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-md rounded-2xl p-8 border-2" style={{ backgroundColor: '#111', borderColor: 'rgba(197, 160, 89, 0.4)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-2xl text-gold">Add New Item</h2>
              <button onClick={() => setShowAddModal(false)} className="text-offwhite/40 hover:text-offwhite text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors">&times;</button>
            </div>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="text-offwhite/40 text-xs uppercase tracking-widest block mb-2">Item Name *</label>
                <input type="text" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="e.g. OPI Nail Polish" className="w-full p-3 bg-offwhite/10 border border-offwhite/10 text-offwhite placeholder-offwhite/20 rounded-lg focus:border-gold focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-offwhite/40 text-xs uppercase tracking-widest block mb-2">Category</label>
                  <select value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} className="w-full p-3 bg-offwhite/10 border border-offwhite/10 text-offwhite rounded-lg focus:border-gold focus:outline-none appearance-none cursor-pointer" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23c5a059' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}>
                    <option value="material" style={{ backgroundColor: '#111', color: '#c5a059' }}>Material</option>
                    <option value="refreshment" style={{ backgroundColor: '#111', color: '#c5a059' }}>Refreshment</option>
                  </select>
                </div>
                <div>
                  <label className="text-offwhite/40 text-xs uppercase tracking-widest block mb-2">Unit *</label>
                  <input type="text" value={addForm.unit} onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })} placeholder="e.g. bottle" className="w-full p-3 bg-offwhite/10 border border-offwhite/10 text-offwhite placeholder-offwhite/20 rounded-lg focus:border-gold focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-offwhite/40 text-xs uppercase tracking-widest block mb-2">Initial Quantity *</label>
                  <input type="number" min={0} value={addForm.quantity} onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })} placeholder="0" className="w-full p-3 bg-offwhite/10 border border-offwhite/10 text-offwhite rounded-lg focus:border-gold focus:outline-none" />
                </div>
                <div>
                  <label className="text-offwhite/40 text-xs uppercase tracking-widest block mb-2">Low Stock Alert</label>
                  <input type="number" min={0} value={addForm.min_stock_alert} onChange={(e) => setAddForm({ ...addForm, min_stock_alert: e.target.value })} placeholder="5" className="w-full p-3 bg-offwhite/10 border border-offwhite/10 text-offwhite rounded-lg focus:border-gold focus:outline-none" />
                </div>
              </div>
              {addError && <p className="text-red-400 text-sm">{addError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-offwhite/10 text-offwhite rounded-lg hover:bg-offwhite/20 transition-colors">Cancel</button>
                <button type="submit" disabled={addLoading} className="flex-1 py-3 bg-gold text-charcoal rounded-lg hover:bg-gold/90 transition-colors font-medium disabled:opacity-50">
                  {addLoading ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}