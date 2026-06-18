import clsx from 'clsx';
import BrandLogo from '../BrandLogo.jsx';

/**
 * Skin-aware promo logo — left-aligned variant of landing ThemedLogo rules.
 */
export default function PromoModalLogo({ themeConfig, className }) {
  const logoType = themeConfig.branding?.logoType ?? 'monogram';
  const logoUrl = themeConfig.branding?.logoUrl;
  const headingStyle = { fontFamily: themeConfig.fonts?.heading };

  if (logoUrl && logoType === 'image') {
    return (
      <div
        className={clsx('flex items-center justify-center rounded-full p-1', className)}
        style={{ boxShadow: `0 0 0 1px ${themeConfig.borderColor}` }}
      >
        <BrandLogo className="h-10 w-10 sm:h-11 sm:w-11" />
      </div>
    );
  }

  if (logoUrl && logoType !== 'text') {
    return (
      <img
        src={logoUrl}
        alt="Nail Couture"
        className={clsx('h-10 w-auto object-contain', className)}
      />
    );
  }

  return (
    <div className={clsx('flex flex-col items-start leading-none', className)}>
      <span
        className="font-heading text-2xl tracking-tight text-gold-strong"
        style={headingStyle}
        aria-hidden="true"
      >
        NC
      </span>
      <span
        className="mt-0.5 font-heading text-[10px] uppercase tracking-[0.24em] text-gold-strong"
        style={headingStyle}
      >
        Nail Couture
      </span>
    </div>
  );
}
