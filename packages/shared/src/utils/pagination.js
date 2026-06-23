export const LOYALTY_HISTORY_PAGE_SIZE = 5;
export const GIFT_CARDS_PAGE_SIZE = 3;
export const VISIT_HISTORY_PAGE_SIZE = 6;
export const SALON_UPDATES_PAGE_SIZE = 3;
export const REVIEWS_PAGE_SIZE = 5;
export const ANNOUNCEMENTS_PAGE_SIZE = 5;

/**
 * Build numbered page items for pagination controls (1, 2, …, last).
 * @param {number} currentPage 1-based
 * @param {number} totalPages
 * @returns {(number | 'ellipsis')[]}
 */
export function getPaginationPageItems(currentPage, totalPages) {
  if (totalPages <= 0) return [];
  if (totalPages === 1) return [1];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage]);
  if (currentPage > 1) pages.add(currentPage - 1);
  if (currentPage < totalPages) pages.add(currentPage + 1);
  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
  }
  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const items = [];
  for (let index = 0; index < sorted.length; index += 1) {
    if (index > 0 && sorted[index] - sorted[index - 1] > 1) {
      items.push('ellipsis');
    }
    items.push(sorted[index]);
  }
  return items;
}

export function paginateRows(rows, currentPage, pageSize) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    currentPage: safePage,
    totalPages,
    pageRows: rows.slice(start, start + pageSize),
    rangeStart: rows.length === 0 ? 0 : start + 1,
    rangeEnd: Math.min(start + pageSize, rows.length),
  };
}
