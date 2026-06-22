import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { formatTransactionType } from '@nail-couture/shared/utils/loyaltyTransactions';
import {
  getPaginationPageItems,
  LOYALTY_HISTORY_PAGE_SIZE,
  paginateRows,
} from '@nail-couture/shared/utils/pagination.js';

function formatTxDate(value) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function LoyaltyPointsHistoryPanel({
  rows,
  theme = 'dark',
  showBalance = false,
  title = 'Points History',
  titleClassName,
  containerClassName,
  containerStyle,
}) {
  const [currentPage, setCurrentPage] = useState(1);

  const pagination = useMemo(
    () => paginateRows(rows, currentPage, LOYALTY_HISTORY_PAGE_SIZE),
    [rows, currentPage],
  );

  useEffect(() => {
    if (currentPage > pagination.totalPages) {
      setCurrentPage(pagination.totalPages);
    }
  }, [currentPage, pagination.totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [rows]);

  const pageItems = useMemo(
    () => getPaginationPageItems(pagination.currentPage, pagination.totalPages),
    [pagination.currentPage, pagination.totalPages],
  );

  const labelMuted = theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40';
  const valueClass = theme === 'dark' ? 'text-offwhite font-medium text-sm' : 'text-charcoal font-medium text-sm';
  const pageBtnClass = (active) => clsx(
    'min-w-[2rem] px-2 py-1 text-xs font-medium rounded-lg border transition-colors',
    active
      ? theme === 'dark'
        ? 'border-gold bg-gold/15 text-gold'
        : 'border-gold bg-gold/10 text-gold'
      : theme === 'dark'
        ? 'border-gold/30 text-offwhite/60 hover:bg-gold/10'
        : 'border-gold/40 text-charcoal/70 hover:bg-gold/10',
  );

  return (
    <div className={containerClassName} style={containerStyle}>
      <div className={titleClassName ?? `${labelMuted} text-xs uppercase tracking-widest mb-6`}>
        {title}
      </div>

      <div className="space-y-3">
        {pagination.pageRows.map((tx) => (
          <div
            key={tx.id}
            className={`flex justify-between items-start py-3 border-b last:border-0 ${theme === 'dark' ? 'border-white/5' : 'border-charcoal/5'}`}
          >
            <div>
              <div className={valueClass}>
                {tx.description || formatTransactionType(tx.transaction_type)}
              </div>
              <div className={`${labelMuted} text-xs`}>
                {formatTxDate(tx.created_at)}
                {tx.redemption_code ? ` · ${showBalance ? `Code: ${tx.redemption_code}` : tx.redemption_code}` : ''}
              </div>
            </div>
            <div className="text-right shrink-0 ml-3">
              <span className={`font-heading text-sm ${tx.points >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                {tx.points >= 0 ? '+' : ''}{tx.points}
              </span>
              {showBalance ? (
                <div className={theme === 'dark' ? 'text-offwhite/30 text-xs' : 'text-charcoal/30 text-xs'}>
                  bal. {tx.balance_after}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {rows.length > LOYALTY_HISTORY_PAGE_SIZE ? (
        <>
          <p className={`${labelMuted} text-xs mt-4`}>
            Showing {pagination.rangeStart}–{pagination.rangeEnd} of {rows.length} transactions
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {pageItems.map((item, index) => (
              item === 'ellipsis' ? (
                <span key={`ellipsis-${index}`} className={`${labelMuted} px-1 text-xs`}>…</span>
              ) : (
                <button
                  key={item}
                  type="button"
                  className={pageBtnClass(item === pagination.currentPage)}
                  onClick={() => setCurrentPage(item)}
                  aria-label={`Page ${item}`}
                  aria-current={item === pagination.currentPage ? 'page' : undefined}
                >
                  {item}
                </button>
              )
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
