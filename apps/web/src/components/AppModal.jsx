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
  'w-full sm:flex-1 min-h-[48px] px-4 py-3 bg-input text-primary hover:bg-input/80 rounded-xl transition-colors text-sm font-medium text-center';
export const modalBtnPrimary =
  'w-full sm:flex-1 min-h-[48px] px-4 py-3 bg-gold text-charcoal font-medium rounded-xl hover:bg-gold/90 transition-colors text-sm disabled:opacity-50 text-center';
export const modalBtnDanger =
  'w-full sm:flex-1 min-h-[48px] px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50 text-center';
export const modalFooterClass =
  'flex flex-col-reverse sm:flex-row gap-3 w-full [&>*]:w-full sm:[&>*]:w-auto';
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
        'fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm',
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
          'w-full flex flex-col border border-card bg-card shadow-2xl',
          'max-h-[min(92dvh,calc(100dvh-1rem))] sm:max-h-[min(90dvh,calc(100dvh-2rem))]',
          'rounded-t-2xl sm:rounded-2xl',
          scrollBody && 'overflow-hidden min-h-0',
          maxWidth,
          panelClassName,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || onClose || headerExtra) && (
          <div className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 border-b border-light shrink-0">
            <div className="min-w-0 flex-1">
              {title && (
                <h2 id="app-modal-title" className="font-heading text-lg sm:text-xl text-gold-strong leading-snug">
                  {title}
                </h2>
              )}
              {subtitle && <p className="text-secondary text-sm mt-1 leading-relaxed">{subtitle}</p>}
              {headerExtra}
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-secondary hover:text-primary text-2xl leading-none w-10 h-10 flex items-center justify-center rounded-lg hover:bg-secondary shrink-0 -mr-1"
                aria-label="Close"
              >
                ×
              </button>
            )}
          </div>
        )}
        <div
          className={clsx(
            'px-4 py-3 sm:px-5 sm:py-4 text-sm sm:text-base leading-relaxed',
            scrollBody && 'overflow-y-auto overscroll-contain min-h-0 flex-1',
          )}
        >
          {children}
        </div>
        {footer && (
          <div
            className={clsx(
              'px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4 border-t border-light shrink-0',
              modalFooterClass,
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
