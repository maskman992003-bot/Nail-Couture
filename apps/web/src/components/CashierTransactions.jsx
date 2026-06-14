import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getHomePath } from '@nail-couture/shared/utils/routes';
import {
  buildCashierReceiptContent,
  fetchCashierTransactions,
  getTransactionServiceLabel,
  sumTransactionTotals,
} from '@nail-couture/shared/utils/cashierTransactions';
import { getCallerPhone } from '@nail-couture/shared/utils/technicianQueue';
import Sidebar from './Sidebar';
import ReceiptPreviewModal from './ReceiptPreviewModal';

function formatTransactionTime(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function CashierTransactions() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [period, setPeriod] = useState('today');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [receiptLoadingId, setReceiptLoadingId] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);

  const isDark = theme === 'dark';
  const bgClass = clsx(
    'min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64',
    isDark ? 'bg-[#0B0B0C] text-white' : 'bg-white text-charcoal',
  );
  const cardClass = isDark ? 'bg-[#1a1a1a] border-gold/20' : 'bg-white border-gold/30';
  const mutedClass = isDark ? 'text-offwhite/60' : 'text-charcoal/60';

  const loadTransactions = useCallback(async (silent = false) => {
    if (!user?.id) {
      if (!silent) setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await fetchCashierTransactions(user.id, period);
      setTransactions(data);
      setSelectedId((prev) => (prev && data.some((tx) => tx.id === prev) ? prev : null));
    } catch (err) {
      console.warn('Failed to load transactions:', err);
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, period]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'cashier') {
      navigate(getHomePath(user.role));
    }
  }, [user, navigate]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const downloadReceipt = async (tx) => {
    setReceiptLoadingId(tx.id);
    try {
      const callerPhone = getCallerPhone(user?.phone);
      const { content, filename } = await buildCashierReceiptContent(tx, callerPhone);
      setReceiptPreview({ content, filename });
    } catch (err) {
      console.error('Receipt download error:', err);
      window.alert('Unable to download receipt. Please try again.');
    } finally {
      setReceiptLoadingId(null);
    }
  };

  const totalRevenue = sumTransactionTotals(transactions);
  const periodLabel = period === 'today' ? 'Today' : 'This week';
  const selectedTx = transactions.find((tx) => tx.id === selectedId) || null;

  return (
    <div className={bgClass}>
      <Sidebar />
      <div className="max-w-3xl mx-auto px-6 py-8 pb-24 lg:pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-3xl text-gold">My Transactions</h1>
            <p className={clsx('text-sm mt-1', mutedClass)}>Checkouts you processed — review and download receipts</p>
          </div>
          <button
            type="button"
            onClick={() => loadTransactions(true)}
            disabled={refreshing}
            className={clsx(
              'px-4 py-2 text-sm border rounded-lg disabled:opacity-50',
              isDark ? 'border-offwhite/20 hover:border-gold/40' : 'border-charcoal/20 hover:border-gold/40',
            )}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          {['today', 'week'].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={clsx(
                'px-4 py-2 text-sm rounded-lg border transition-colors',
                period === key
                  ? 'bg-gold text-charcoal border-gold'
                  : isDark
                    ? 'border-offwhite/20 text-offwhite/70 hover:border-gold/40'
                    : 'border-charcoal/20 text-charcoal/70 hover:border-gold/40',
              )}
            >
              {key === 'today' ? 'Today' : 'This week'}
            </button>
          ))}
        </div>

        <div className={clsx('rounded-xl border p-6 mb-6', cardClass)}>
          <p className={clsx('text-sm', mutedClass)}>{periodLabel} total</p>
          <p className="font-heading text-4xl text-gold mt-1">{formatMoney(totalRevenue)}</p>
          <p className={clsx('text-xs mt-2', mutedClass)}>
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} processed
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gold animate-pulse">Loading transactions…</div>
        ) : transactions.length === 0 ? (
          <div className={clsx('rounded-xl border p-12 text-center', cardClass)}>
            <div className="text-5xl mb-4">🧾</div>
            <h2 className="font-heading text-xl mb-2">No transactions yet</h2>
            <p className={clsx('text-sm', mutedClass)}>
              Completed checkouts will appear here for review and receipt download.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {transactions.map((tx) => {
              const isSelected = selectedId === tx.id;
              const tip = Number(tx.extras_amount || 0);
              const discount = Number(tx.discount_amount || 0);
              return (
                <li key={tx.id} className={clsx('rounded-xl border overflow-hidden', cardClass)}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(isSelected ? null : tx.id)}
                    className="w-full p-4 flex items-center justify-between gap-4 text-left"
                  >
                    <div className="min-w-0">
                      <p className={clsx('font-medium truncate', isDark ? 'text-offwhite' : 'text-charcoal')}>
                        {tx.customer?.full_name || 'Guest'}
                      </p>
                      <p className={clsx('text-sm mt-0.5 truncate', mutedClass)}>
                        {getTransactionServiceLabel(tx)}
                      </p>
                      <p className={clsx('text-xs mt-1', mutedClass)}>
                        {formatTransactionTime(tx.created_at)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-heading text-xl text-gold">
                        {formatMoney(tx.final_amount || tx.amount)}
                      </span>
                      <p className={clsx('text-xs mt-1 capitalize', mutedClass)}>
                        {tx.payment_method || 'paid'}
                      </p>
                    </div>
                  </button>

                  {isSelected && (
                    <div className={clsx('border-t px-4 py-4 space-y-3', isDark ? 'border-offwhite/10 bg-offwhite/5' : 'border-charcoal/10 bg-charcoal/5')}>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className={mutedClass}>Subtotal</p>
                          <p className="font-medium">{formatMoney(tx.amount)}</p>
                        </div>
                        {tip > 0 && (
                          <div>
                            <p className={mutedClass}>Tip</p>
                            <p className="font-medium">{formatMoney(tip)}</p>
                          </div>
                        )}
                        {discount > 0 && (
                          <div>
                            <p className={mutedClass}>Discount</p>
                            <p className="font-medium text-green-500">-{formatMoney(discount)}</p>
                          </div>
                        )}
                        <div>
                          <p className={mutedClass}>Total paid</p>
                          <p className="font-medium text-gold">{formatMoney(tx.final_amount || tx.amount)}</p>
                        </div>
                      </div>
                      {tx.notes && (
                        <p className={clsx('text-sm', mutedClass)}>
                          Note: {tx.notes}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => downloadReceipt(tx)}
                        disabled={receiptLoadingId === tx.id}
                        className="w-full sm:w-auto px-4 py-2 text-sm bg-gold text-charcoal rounded-lg font-medium disabled:opacity-50"
                      >
                        {receiptLoadingId === tx.id ? 'Preparing…' : 'Download Receipt'}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {selectedTx && !loading && transactions.length > 0 && (
          <p className={clsx('text-xs text-center mt-6', mutedClass)}>
            Tap a transaction again to collapse details
          </p>
        )}
      </div>

      <ReceiptPreviewModal
        open={Boolean(receiptPreview)}
        content={receiptPreview?.content || ''}
        filename={receiptPreview?.filename || 'receipt.txt'}
        onClose={() => setReceiptPreview(null)}
        theme={theme}
      />
    </div>
  );
}
