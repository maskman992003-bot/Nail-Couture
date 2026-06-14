import clsx from 'clsx';
import { useTheme } from '../../contexts/ThemeContext';
import PromoOfferCard from './PromoOfferCard';

export default function PromoDetailModal({
  promo,
  onClose,
  onCopy,
  preview = false,
}) {
  const { theme } = useTheme();

  if (!promo) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-detail-title"
        className={clsx(
          'relative w-full max-w-lg rounded-2xl border p-6 shadow-xl motion-reduce:transition-none animate-nc-slide-in-up',
          theme === 'dark'
            ? 'border-gold/25 bg-charcoal text-offwhite'
            : 'border-gold/35 bg-white text-charcoal',
          promo.show_shimmer_cta && 'nc-shimmer-surface',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-xl leading-none opacity-60 hover:opacity-100"
            aria-label="Close offer details"
          >
            ×
          </button>
        ) : null}

        <p className="text-[10px] uppercase tracking-[0.28em] text-gold mb-4">Salon Offer</p>
        <PromoOfferCard
          promo={promo}
          onCopy={onCopy}
          preview={preview}
          className="border-0 bg-transparent p-0"
        />
      </div>
    </div>
  );
}
