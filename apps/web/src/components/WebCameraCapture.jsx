import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   onCapture: (file: File) => void,
 *   theme?: 'dark' | 'light',
 * }} props
 */
export default function WebCameraCapture({ open, onClose, onCapture, theme = 'dark' }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  useEffect(() => {
    if (!open) {
      stopStream();
      setError('');
      return undefined;
    }

    let cancelled = false;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera is not supported in this browser.');
        return;
      }
      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
        setError('');
      } catch {
        setError('Camera permission denied or unavailable.');
      }
    })();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, stopStream]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' }));
        }
        stopStream();
        onClose();
      },
      'image/jpeg',
      0.85,
    );
  };

  const handleClose = () => {
    stopStream();
    onClose();
  };

  if (!open) return null;

  const panelClass = theme === 'dark' ? 'bg-charcoal border-white/10 text-offwhite' : 'bg-white border-gray-200 text-gray-900';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className={clsx('w-full max-w-lg rounded-xl border p-4', panelClass)}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium">Take photo</h3>
          <button type="button" onClick={handleClose} className="text-xl opacity-60 hover:opacity-100">
            &times;
          </button>
        </div>

        {error ? (
          <p className="text-sm text-red-300 mb-4">{error}</p>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full rounded-lg bg-black aspect-[4/3] object-cover"
          />
        )}

        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={handleClose}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm border',
              theme === 'dark' ? 'border-white/20' : 'border-gray-300',
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCapture}
            disabled={!ready || Boolean(error)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gold text-black disabled:opacity-50"
          >
            Capture
          </button>
        </div>
      </div>
    </div>
  );
}
