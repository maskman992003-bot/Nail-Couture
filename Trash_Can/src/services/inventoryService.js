import { supabase } from '../lib/supabase';

export async function getAvailableRefreshments() {
  const { data, error } = await supabase
    .from('inventory')
    .select('item_name, quantity')
    .eq('category', 'refreshment')
    .gt('quantity', 0)
    .order('item_name');

  if (error) throw error;
  return data || [];
}

export function isRefreshmentAvailable(refreshmentName, availableRefreshments = []) {
  if (!refreshmentName) return true;
  return availableRefreshments.some((item) => item.item_name === refreshmentName);
}
