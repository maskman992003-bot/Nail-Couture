import clsx from 'clsx';
import { motion } from 'framer-motion';

const toneClasses = {
  success: 'bg-green-500/15 text-green-400 border-green-500/20',
  warning: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  danger: 'bg-red-500/15 text-red-400 border-red-500/20',
};

const toneClassesLight = {
  success: 'bg-green-100 text-green-700 border-green-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  danger: 'bg-red-100 text-red-700 border-red-200',
};

export default function FitnessMetricCard({
  title,
  value,
  unit,
  icon: Icon,
  status,
  theme = 'dark',
  children,
}) {
  const displayValue = value ?? '—';

  return (
    <div
      className={clsx(
        'rounded-xl border p-5 transition-all duration-300 ease-in-out',
        theme === 'dark'
          ? 'border-gold/20 bg-offwhite/5'
          : 'border-gold/30 bg-white',
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-secondary mb-1">{title}</p>
          {status?.label && status?.tone && (
            <span
              className={clsx(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                theme === 'dark' ? toneClasses[status.tone] : toneClassesLight[status.tone],
              )}
            >
              {status.label}
            </span>
          )}
        </div>
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <motion.span
          key={String(displayValue)}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="font-heading text-4xl text-gold-strong"
        >
          {displayValue}
        </motion.span>
        {unit && value != null && (
          <span className="text-sm text-secondary">{unit}</span>
        )}
      </div>

      {children}
    </div>
  );
}
