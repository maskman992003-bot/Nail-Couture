import { getSupabase } from '../lib/supabase.js';
import { csvEscape } from './reportsAnalytics.js';

const JOIN_RPC = 'join_vip_founding_list';
const LIST_RPC = 'get_vip_founding_list';
const PAGE_SIZE = 10;

function isVipListUnavailable(error) {
  const msg = (error?.message || '').toLowerCase();
  return (
    msg.includes('does not exist')
    || msg.includes('schema cache')
    || msg.includes('could not find the function')
    || msg.includes('vip_founding_list')
  );
}

/**
 * @param {string} email
 * @param {string} [source]
 */
export async function joinVipFoundingList(email, source = 'landing') {
  const { data, error } = await getSupabase().rpc(JOIN_RPC, {
    p_email: email,
    p_source: source,
  });

  if (error) {
    return { data: null, error, available: !isVipListUnavailable(error) };
  }

  if (data?.success === false) {
    return {
      data: null,
      error: { message: data.error === 'invalid_email' ? 'Please enter a valid email address.' : 'Unable to join the list.' },
      available: true,
    };
  }

  return { data, error: null, available: true };
}

/**
 * @param {string} callerPhone
 * @param {{ page?: number, limit?: number, todayOnly?: boolean, fetchAll?: boolean }} [options]
 */
export async function fetchVipFoundingList(callerPhone, options = {}) {
  const {
    page = 1,
    limit = PAGE_SIZE,
    todayOnly = true,
    fetchAll = false,
  } = options;

  const { data, error } = await getSupabase().rpc(LIST_RPC, {
    caller_phone: callerPhone,
    p_page: page,
    p_limit: limit,
    p_today_only: todayOnly,
    p_fetch_all: fetchAll,
  });

  if (error) {
    return {
      signups: [],
      total: 0,
      page: 1,
      totalPages: 0,
      error,
      available: !isVipListUnavailable(error),
    };
  }

  if (data?.success === false) {
    return {
      signups: [],
      total: 0,
      page: 1,
      totalPages: 0,
      error: { message: data.error === 'forbidden' ? 'Not authorized.' : 'Unable to load VIP list.' },
      available: true,
    };
  }

  return {
    signups: data?.signups ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    totalPages: data?.total_pages ?? 0,
    error: null,
    available: true,
  };
}

/**
 * @param {string} callerPhone
 * @param {{ todayOnly?: boolean }} [options]
 */
export async function fetchAllVipFoundingListForExport(callerPhone, options = {}) {
  const { todayOnly = false } = options;
  return fetchVipFoundingList(callerPhone, { todayOnly, fetchAll: true });
}

function formatSignupDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatChicagoTodayLabel() {
  return new Date().toLocaleDateString('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * @param {Array<{ email?: string, source?: string, created_at?: string }>} signups
 * @param {{ dateFilter?: string, filenameSuffix?: string }} [options]
 */
export function exportVipFoundingListCsv(signups, options = {}) {
  const rows = signups ?? [];
  const dateFilter = options.dateFilter ?? 'All signups';
  const filenameSuffix = options.filenameSuffix ?? 'all';
  const exportedAt = new Date().toISOString();

  const dataHeader = ['email', 'source', 'signed_up_date', 'signed_up_at'];
  const csvContent = [
    [csvEscape('date_filter'), csvEscape(dateFilter)].join(','),
    [csvEscape('exported_at'), csvEscape(exportedAt)].join(','),
    [csvEscape('total_rows'), csvEscape(String(rows.length))].join(','),
    '',
    dataHeader.map(csvEscape).join(','),
    ...rows.map((row) => [
      csvEscape(row.email ?? ''),
      csvEscape(row.source ?? ''),
      csvEscape(formatSignupDate(row.created_at)),
      csvEscape(row.created_at ? new Date(row.created_at).toISOString() : ''),
    ].join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `vip-founding-list-${filenameSuffix}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export { formatChicagoTodayLabel };
