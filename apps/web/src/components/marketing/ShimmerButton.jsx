import clsx from 'clsx';

export default function ShimmerButton({
  label,
  onClick,
  shimmerActive = false,
  variant = 'secondary',
  className,
  type = 'button',
  children,
}) {
  const isPrimary = variant === 'primary';

  return (
    <button
      type={type}
      onClick={onClick}
      className={clsx(
        'group flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] transition duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.02] animate-fade-in',
        isPrimary
          ? 'bg-gold text-charcoal hover:bg-gold/90 shadow-[0_0_40px_rgba(197,160,89,0.18)]'
          : 'border border-charcoal/20 bg-charcoal/5 text-charcoal hover:border-gold hover:bg-gold/10 hover:text-gold dark:border-white/10 dark:bg-white/5 dark:text-offwhite dark:hover:border-gold dark:hover:bg-gold/10 dark:hover:text-gold',
        shimmerActive && isPrimary && 'nc-shimmer-btn',
        className,
      )}
    >
      {children}
      {label}
    </button>
  );
}
