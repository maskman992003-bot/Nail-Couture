import clsx from 'clsx';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Full editorial offer card — used in detail modal and admin preview.
 */
export default function PromoOfferCard({
  promo,
  onCopy,
  preview = false,
  className,
}) {
  const { theme } = useTheme();

  if (!promo) return null;

  const chipClass = clsx(
    'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs transition-colors motion-reduce:transition-none',
    theme === 'dark'
      ? 'border-gold/25 text-gold hover:border-gold/60 hover:bg-gold/5'
      : 'border-gold/35 text-gold-strong hover:border-gold/60 hover:bg-gold/[0.06]',
  );

  return (
    <article
      className={clsx(
        'rounded-2xl border p-6',
        theme === 'dark'
          ? 'border-gold/20 bg-offwhite/[0.02]'
          : 'border-gold/30 bg-white',
        className,
      )}
    >
      <div className="mb-3">
        {promo.subtitle ? (
          <p className="text-[10px] uppercase tracking-wider text-secondary mb-1">
            {promo.subtitle}
          </p>
        ) : null}
        <h3 className="font-heading text-xl text-gold-strong">{promo.title}</h3>
      </div>

      {promo.body ? (
        <p className={`text-sm mb-4 leading-relaxed ${theme === 'dark' ? 'text-offwhite/65' : 'text-charcoal/65'}`}>
          {promo.body}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {promo.discount_label ? (
          <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold-strong">
            {promo.discount_label}
          </span>
        ) : null}
        {promo.promo_code && !preview && onCopy ? (
          <button type="button" onClick={() => onCopy(promo)} className={chipClass}>
            <span className="uppercase tracking-[0.2em] font-medium">Copy Code</span>
            <span className="font-mono tracking-wider">{promo.promo_code}</span>
          </button>
        ) : null}
        {promo.promo_code && preview ? (
          <span className={clsx(chipClass, 'cursor-default')}>
            <span className="uppercase tracking-[0.2em] font-medium">Copy Code</span>
            <span className="font-mono tracking-wider">{promo.promo_code}</span>
          </span>
        ) : null}
      </div>
    </article>
  );
}
