import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import AppModal from './AppModal.jsx';
import {
  exportVipFoundingListCsv,
  fetchAllVipFoundingListForExport,
  fetchVipFoundingList,
} from '@nail-couture/shared/utils/vipFoundingListService.js';
import { getSupabaseErrorMessage } from '@nail-couture/shared/utils/supabaseErrors.js';

const MANAGEMENT_ROLES = ['super_admin', 'owner', 'partner', 'admin'];
const PAGE_SIZE = 10;

function formatSignedUpAt(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function VipFoundingListCard({
  phone,
  role,
  theme = 'dark',
  panelStyle,
  className,
}) {
  const [total, setTotal] = useState(0);
  const [signups, setSignups] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const loadSignups = useCallback(async (targetPage = 1, forModal = false) => {
    if (!phone) {
      setLoading(false);
      return;
    }

    if (forModal) {
      setModalLoading(true);
    } else {
      setLoading(true);
    }
    setError('');

    const result = await fetchVipFoundingList(phone, {
      page: targetPage,
      limit: PAGE_SIZE,
      todayOnly: true,
    });

    if (!result.available) {
      setError('VIP list is not available yet.');
      setSignups([]);
      setTotal(0);
      setTotalPages(0);
    } else if (result.error) {
      setError(getSupabaseErrorMessage(result.error, 'Unable to load VIP list.'));
      setSignups([]);
      setTotal(0);
      setTotalPages(0);
    } else {
      setSignups(result.signups);
      setTotal(result.total);
      setPage(result.page);
      setTotalPages(result.totalPages);
    }

    if (forModal) {
      setModalLoading(false);
    } else {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => {
    void loadSignups(1, false);
  }, [loadSignups]);

  useEffect(() => {
    if (!modalOpen) return;
    void loadSignups(page, true);
  }, [modalOpen, page, loadSignups]);

  const handleOpenModal = () => {
    setPage(1);
    setModalOpen(true);
  };

  const handleExport = async () => {
    if (!phone) return;

    setExporting(true);
    setExportError('');

    const result = await fetchAllVipFoundingListForExport(phone, { todayOnly: false });
    setExporting(false);

    if (!result.available) {
      setExportError('VIP list export is not available yet.');
      return;
    }
    if (result.error) {
      setExportError(getSupabaseErrorMessage(result.error, 'Unable to export VIP list.'));
      return;
    }
    if (result.signups.length === 0) {
      setExportError('No signups to export.');
      return;
    }

    exportVipFoundingListCsv(result.signups, {
      dateFilter: 'All signups (no date filter)',
      filenameSuffix: 'all',
    });
  };

  if (!phone || !MANAGEMENT_ROLES.includes(role)) {
    return null;
  }

  const labelClass = theme === 'dark' ? 'text-sm mb-1 text-secondary' : 'text-sm mb-1 text-charcoal/50';
  const countClass = theme === 'dark' ? 'text-3xl font-heading text-primary' : 'text-3xl font-heading text-charcoal';
  const btnClass = clsx(
    'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50',
    theme === 'dark'
      ? 'border-gold/30 text-gold hover:bg-gold/10'
      : 'border-gold/40 text-gold hover:bg-gold/10',
  );
  const pageBtnClass = (active) => clsx(
    'min-w-[2rem] px-2 py-1 text-xs font-medium rounded-lg border transition-colors',
    active
      ? theme === 'dark'
        ? 'border-gold bg-gold/15 text-gold'
        : 'border-gold bg-gold/10 text-gold'
      : theme === 'dark'
        ? 'border-gold/30 text-secondary hover:bg-gold/10'
        : 'border-gold/40 text-charcoal/70 hover:bg-gold/10',
  );

  return (
    <>
      <div className={clsx(className ?? 'border p-6')} style={panelStyle}>
        <div className={labelClass}>VIP Founding List</div>
        <div className="text-[11px] uppercase tracking-wider opacity-70 mb-1" style={{ color: 'inherit' }}>
          Today
        </div>
        <div className={countClass}>{loading ? '…' : total}</div>
        {error && (
          <p className="mt-2 text-xs text-red-400">{error}</p>
        )}
        {exportError && (
          <p className="mt-2 text-xs text-red-400">{exportError}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={btnClass}
            disabled={loading || !!error}
            onClick={handleOpenModal}
          >
            View
          </button>
          <button
            type="button"
            className={btnClass}
            disabled={loading || exporting || !!error}
            onClick={() => void handleExport()}
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      <AppModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="VIP Founding List"
        subtitle={`${total} signup${total === 1 ? '' : 's'} today`}
        maxWidth="max-w-2xl"
        scrollBody
        footer={(
          <div className="flex flex-wrap gap-3 justify-end w-full">
            <button
              type="button"
              className={btnClass}
              disabled={exporting}
              onClick={() => void handleExport()}
            >
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
            <button type="button" className={btnClass} onClick={() => setModalOpen(false)}>
              Close
            </button>
          </div>
        )}
      >
        {modalLoading ? (
          <p className="text-sm text-secondary py-6 text-center">Loading…</p>
        ) : signups.length === 0 ? (
          <p className="text-sm text-secondary py-6 text-center">No signups today.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-card text-left text-xs uppercase tracking-wider text-secondary">
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Signed up</th>
                  </tr>
                </thead>
                <tbody>
                  {signups.map((row) => (
                    <tr key={row.id} className="border-b border-card/60">
                      <td className="px-3 py-2.5 text-primary break-all">{row.email}</td>
                      <td className="px-3 py-2.5 text-secondary whitespace-nowrap">
                        {formatSignedUpAt(row.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {Array.from({ length: totalPages }, (_, index) => {
                  const pageNumber = index + 1;
                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      className={pageBtnClass(pageNumber === page)}
                      onClick={() => setPage(pageNumber)}
                      aria-label={`Page ${pageNumber}`}
                      aria-current={pageNumber === page ? 'page' : undefined}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </AppModal>
    </>
  );
}
