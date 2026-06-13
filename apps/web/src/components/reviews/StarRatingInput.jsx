import clsx from 'clsx';

const STAR_PATH =
  'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

export default function StarRatingInput({ value, onChange, max = 5, disabled = false, className }) {
  return (
    <div className={clsx('flex items-center gap-1', className)} role="group" aria-label="Rating">
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const active = value >= starValue;
        return (
          <button
            key={starValue}
            type="button"
            disabled={disabled}
            onClick={() => onChange(starValue)}
            className={clsx(
              'p-1 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
            aria-label={`${starValue} star${starValue === 1 ? '' : 's'}`}
            aria-pressed={active}
          >
            <svg
              viewBox="0 0 24 24"
              className={clsx('w-8 h-8', active ? 'text-gold' : 'text-gold/25 hover:text-gold/50')}
              fill={active ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={active ? 0 : 1.5}
            >
              <path d={STAR_PATH} />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
