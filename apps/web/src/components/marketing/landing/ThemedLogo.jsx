import clsx from 'clsx';
import { useAppTheme } from '../../../hooks/useAppTheme.js';

export default function ThemedLogo({ className, withText = true, textClassName }) {
  const { themeConfig } = useAppTheme();
  const logoType = themeConfig.branding?.logoType ?? 'monogram';

  if (themeConfig.branding?.logoUrl && logoType !== 'text') {
    return (
      <img
        src={themeConfig.branding.logoUrl}
        alt="Nail Couture"
        className={clsx('h-10 w-auto object-contain', className)}
      />
    );
  }

  return (
    <div className={clsx('flex flex-col items-center leading-none', className)}>
      <span
        className="landing-logo-nc"
        style={{ fontSize: '1.9em' }}
        aria-hidden="true"
      >
        NC
      </span>
      {withText && (
        <span
          className={clsx('landing-logo-name', textClassName)}
          style={{ fontSize: '0.62em', marginTop: '0.15em' }}
        >
          Nail Couture
        </span>
      )}
    </div>
  );
}
