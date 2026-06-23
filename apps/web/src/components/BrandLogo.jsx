import { useAppTheme } from '../hooks/useAppTheme.js';

export default function BrandLogo({
  className = 'h-8 w-8 sm:h-10 sm:w-10',
  alt = 'Nail Couture',
  rounded = true,
  framed = false,
  frameClassName = 'p-1',
}) {
  const { logoUrl, themeConfig } = useAppTheme();

  const logo = (
    <img
      src={logoUrl}
      alt={alt}
      className={`object-contain ${rounded ? 'rounded-full bg-white' : ''} ${className}`.trim()}
    />
  );

  if (!framed) return logo;

  return (
    <div
      className={`flex items-center justify-center rounded-full ${frameClassName}`}
      style={{ boxShadow: `0 0 0 1px ${themeConfig.borderColor}` }}
    >
      {logo}
    </div>
  );
}
