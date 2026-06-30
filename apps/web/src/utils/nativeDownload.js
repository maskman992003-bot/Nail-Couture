import { downloadTextFile } from '@nail-couture/shared/utils/customerStats.js';
import { isFlutterWebView } from './mobileFilePickers.js';

export const RECEIPT_MIME_TYPE = 'text/plain;charset=utf-8';

/**
 * Download a text/CSV export in the browser, or hand off to the Flutter NativeBridge.
 */
export async function downloadExportFile(content, filename, mimeType = 'text/csv;charset=utf-8') {
  if (!content?.trim()) {
    throw new Error('Export content is empty');
  }

  if (isFlutterWebView() && typeof window !== 'undefined' && window.NativeBridge?.saveFile) {
    const result = await window.NativeBridge.saveFile({ content, filename, mimeType });
    if (result?.ok) {
      return true;
    }
    throw new Error(result?.message || 'Export failed');
  }

  return downloadTextFile(content, filename);
}

/** Receipt text — uses NativeBridge share sheet inside the Flutter WebView. */
export async function downloadReceiptFile(content, filename) {
  return downloadExportFile(content, filename, RECEIPT_MIME_TYPE);
}
