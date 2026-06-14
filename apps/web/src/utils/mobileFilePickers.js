/**
 * Mobile browsers and WebView shells (e.g. Flutter) work best with
 * <input type="file" capture> instead of getUserMedia.
 */

export function isMobileWebClient() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function supportsDesktopCameraStream() {
  return typeof navigator !== 'undefined'
    && Boolean(navigator.mediaDevices?.getUserMedia)
    && !isMobileWebClient();
}

/**
 * Open the device camera on mobile/WebView, or the in-browser capture modal on desktop.
 *
 * @param {{
 *   nativeCameraInputRef: { current: HTMLInputElement | null },
 *   onDesktopCamera?: () => void,
 * }} options
 */
export function openWebCameraPicker({ nativeCameraInputRef, onDesktopCamera }) {
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
