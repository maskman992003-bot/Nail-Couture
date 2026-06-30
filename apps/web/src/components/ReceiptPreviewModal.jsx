import { useState } from 'react';
import clsx from 'clsx';
import { copyTextToClipboard } from '@nail-couture/shared/utils/customerStats';
import { downloadReceiptFile } from '../utils/nativeDownload.js';
import { isFlutterWebView } from '../utils/mobileFilePickers.js';

/**
 * @param {{
 *   open: boolean,
 *   title?: string,
 *   content: string,
 *   filename: string,
 *   onClose: () => void,
 *   theme?: 'dark' | 'light',
 * }} props
 */
export default function ReceiptPreviewModal({
  open,
  title = 'Receipt',
  content,
  filename,
  onClose,
  theme = 'dark',
}) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const panelClass = theme === 'dark'
    ? 'bg-charcoal border-white/10 text-offwhite'
    : 'bg-white border-gray-200 text-gray-900';

  const handleDownload = async () => {
    setBusy(true);
    setMessage('');
    try {
      await downloadReceiptFile(content, filename);
      setMessage(isFlutterWebView() ? 'Share sheet opened.' : 'Download started.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    setBusy(true);
    setMessage('');
    try {
      await copyTextToClipboard(content);
      setMessage('Copied to clipboard.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Copy failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className={clsx('w-full max-w-lg rounded-xl border p-4 sm:p-6', panelClass)}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-heading">{title}</h3>
          <button type="button" onClick={onClose} className="text-xl opacity-60 hover:opacity-100">
            &times;
          </button>
        </div>

        <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap text-xs sm:text-sm rounded-lg border border-white/10 bg-black/20 p-3 mb-4">
          {content}
        </pre>

        {message ? (
          <p className={clsx('text-xs mb-3', message.includes('failed') ? 'text-red-300' : 'text-gold')}>
            {message}
          </p>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleDownload}
            disabled={busy}
            className="flex-1 py-3 bg-gold text-charcoal font-heading text-sm rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-50"
          >
            {busy ? 'Preparing…' : isFlutterWebView() ? 'Share' : 'Download'}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={busy}
            className="flex-1 py-3 border border-gold/30 text-gold font-heading text-sm rounded-xl hover:bg-gold/10 transition-colors disabled:opacity-50"
          >
            {busy ? 'Copying…' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={clsx(
              'flex-1 py-3 border rounded-xl font-heading text-sm transition-colors',
              theme === 'dark' ? 'border-white/20 hover:border-white/40' : 'border-gray-300 hover:border-gray-400',
            )}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
