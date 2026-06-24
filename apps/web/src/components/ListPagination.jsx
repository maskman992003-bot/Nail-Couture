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
    <div
      className={clsx(
        'flex flex-col gap-3 px-3 py-3 sm:px-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 bg-secondary rounded-xl border border-light',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 sm:justify-start sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={goToPreviousPage}
          disabled={pagination.currentPage === 1}
          aria-label="Previous page"
          className={clsx(
            'flex items-center gap-2 px-2 py-2 sm:px-3 rounded-lg transition-all shrink-0',
            pagination.currentPage === 1 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-gold/10',
          )}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Previous</span>
        </button>
        <span className="text-primary/80 text-xs uppercase tracking-widest whitespace-nowrap text-center">
          <span className="sm:hidden">
            {pagination.currentPage} / {pagination.totalPages}
          </span>
          <span className="hidden sm:inline">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
        </span>
        <button
          type="button"
          onClick={goToNextPage}
          disabled={pagination.currentPage === pagination.totalPages}
          aria-label="Next page"
          className={clsx(
            'flex items-center gap-2 px-2 py-2 sm:px-3 rounded-lg transition-all shrink-0',
            pagination.currentPage === pagination.totalPages ? 'opacity-20 cursor-not-allowed' : 'hover:bg-gold/10',
          )}
        >
          <span className="hidden sm:inline">Next</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className="flex items-center justify-center gap-2 sm:justify-end shrink-0">
        <span className="text-primary/60 text-xs sm:hidden">Go to page</span>
        <select
          value={pagination.currentPage}
          onChange={(e) => onPageChange(parseInt(e.target.value, 10))}
          aria-label="Select page"
          className="w-full max-w-[5rem] sm:w-20 px-3 py-2 bg-input border-input border rounded-xl text-primary focus:border-gold focus:outline-none"
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
