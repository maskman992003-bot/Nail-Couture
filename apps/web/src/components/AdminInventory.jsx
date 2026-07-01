import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import useRegisterPullToRefresh from '../hooks/useRegisterPullToRefresh';
import AppModal, {
  modalLabelClass,
  modalInputClass,
  modalSelectClass,
  modalBtnSecondary,
  modalBtnPrimary,
} from './AppModal';
import clsx from 'clsx';

const emptyForm = { item_name: '', category: 'material', quantity: '', unit: '', reorder_threshold: '' };

export default function AdminInventory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
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
    if (!addForm.item_name || !addForm.quantity || !addForm.unit) {
      setAddError('Name, quantity, and unit are required');
      return;
    }
    setAddLoading(true);
    setAddError('');
    try {
      const { error } = await supabase.from('inventory').insert({
        item_name: addForm.item_name.trim(),
        category: addForm.category,
        quantity: parseInt(addForm.quantity) || 0,
        unit: addForm.unit.trim(),
        reorder_threshold: parseInt(addForm.reorder_threshold) || 5,
      });
      if (error) throw error;
      setShowAddModal(false);
      setAddForm(emptyForm);
      fetchInventory(true);
    } catch (err) {
      setAddError(err.message || 'Failed to add item');
    } finally {
      setAddLoading(false);
    }
  };

  const fetchInventory = async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    try {
      const { data, error } = await supabase.from('inventory').select('*').order('item_name');
      if (error) {
        console.error('Supabase error:', error);
        return;
      }
      setInventory(data || []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
      if (isRefreshing) setRefreshing(false);
    }
  };

  const adjustStock = useCallback(async (id, delta) => {
    const item = inventory.find((s) => s.id === id);
    if (!item) return;
    if (item.quantity + delta < 0) return;

    const newQty = item.quantity + delta;
    setAdjustingId(id);
    showFeedback(id, delta > 0 ? 'plus' : 'minus');

     try {
       const { error } = await supabase
         .from('inventory')
         .update({ quantity: newQty })
         .eq('id', id);

       if (error) {
         console.error('Supabase update error:', error);
         showFeedback(id, 'error');
         return;
       }

       setInventory((prev) => prev.map((s) => (s.id === id ? { ...s, quantity: newQty } : s)));
       showFeedback(id, 'ok');
     } catch (err) {
       console.error('Error adjusting inventory:', err);
       showFeedback(id, 'error');
     } finally {
       setAdjustingId(null);
     }
  }, [inventory, showFeedback]);

  const saveQuantity = useCallback(async (id, newQty) => {
    if (newQty < 0) return;

    const item = inventory.find((s) => s.id === id);
    if (!item || item.quantity === newQty) return;

    setSavingId(id);

     try {
       const { error } = await supabase
         .from('inventory')
         .update({ quantity: newQty })
         .eq('id', id);

       if (error) {
         console.error('Supabase update error:', error);
         showFeedback(id, 'error');
         return;
       }

       setInventory((prev) => prev.map((s) => (s.id === id ? { ...s, quantity: newQty } : s)));
       showFeedback(id, 'ok');
     } catch (err) {
       console.error('Error saving quantity:', err);
       showFeedback(id, 'error');
     } finally {
       setSavingId(null);
     }
  }, [inventory, showFeedback]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!['admin', 'super_admin', 'owner', 'partner'].includes(user.role)) {
      navigate(user.role === 'technician' ? '/technician' : '/portal');
      return;
    }
     fetchInventory();
  }, [user, navigate]);

  const getStatus = (item) => {
    if (item.quantity === 0) return { label: 'Out of Stock', color: 'bg-red-900/50 text-red-300', dot: 'bg-red-500' };
    if (item.quantity <= item.reorder_threshold) return { label: 'Low Stock', color: 'bg-orange-900/50 text-orange-300', dot: 'bg-orange-400' };
    return { label: 'In Stock', color: 'bg-green-900/50 text-green-300', dot: 'bg-green-400' };
  };

  const filteredStock = inventory.filter((item) => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = inventory.filter((s) => s.quantity > 0 && s.quantity <= s.reorder_threshold).length;
  const outOfStockCount = inventory.filter((s) => s.quantity === 0).length;
  const offeredRefreshmentCount = inventory.filter((s) => s.category === 'refreshment' && s.quantity > 0).length;

  useRegisterPullToRefresh(() => fetchInventory(true));

  if (loading) {
    return (
      <div className="min-h-screen w-full transition-all duration-300 pl-sidebar bg-primary text-primary">
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full transition-all duration-300 pl-sidebar bg-primary text-primary">
      <div className="p-4 md:p-6 lg:p-8 mobile-page">
        <div className="px-4 sm:px-6 lg:px-8 py-6 border-b border-light flex-shrink-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="font-heading text-2xl sm:text-3xl text-gold">Inventory Management</h1>
              <p className="text-secondary text-sm mt-1">
                Track refreshments and materials in real time. Refreshments with stock appear in customer menus.
              </p>
              {offeredRefreshmentCount > 0 && (
                <p className="text-gold/70 text-xs mt-2">
                  {offeredRefreshmentCount} refreshment{offeredRefreshmentCount === 1 ? '' : 's'} currently offered to customers
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 shrink-0">
              {lowStockCount > 0 && (
                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg" style={{ backgroundColor: 'rgba(255, 165, 0, 0.1)', border: '1px solid rgba(255, 165, 0, 0.3)' }}>
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></div>
                  <span className="text-orange-300 text-sm font-medium">
                    <span className="sm:hidden">{lowStockCount} low</span>
                    <span className="hidden sm:inline">{lowStockCount} low inventory</span>
                  </span>
                </div>
              )}
              {outOfStockCount > 0 && (
                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg" style={{ backgroundColor: 'rgba(255, 0, 0, 0.1)', border: '1px solid rgba(255, 0, 0, 0.3)' }}>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-red-300 text-sm font-medium">
                    <span className="sm:hidden">{outOfStockCount} out</span>
                    <span className="hidden sm:inline">{outOfStockCount} out of inventory</span>
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => fetchInventory(true)}
                disabled={refreshing}
                className="px-3 py-2 bg-secondary border border-light rounded-lg text-secondary hover:border-theme transition-colors font-medium text-sm min-h-[44px] disabled:opacity-50"
              >
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
              <button
                onClick={() => { setAddForm(emptyForm); setAddError(''); setShowAddModal(true); }}
                className="px-4 py-2 bg-gold text-charcoal rounded-lg hover:bg-gold/90 transition-colors font-medium text-sm flex items-center gap-2 min-h-[44px]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Item
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 mobile-page">
          <div className="rounded-xl p-5 mb-6 bg-secondary border border-card">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 w-full sm:max-w-sm">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search items..."
                  className="w-full p-3 bg-input border border-input rounded-lg focus:border-gold focus:outline-none text-primary placeholder-text-muted text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {['all', 'refreshment', 'material'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={clsx(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                      filterCategory === cat 
                        ? 'text-charcoal border-transparent' 
                        : 'text-secondary border-light hover:text-primary'
                    )}
                    style={filterCategory === cat ? { background: 'linear-gradient(135deg, #c5a059, #f0d78c)' } : {}}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredStock.length === 0 ? (
            <div className="rounded-xl p-12 text-center bg-secondary border border-card">
              <div className="text-muted text-4xl mb-4">&#128230;</div>
              <h2 className="font-heading text-2xl text-primary mb-2">No Items Found</h2>
              <p className="text-secondary text-sm">No inventory items match your current search or filter.</p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden bg-secondary border border-card">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="text-muted text-xs uppercase tracking-widest border-b border-light">
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
                          className="border-b border-light transition-colors hover:bg-gold/5"
                        >
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-heading text-base text-primary">{item.item_name}</div>
                              <div className="text-muted text-xs mt-0.5">Min: {item.reorder_threshold} {item.unit}</div>
                              {item.category === 'refreshment' && (
                                <div className={clsx("text-xs mt-1", item.quantity > 0 ? 'text-gold/70' : 'text-muted')}>
                                  {item.quantity > 0 ? 'Offered to customers' : 'Hidden from customer menus'}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className="px-3 py-1 text-xs rounded-full border text-gold border-card"
                              style={{
                                backgroundColor: item.category === 'refreshment' ? 'rgba(197, 160, 89, 0.1)' : 'rgba(197, 160, 89, 0.06)',
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
                              className="w-20 text-center p-2 rounded-lg font-heading text-lg border border-light focus:border-gold focus:outline-none text-primary bg-secondary"
                              style={{ borderColor: savingId === item.id ? '#c5a059' : 'var(--border-light)' }}
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
                                className="w-9 h-9 rounded-lg border border-light flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:border-red-400/50 hover:text-red-400"
                                style={{
                                  borderColor: fb === 'minus' ? '#4ade80' : 'var(--border-light)',
                                  color: fb === 'minus' ? '#4ade80' : 'var(--text-primary)',
                                }}
                              >
                                {isAdjusting ? (
                                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                                )}
                              </button>
                              <span className="font-heading text-sm w-6 text-center text-primary">{item.quantity}</span>
                              <button
                                onClick={() => adjustStock(item.id, 1)}
                                disabled={isAdjusting}
                                className="w-9 h-9 rounded-lg border border-light flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:border-green-400/50 hover:text-green-400"
                                style={{
                                  borderColor: fb === 'plus' ? '#4ade80' : 'var(--border-light)',
                                  color: fb === 'plus' ? '#4ade80' : 'var(--text-primary)',
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
        <AppModal
          open
          onClose={() => setShowAddModal(false)}
          title="Add New Item"
          maxWidth="max-w-md"
          zIndex="z-[100]"
          footer={
            <>
              <button type="button" onClick={() => setShowAddModal(false)} className={modalBtnSecondary}>
                Cancel
              </button>
              <button type="submit" form="add-inventory-form" disabled={addLoading} className={modalBtnPrimary}>
                {addLoading ? 'Adding...' : 'Add Item'}
              </button>
            </>
          }
        >
          <form id="add-inventory-form" onSubmit={handleAddItem} className="space-y-4">
            <div>
              <label className={modalLabelClass}>Item Name *</label>
              <input
                type="text"
                value={addForm.item_name}
                onChange={(e) => setAddForm({ ...addForm, item_name: e.target.value })}
                placeholder="e.g. OPI Nail Polish"
                className={modalInputClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={modalLabelClass}>Category</label>
                <select
                  value={addForm.category}
                  onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                  className={modalSelectClass}
                >
                  <option value="material">Material</option>
                  <option value="refreshment">Refreshment</option>
                </select>
              </div>
              <div>
                <label className={modalLabelClass}>Unit *</label>
                <input
                  type="text"
                  value={addForm.unit}
                  onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                  placeholder="e.g. bottle"
                  className={modalInputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={modalLabelClass}>Initial Quantity *</label>
                <input
                  type="number"
                  min={0}
                  value={addForm.quantity}
                  onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                  placeholder="0"
                  className={modalInputClass}
                />
              </div>
              <div>
                <label className={modalLabelClass}>Low Stock Alert</label>
                <input
                  type="number"
                  min={0}
                  value={addForm.reorder_threshold}
                  onChange={(e) => setAddForm({ ...addForm, reorder_threshold: e.target.value })}
                  placeholder="5"
                  className={modalInputClass}
                />
              </div>
            </div>
            {addError && <p className="text-red-500 text-sm">{addError}</p>}
          </form>
        </AppModal>
      )}
    </div>
  );
}
