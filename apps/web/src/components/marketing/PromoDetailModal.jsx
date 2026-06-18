import clsx from 'clsx';
import { useAppTheme } from '../../hooks/useAppTheme.js';
import PromoDetailHeader from './PromoDetailHeader.jsx';
import PromoOfferCard from './PromoOfferCard';

export default function PromoDetailModal({
  promo,
  onClose,
  onCopy,
  preview = false,
}) {
  const { themeConfig } = useAppTheme();

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
          promo.show_shimmer_cta && 'nc-shimmer-surface',
        )}
        style={{
          borderColor: themeConfig.borderColor,
          backgroundColor: themeConfig.cardStyle.background,
          color: themeConfig.textPrimary,
        }}
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

        <PromoDetailHeader themeConfig={themeConfig} />
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
