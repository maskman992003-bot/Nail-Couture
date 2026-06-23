import { useEffect, useMemo, useState } from 'react';
import { formatTransactionType } from '@nail-couture/shared/utils/loyaltyTransactions';
import {
  LOYALTY_HISTORY_PAGE_SIZE,
  paginateRows,
} from '@nail-couture/shared/utils/pagination.js';
import ListPagination from '../ListPagination.jsx';

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

  const labelMuted = theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40';
  const valueClass = theme === 'dark' ? 'text-offwhite font-medium text-sm' : 'text-charcoal font-medium text-sm';

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

      <ListPagination pagination={pagination} onPageChange={setCurrentPage} className="mt-4" />
    </div>
  );
}
