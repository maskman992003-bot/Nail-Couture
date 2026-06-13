import clsx from 'clsx';
import { motion } from 'framer-motion';
import { Activity, Beaker, Calendar } from 'lucide-react';

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

function ResultCard({ title, icon: Icon, theme, status, children }) {
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
            <motion.span
              key={status.label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={clsx(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                theme === 'dark' ? toneClasses[status.tone] : toneClassesLight[status.tone],
              )}
            >
              {status.label}
            </motion.span>
          )}
        </div>
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

export default function NailResultCards({ diagnostics, healthStatus, theme = 'dark' }) {
  const {
    recommendedBaseLabel,
    maintenanceDays,
    monthsToRegrowth,
    prepProtocol,
  } = diagnostics || {};

  const regrowthDisplay = monthsToRegrowth != null ? monthsToRegrowth : '—';

  return (
    <div className="space-y-4">
      <ResultCard title="Recommended Chemistry" icon={Beaker} theme={theme} status={healthStatus}>
        <motion.p
          key={recommendedBaseLabel || 'empty'}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="font-heading text-2xl text-gold-strong"
        >
          {recommendedBaseLabel || '—'}
        </motion.p>
        <p className="text-xs text-secondary mt-2">
          Base system selected from nail structure and surface symptoms
        </p>
      </ResultCard>

      <ResultCard title="Prep Protocol" icon={Activity} theme={theme} status={null}>
        <ul className="space-y-2">
          {(prepProtocol?.steps || []).map((step, index) => (
            <motion.li
              key={`${index}-${step}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
              className="flex gap-2 text-sm text-primary"
            >
              <span className="text-gold font-medium shrink-0">{index + 1}.</span>
              <span>{step}</span>
            </motion.li>
          ))}
        </ul>
      </ResultCard>

      <ResultCard title="Maintenance Timeline" icon={Calendar} theme={theme} status={null}>
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-secondary mb-1">Next fill</p>
            <div className="flex items-baseline gap-2">
              <motion.span
                key={String(maintenanceDays)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="font-heading text-4xl text-gold-strong"
              >
                {maintenanceDays ?? '—'}
              </motion.span>
              {maintenanceDays != null && (
                <span className="text-sm text-secondary">days</span>
              )}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-secondary mb-1">Regrowth estimate</p>
            <div className="flex items-baseline gap-2">
              <motion.span
                key={String(regrowthDisplay)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="font-heading text-4xl text-gold-strong"
              >
                {regrowthDisplay}
              </motion.span>
              {monthsToRegrowth != null && (
                <span className="text-sm text-secondary">months</span>
              )}
            </div>
          </div>
        </div>
      </ResultCard>
    </div>
  );
}
