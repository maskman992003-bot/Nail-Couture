import { formatAttachmentSize, isAnnouncementImageMime } from '../utils/announcementAttachments.js';

/**
 * @param {{
 *   attachments?: Array<{ url: string, file_name?: string, mime_type?: string, size_bytes?: number, kind?: string }>,
 *   compact?: boolean,
 *   className?: string,
 * }} props
 */
export default function AnnouncementAttachmentsList({ attachments = [], compact = false, className = '' }) {
  if (!attachments.length) return null;

  const images = [];
  const files = [];

  attachments.forEach((attachment, index) => {
    const isImage = attachment.kind === 'image' || isAnnouncementImageMime(attachment.mime_type);
    const entry = { attachment, index, label: attachment.file_name || `Attachment ${index + 1}` };
    if (isImage) images.push(entry);
    else files.push(entry);
  });

  const gapClass = compact ? 'gap-1.5' : 'gap-2';

  return (
    <div className={`space-y-2 ${className}`}>
      {images.length > 0 ? (
        <div className={`grid grid-cols-2 ${gapClass}`}>
          {images.map(({ attachment, index, label }) => (
            <a
              key={`${attachment.url}-${index}`}
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-card bg-secondary px-2 py-1.5 hover:border-theme transition-colors min-w-0"
            >
              <img
                src={attachment.url}
                alt={label}
                className="w-8 h-8 rounded object-cover flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-primary truncate">{label}</div>
                {attachment.size_bytes ? (
                  <div className="text-[10px] text-muted">{formatAttachmentSize(attachment.size_bytes)}</div>
                ) : null}
              </div>
            </a>
          ))}
        </div>
      ) : null}

      {files.length > 0 ? (
        <div className={`grid grid-cols-2 ${gapClass}`}>
          {files.map(({ attachment, index, label }) => (
            <a
              key={`${attachment.url}-${index}`}
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-card bg-secondary px-2 py-1.5 hover:border-theme transition-colors min-w-0"
            >
              <span className="text-sm flex-shrink-0" aria-hidden>📄</span>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-primary truncate">{label}</div>
                {attachment.size_bytes ? (
                  <div className="text-[10px] text-muted">{formatAttachmentSize(attachment.size_bytes)}</div>
                ) : null}
              </div>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
