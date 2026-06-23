import { useAppTheme } from '../hooks/useAppTheme.js';

export default function BrandLogo({ className = 'h-8 w-8 sm:h-10 sm:w-10', alt = 'Nail Couture', rounded = true }) {
  const { logoUrl } = useAppTheme();

  return (
    <img
      src={logoUrl}
      alt={alt}
      className={`object-contain ${rounded ? 'rounded-full bg-white' : ''} ${className}`.trim()}
    />
  );
}
