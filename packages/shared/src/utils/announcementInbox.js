import { getSupabase } from '../lib/supabase.js';

/** @typedef {'all' | 'saved' | 'archived'} AnnouncementInboxFilter */

/**
 * @param {string} callerPhone
 * @param {AnnouncementInboxFilter} filter
 * @param {number} limit
 * @param {number} offset
 */
export async function listMyAnnouncements(callerPhone, filter = 'all', limit = 20, offset = 0) {
  const { data, error } = await getSupabase().rpc('list_my_announcements', {
    p_caller_phone: callerPhone,
    p_filter: filter,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return data ?? [];
}

/**
 * @param {string} callerPhone
 * @param {string} announcementId
 * @param {boolean} saved
 */
export async function setAnnouncementSaved(callerPhone, announcementId, saved = true) {
  const { data, error } = await getSupabase().rpc('set_announcement_saved', {
    p_caller_phone: callerPhone,
    p_announcement_id: announcementId,
    p_saved: saved,
  });
  if (error) throw error;
  return Boolean(data);
}

/**
 * @param {string} callerPhone
 * @param {string} announcementId
 * @param {boolean} archived
 */
export async function setAnnouncementArchived(callerPhone, announcementId, archived = true) {
  const { data, error } = await getSupabase().rpc('set_announcement_archived', {
    p_caller_phone: callerPhone,
    p_announcement_id: announcementId,
    p_archived: archived,
  });
  if (error) throw error;
  return Boolean(data);
}

/**
 * @param {string} createdAt
 */
export function formatAnnouncementDate(createdAt) {
  const date = new Date(createdAt);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
