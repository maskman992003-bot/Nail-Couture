import { getSupabase } from '../lib/supabase.js';
import { getSupabaseErrorMessage, isMissingRpcFunctionError } from './supabaseErrors.js';

/** @typedef {'customers' | 'staff' | 'both'} AnnouncementAudience */
/** @typedef {'all' | 'only' | 'exclude'} StaffTargetMode */

/**
 * @param {string} callerPhone
 */
export async function listAnnouncementStaffCandidates(callerPhone) {
  const { data, error } = await getSupabase().rpc('list_announcement_staff_candidates', {
    p_caller_phone: callerPhone,
  });
  if (error) throw error;
  return data ?? [];
}

/**
 * @param {string} callerPhone
 * @param {AnnouncementAudience} audience
 * @param {StaffTargetMode} staffTargetMode
 * @param {string[]} staffProfileIds
 */
export async function estimateAnnouncementRecipients(
  callerPhone,
  audience,
  staffTargetMode = 'all',
  staffProfileIds = [],
) {
  const { data, error } = await getSupabase().rpc('estimate_announcement_recipients', {
    p_caller_phone: callerPhone,
    p_audience: audience,
    p_staff_target_mode: staffTargetMode,
    p_staff_profile_ids: staffProfileIds,
  });
  if (error) throw error;
  return {
    total: data?.total ?? 0,
    customerCount: data?.customer_count ?? 0,
    staffCount: data?.staff_count ?? 0,
  };
}

/**
 * @param {object} params
 * @param {string} params.callerPhone
 * @param {string} params.title
 * @param {string} params.body
 * @param {AnnouncementAudience} params.audience
 * @param {StaffTargetMode} params.staffTargetMode
 * @param {string[]} params.staffProfileIds
 * @param {Array<{ url: string, file_name: string, mime_type: string, size_bytes: number, kind: string }>} [params.attachments]
 */
export async function sendSalonAnnouncement({
  callerPhone,
  title,
  body,
  audience,
  staffTargetMode = 'all',
  staffProfileIds = [],
  attachments = [],
}) {
  const baseParams = {
    p_caller_phone: callerPhone,
    p_title: title,
    p_body: body ?? '',
    p_audience: audience,
    p_staff_target_mode: staffTargetMode,
    p_staff_profile_ids: staffProfileIds ?? [],
  };

  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  let data = null;
  let error = null;

  if (hasAttachments) {
    ({ data, error } = await getSupabase().rpc('send_salon_announcement', {
      ...baseParams,
      p_attachments: attachments,
    }));
  } else {
    ({ data, error } = await getSupabase().rpc('send_salon_announcement', {
      ...baseParams,
      p_attachments: [],
    }));

    if (error && isMissingRpcFunctionError(error)) {
      ({ data, error } = await getSupabase().rpc('send_salon_announcement', baseParams));
    }
  }

  if (error) {
    const message = getSupabaseErrorMessage(error, 'Failed to send announcement.');
    if (isMissingRpcFunctionError(error)) {
      throw new Error(`${message} Run sql/052_announcement_attachments.sql in Supabase.`);
    }
    throw new Error(message);
  }

  return {
    id: data?.id,
    status: data?.status,
    estimatedRecipients: data?.estimated_recipients ?? 0,
    customerCount: data?.customer_count ?? 0,
    staffCount: data?.staff_count ?? 0,
    sentToday: data?.sent_today ?? null,
    remainingToday: data?.remaining_today ?? null,
    dailyLimit: data?.daily_limit ?? null,
  };
}

/**
 * @param {{ deliveryWarning?: string, remainingToday?: number | null }} result
 */
export function formatAnnouncementSendSuccess(result) {
  const remaining = result?.remainingToday;
  const remainingText = typeof remaining === 'number'
    ? (remaining === 0
      ? 'No announcements left to send today.'
      : `${remaining} announcement${remaining === 1 ? '' : 's'} left to send today.`)
    : '';

  if (result?.deliveryWarning) {
    const base = `Announcement saved. ${result.deliveryWarning}`;
    return remainingText ? `${base} ${remainingText}` : base;
  }

  return remainingText ? `Announcement sent. ${remainingText}` : 'Announcement sent.';
}

/**
 * Process one fan-out batch (management auth).
 * @param {string} callerPhone
 * @param {string} announcementId
 * @param {number} batchSize
 */
