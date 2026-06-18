import PromoModalLogo from './PromoModalLogo.jsx';

export default function PromoDetailHeader({ themeConfig }) {
  return (
    <div className="relative mb-5 flex min-h-11 items-center">
      <div className="shrink-0">
        <PromoModalLogo themeConfig={themeConfig} />
      </div>
      <p
        id="promo-detail-title"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.28em] text-gold whitespace-nowrap"
      >
        Salon Offer
      </p>
    </div>
  );
}
