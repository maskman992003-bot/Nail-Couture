import { downloadTextFile } from '@nail-couture/shared/utils/customerStats.js';
import { isFlutterWebView } from './mobileFilePickers.js';

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
