import { getSupabase } from '../lib/supabase.js';

export const ANNOUNCEMENT_ATTACHMENTS_BUCKET = 'announcement-attachments';
export const MAX_ANNOUNCEMENT_ATTACHMENTS = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const FILE_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
]);

const ALLOWED_MIME_TYPES = new Set([...IMAGE_MIME_TYPES, ...FILE_MIME_TYPES]);

const DOCUMENT_EXTENSIONS = ['.pdf', '.txt'];

/**
 * @param {string | undefined | null} mimeType
 */
export function normalizeAnnouncementMimeType(mimeType) {
  return (mimeType || '').split(';')[0].trim().toLowerCase();
}

/**
 * @param {string | undefined | null} mimeType
 */
export function isAnnouncementImageMime(mimeType) {
  return IMAGE_MIME_TYPES.has(normalizeAnnouncementMimeType(mimeType));
}

/**
 * @param {string | undefined | null} mimeType
 */
export function isAnnouncementDocumentMime(mimeType) {
  return FILE_MIME_TYPES.has(normalizeAnnouncementMimeType(mimeType));
}

/**
 * Browsers (especially on Windows) often send generic types for documents.
 * @param {string} mimeType
 */
function isGenericDocumentMime(mimeType) {
  const mime = normalizeAnnouncementMimeType(mimeType);
  return !mime
    || mime === 'application/octet-stream'
    || mime === 'binary/octet-stream'
    || mime === 'application/x-download';
}

/**
 * @param {string} fileName
 * @param {string} [mimeType]
 */
export function resolveAnnouncementMimeType(fileName, mimeType) {
  const lowerName = (fileName || '').toLowerCase();
  if (lowerName.endsWith('.txt')) return 'text/plain';
  if (lowerName.endsWith('.pdf')) return 'application/pdf';

  const normalized = normalizeAnnouncementMimeType(mimeType);
  if (normalized && !isGenericDocumentMime(normalized)) return normalized;
  return '';
}

/**
 * @param {File | { name?: string, type?: string }} file
 */
export function isValidAnnouncementDocumentFile(file) {
  const name = (file?.name || '').toLowerCase();
  const hasDocExtension = DOCUMENT_EXTENSIONS.some((ext) => name.endsWith(ext));
  if (!hasDocExtension) return false;

  const rawMime = normalizeAnnouncementMimeType(file?.type);
  if (rawMime.startsWith('image/')) return false;

  const resolved = resolveAnnouncementMimeType(file?.name, file?.type);
  return isAnnouncementDocumentMime(resolved);
}

/**
 * @param {string | undefined | null} mimeType
 */
export function getAnnouncementDocumentLabel(mimeType) {
  const mime = normalizeAnnouncementMimeType(mimeType);
  if (mime === 'application/pdf') return 'PDF';
  if (mime === 'text/plain') return 'TXT';
  return 'File';
}

/**
 * @param {string} name
 */
function safeFileName(name) {
  const base = (name || 'file').split(/[/\\]/).pop() || 'file';
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

/**
 * @param {string} mimeType
 * @param {number} sizeBytes
 */
export function validateAnnouncementAttachment(mimeType, sizeBytes) {
  const normalizedMime = normalizeAnnouncementMimeType(mimeType);
  if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
    return 'Unsupported file type. Use JPEG, PNG, WebP, GIF, PDF, or TXT.';
  }
  const maxBytes = isAnnouncementImageMime(normalizedMime) ? MAX_IMAGE_BYTES : MAX_FILE_BYTES;
  if (!sizeBytes || sizeBytes > maxBytes) {
    const limitMb = Math.round(maxBytes / (1024 * 1024));
    return `File must be ${limitMb} MB or smaller.`;
  }
  return null;
}

/**
 * @param {number} bytes
 */
export function formatAttachmentSize(bytes) {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * @typedef {Object} AnnouncementAttachment
 * @property {string} url
 * @property {string} file_name
 * @property {string} mime_type
 * @property {number} size_bytes
 * @property {'image' | 'file'} kind
 */

/**
 * @param {string} profileId
 * @param {Blob | File} file
 * @param {string} [fileName]
 * @param {string} [mimeType]
 * @returns {Promise<AnnouncementAttachment>}
 */
export async function uploadAnnouncementAttachment(profileId, file, fileName, mimeType) {
  if (!profileId || !file) {
    throw new Error('Missing profile or file.');
  }

  const resolvedName = fileName || file.name || `attachment_${Date.now()}`;
  const resolvedMime = resolveAnnouncementMimeType(resolvedName, mimeType || file.type);
  const sizeBytes = file.size ?? 0;

  const validationError = validateAnnouncementAttachment(resolvedMime || file.type, sizeBytes);
  if (validationError) {
    throw new Error(validationError);
  }

  const path = `draft/${profileId}/${Date.now()}_${safeFileName(resolvedName)}`;

  const { error: uploadError } = await getSupabase().storage
    .from(ANNOUNCEMENT_ATTACHMENTS_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: resolvedMime,
    });

  if (uploadError) {
    const uploadMessage = uploadError.message || 'Upload failed.';
    if (uploadError.message?.includes('Bucket not found')) {
      throw new Error('Attachment storage not set up. Run sql/052_announcement_attachments.sql in Supabase.');
    }
    if (
      resolvedMime === 'text/plain'
      && /mime|not allowed|invalid/i.test(uploadMessage)
    ) {
      throw new Error('TXT uploads are blocked by storage. Run sql/055_announcement_txt_attachments.sql in Supabase.');
    }
    throw new Error(uploadMessage);
  }

  const { data: urlData } = getSupabase().storage
    .from(ANNOUNCEMENT_ATTACHMENTS_BUCKET)
    .getPublicUrl(path);

  const url = urlData?.publicUrl;
  if (!url) {
    throw new Error('Could not resolve attachment URL.');
  }

  return {
    url,
    file_name: resolvedName,
    mime_type: resolvedMime,
    size_bytes: sizeBytes,
    kind: isAnnouncementImageMime(resolvedMime) ? 'image' : 'file',
  };
}

/**
 * @param {AnnouncementAttachment[]} attachments
 */
export function serializeAnnouncementAttachments(attachments) {
  return (attachments || []).map((item) => ({
    url: item.url,
    file_name: item.file_name,
    mime_type: item.mime_type,
    size_bytes: item.size_bytes,
    kind: item.kind,
  }));
}