export async function advanceAnnouncementFanout(callerPhone, announcementId, batchSize = 500) {
  const { data, error } = await getSupabase().rpc('advance_announcement_fanout', {
    p_caller_phone: callerPhone,
    p_announcement_id: announcementId,
    p_batch_size: batchSize,
  });
  if (error) throw error;
  return {
    done: Boolean(data?.done),
    processed: data?.processed ?? 0,
    total: data?.total ?? 0,
    status: data?.status ?? 'pending',
    error: data?.error ?? null,
  };
}

/**
 * Process all remaining fan-out batches for one announcement.
 * @param {string} callerPhone
 * @param {string} announcementId
 */
export async function drainAnnouncementFanout(callerPhone, announcementId) {
  const { data, error } = await getSupabase().rpc('drain_announcement_fanout', {
    p_caller_phone: callerPhone,
    p_announcement_id: announcementId,
    p_batch_size: 500,
    p_max_batches: 200,
  });
  if (error) throw error;
  const lastBatch = data?.last_batch ?? {};
  return {
    done: Boolean(data?.done),
    iterations: data?.iterations ?? 0,
    processed: lastBatch?.processed ?? 0,
    total: lastBatch?.total ?? 0,
    status: lastBatch?.status ?? 'pending',
  };
}

/**
 * Drain pending/processing announcements (e.g. on page load).
 * @param {string} callerPhone
 */
export async function resumePendingAnnouncementFanouts(callerPhone) {
  const { data, error } = await getSupabase().rpc('resume_pending_announcement_fanouts', {
    p_caller_phone: callerPhone,
    p_limit: 10,
  });
  if (error) throw error;
  return data ?? { processed: 0, results: [] };
}

/**
 * @param {string} callerPhone
 * @param {number} limit
 * @param {number} offset
 */
export async function listSalonAnnouncements(callerPhone, limit = 20, offset = 0) {
  const { data, error } = await getSupabase().rpc('list_salon_announcements', {
    p_caller_phone: callerPhone,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return data ?? [];
}

/**
 * @param {StaffTargetMode | string} mode
 * @param {number} staffProfileCount
 */
export function formatStaffTargetingSummary(mode, staffProfileCount = 0) {
  if (mode === 'all') return 'All staff';
  if (mode === 'only') return `${staffProfileCount} selected`;
  if (mode === 'exclude') {
    return staffProfileCount > 0 ? `All except ${staffProfileCount}` : 'All staff';
  }
  return 'All staff';
}

/**
 * Prefer loaded staff candidates when the API estimate undercounts "all staff".
 * @param {AnnouncementAudience} audience
 * @param {{ total: number, customerCount: number, staffCount: number }} counts
 * @param {StaffTargetMode | string} staffTargetMode
 * @param {number} staffCandidateCount
 */
export function resolveAnnouncementEstimate(
  audience,
  counts,
  staffTargetMode = 'all',
  staffCandidateCount = 0,
) {
  const customerCount = counts?.customerCount ?? 0;
  let staffCount = counts?.staffCount ?? 0;

  if (
    (audience === 'staff' || audience === 'both')
    && staffTargetMode === 'all'
    && staffCandidateCount > staffCount
  ) {
    staffCount = staffCandidateCount;
  }

  let total = counts?.total ?? 0;
  if (audience === 'both') {
    total = customerCount + staffCount;
  } else if (audience === 'staff') {
    total = staffCount;
  } else {
    total = customerCount;
  }

  return { total, customerCount, staffCount };
}

/**
 * @param {AnnouncementAudience} audience
 * @param {{ total: number, customerCount: number, staffCount: number }} counts
 */
export function formatRecipientPreview(audience, counts) {
  const { customerCount, staffCount } = counts;
  if (audience === 'customers') {
    return `~${customerCount} customer${customerCount === 1 ? '' : 's'}`;
  }
  if (audience === 'staff') {
    return `~${staffCount} staff member${staffCount === 1 ? '' : 's'}`;
  }
  return `~${customerCount} customer${customerCount === 1 ? '' : 's'} and ${staffCount} staff`;
}

/** Roles shown in staff targeting and eligible to receive staff announcements. */
export const ANNOUNCEMENT_TARGETABLE_STAFF_ROLES = new Set([
  'owner',
  'partner',
  'admin',
  'cashier',
  'technician',
]);

/**
 * @param {{ role?: string } | null | undefined} profile
 */
export function isAnnouncementStaffCandidate(profile) {
  return ANNOUNCEMENT_TARGETABLE_STAFF_ROLES.has(profile?.role ?? '');
}

/**
 * @param {string} role
 */
export function formatStaffRoleLabel(role) {
  if (!role) return '';
  return role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
