import clsx from 'clsx';

const STAR_PATH =
  'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

export default function StarRatingDisplay({
  rating = 0,
  max = 5,
  size = 'sm',
  showValue = false,
  className,
}) {
  const numeric = Number(rating) || 0;
  const displayRating = Math.round(numeric * 2) / 2;
  const sizeClass = size === 'lg' ? 'w-5 h-5' : size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';

  return (
    <div className={clsx('inline-flex items-center gap-0.5', className)} aria-label={`${numeric} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const filled = displayRating >= starValue;
        const half = !filled && displayRating >= starValue - 0.5;
        return (
          <svg
            key={i}
            viewBox="0 0 24 24"
            className={clsx(sizeClass, filled || half ? 'text-gold' : 'text-gold/20')}
            fill={filled ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={filled ? 0 : 1.5}
            aria-hidden
          >
            {half && (
              <defs>
                <clipPath id={`half-star-${i}`}>
                  <rect x="0" y="0" width="12" height="24" />
                </clipPath>
              </defs>
            )}
            {half ? (
              <>
                <path d={STAR_PATH} fill="currentColor" clipPath={`url(#half-star-${i})`} />
                <path d={STAR_PATH} fill="none" stroke="currentColor" strokeWidth={1.5} />
              </>
            ) : (
              <path d={STAR_PATH} />
            )}
          </svg>
        );
      })}
      {showValue && numeric > 0 && (
        <span className="ml-1.5 text-gold font-heading text-sm tabular-nums">{numeric.toFixed(1)}</span>
      )}
    </div>
  );
}
