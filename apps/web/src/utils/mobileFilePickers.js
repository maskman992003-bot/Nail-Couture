/**
 * Mobile browsers and WebView shells (e.g. Flutter) work best with
 * native camera bridges or <input type="file" capture> instead of getUserMedia.
 */

export function isMobileWebClient() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function isFlutterWebView() {
  if (typeof navigator === 'undefined') return false;
  return /NailCoutureFlutter/i.test(navigator.userAgent);
}

export function supportsDesktopCameraStream() {
  return typeof navigator !== 'undefined'
    && Boolean(navigator.mediaDevices?.getUserMedia)
    && !isMobileWebClient();
}

function base64ToFile(base64, mimeType, filename) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mimeType });
}

/**
 * Open the device camera on mobile/WebView, or the in-browser capture modal on desktop.
 *
 * @param {{
 *   nativeCameraInputRef: { current: HTMLInputElement | null },
 *   onDesktopCamera?: () => void,
 *   onNativeCapture?: (file: File) => void | Promise<void>,
 * }} options
 */
export async function openWebCameraPicker({
  nativeCameraInputRef,
  onDesktopCamera,
  onNativeCapture,
}) {
  if (isFlutterWebView() && typeof window !== 'undefined' && window.NativeBridge?.openCamera) {
    try {
      const result = await window.NativeBridge.openCamera();
      if (result?.ok && result.base64) {
        const file = base64ToFile(
          result.base64,
          result.mimeType || 'image/jpeg',
          result.filename || 'camera.jpg',
        );
        await onNativeCapture?.(file);
        return;
      }
    } catch (err) {
      console.warn('Native camera failed, falling back to file input', err);
    }
  }

  if (isMobileWebClient() || !navigator.mediaDevices?.getUserMedia) {
    nativeCameraInputRef.current?.click();
    return;
  }
  onDesktopCamera?.();
}

/**
 * Trigger a hidden file input synchronously from a user gesture.
 *
 * @param {{ current: HTMLInputElement | null }} inputRef
 */
export function clickFileInput(inputRef) {
  inputRef.current?.click();
}
