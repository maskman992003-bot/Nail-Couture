/**
 * Shared service category grouping and tab building for kiosk, portal, and public menus.
 */

import { isServiceBookable, isServiceMenuVisible } from './serviceVisibility.js';

export function groupServicesByCategory(services, { excludeAddons = true, bookableOnly = false } = {}) {
  return (services || []).reduce((acc, service) => {
    if (bookableOnly && !isServiceBookable(service)) return acc;
    if (excludeAddons && !isServiceMenuVisible(service)) return acc;
    const category = service.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {});
}

export function sortCategoryNames(categoryNames, dbCategories = []) {
  const categoryOrder = (dbCategories || []).map((c) => (typeof c === 'string' ? c : c.name));
  const orderMap = new Map(categoryOrder.map((name, index) => [name, index]));

  return [...categoryNames].sort((a, b) => {
    const aIdx = orderMap.has(a) ? orderMap.get(a) : 999;
    const bIdx = orderMap.has(b) ? orderMap.get(b) : 999;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.localeCompare(b);
  });
}

export function buildCategoryTabs(services, dbCategories = [], { excludeAddons = true, bookableOnly = false } = {}) {
  const grouped = groupServicesByCategory(services, { excludeAddons, bookableOnly });
  const sortedCategories = sortCategoryNames(Object.keys(grouped), dbCategories);
  return {
    grouped,
    sortedCategories,
    categoryTabs: ['All', ...sortedCategories],
  };
}

export function getDisplayCategories(activeCategory, sortedCategories) {
  if (activeCategory === 'All') return sortedCategories;
  return sortedCategories.filter((c) => c === activeCategory);
}

export async function fetchServiceCategories(supabase) {
  const { data } = await supabase
    .from('service_categories')
    .select('*')
    .order('sort_order', { ascending: true });
  return data || [];
}
