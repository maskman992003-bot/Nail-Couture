import { createPortal } from 'react-dom';
import clsx from 'clsx';
import useFocusTrap from '../hooks/useFocusTrap';

export const modalLabelClass = 'text-secondary text-xs uppercase tracking-wider block mb-2';
export const modalInputClass =
  'w-full px-3 py-2.5 bg-input border border-input rounded-lg text-sm text-primary placeholder-text-muted focus:border-gold focus:outline-none';
export const modalSelectClass =
  'w-full px-3 py-2.5 bg-input border border-input rounded-lg text-sm text-primary focus:border-gold focus:outline-none appearance-none';
export const modalTextareaClass =
  'w-full px-3 py-2.5 bg-input border border-input rounded-lg text-sm text-primary placeholder-text-muted focus:border-gold focus:outline-none resize-none';
export const modalBtnSecondary =
  'flex-1 py-3 bg-input text-primary hover:bg-input/80 rounded-xl transition-colors text-sm font-medium';
export const modalBtnPrimary =
  'flex-1 py-3 bg-gold text-charcoal font-medium rounded-xl hover:bg-gold/90 transition-colors text-sm disabled:opacity-50';
export const modalBtnDanger =
  'flex-1 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50';
export const modalCardClass = 'rounded-xl border border-card bg-secondary p-4';

export default function AppModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-lg',
  zIndex = 'z-[200]',
  scrollBody = false,
  panelClassName = '',
  headerExtra,
}) {
  const panelRef = useFocusTrap(open, onClose);

  if (!open) return null;

  return createPortal(
    <div
      className={clsx(
        'fixed inset-0 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm',
        zIndex,
      )}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'app-modal-title' : undefined}
        className={clsx(
          'w-full flex flex-col rounded-2xl border border-card bg-card shadow-2xl',
          'max-h-[min(90dvh,calc(100dvh-2rem))]',
          maxWidth,
          panelClassName,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || onClose || headerExtra) && (
          <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-light shrink-0">
            <div className="min-w-0 flex-1">
              {title && (
                <h2 id="app-modal-title" className="font-heading text-xl text-gold-strong">
                  {title}
                </h2>
              )}
              {subtitle && <p className="text-secondary text-sm mt-1">{subtitle}</p>}
              {headerExtra}
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-secondary hover:text-primary text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary shrink-0"
                aria-label="Close"
              >
                ×
              </button>
            )}
          </div>
        )}
        <div className={clsx('px-5 py-4', scrollBody && 'overflow-y-auto min-h-0 flex-1')}>{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-light shrink-0 flex flex-col sm:flex-row gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
