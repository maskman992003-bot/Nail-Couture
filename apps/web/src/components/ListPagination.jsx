import clsx from 'clsx';

export default function ListPagination({ pagination, onPageChange, className }) {
  if (pagination.totalPages <= 1) return null;

  const goToPreviousPage = () => {
    if (pagination.currentPage > 1) onPageChange(pagination.currentPage - 1);
  };

  const goToNextPage = () => {
    if (pagination.currentPage < pagination.totalPages) onPageChange(pagination.currentPage + 1);
  };

  return (
    <div className={clsx('flex items-center justify-between gap-3 px-4 py-3 bg-secondary rounded-xl border border-light', className)}>
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={goToPreviousPage}
          disabled={pagination.currentPage === 1}
          className={clsx(
            'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
            pagination.currentPage === 1 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-gold/10',
          )}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>
        <span className="text-primary/80 text-xs uppercase tracking-widest whitespace-nowrap">
          Page {pagination.currentPage} of {pagination.totalPages}
        </span>
        <button
          type="button"
          onClick={goToNextPage}
          disabled={pagination.currentPage === pagination.totalPages}
          className={clsx(
            'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
            pagination.currentPage === pagination.totalPages ? 'opacity-20 cursor-not-allowed' : 'hover:bg-gold/10',
          )}
        >
          Next
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className="relative shrink-0">
        <select
          value={pagination.currentPage}
          onChange={(e) => onPageChange(parseInt(e.target.value, 10))}
          aria-label="Select page"
          className="w-20 px-3 py-2 bg-input border-input border rounded-xl text-primary focus:border-gold focus:outline-none"
        >
          {[...Array(pagination.totalPages)].map((_, index) => (
            <option key={index + 1} value={index + 1}>
              {index + 1}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
