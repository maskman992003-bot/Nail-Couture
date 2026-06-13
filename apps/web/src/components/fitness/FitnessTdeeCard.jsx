import { Zap, TrendingDown, Minus, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useTheme } from '../../contexts/ThemeContext';

function CalorieSubCard({ label, value, icon: Icon, accent }) {
  return (
    <div
      className={clsx(
        'rounded-lg border p-3 transition-all duration-300 ease-in-out',
        accent === 'loss' && 'border-green-500/20 bg-green-500/5',
        accent === 'maintain' && 'border-gold/20 bg-gold/5',
        accent === 'gain' && 'border-yellow-500/20 bg-yellow-500/5',
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-gold" aria-hidden />
        <span className="text-[10px] uppercase tracking-wider text-secondary">{label}</span>
      </div>
      <motion.p
        key={String(value)}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="font-heading text-2xl text-primary"
      >
        {value ?? '—'}
        {value != null && <span className="text-xs text-secondary ml-1">kcal</span>}
      </motion.p>
    </div>
  );
}

export default function FitnessTdeeCard({ tdee, calorieTargets }) {
  const { theme } = useTheme();

  return (
    <div
      className={clsx(
        'rounded-xl border p-5 transition-all duration-300 ease-in-out',
        theme === 'dark' ? 'border-gold/20 bg-offwhite/5' : 'border-gold/30 bg-white',
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-secondary mb-1">TDEE</p>
          <p className="text-xs text-muted">Total Daily Energy Expenditure</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold">
          <Zap className="h-5 w-5" aria-hidden />
        </div>
      </div>

      <motion.div
        key={String(tdee)}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex items-baseline gap-2 mb-5"
      >
        <span className="font-heading text-4xl text-gold-strong">{tdee ?? '—'}</span>
        {tdee != null && <span className="text-sm text-secondary">kcal / day</span>}
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CalorieSubCard
          label="Weight Loss"
          value={calorieTargets?.weightLoss}
          icon={TrendingDown}
          accent="loss"
        />
        <CalorieSubCard
          label="Maintenance"
          value={calorieTargets?.maintenance}
          icon={Minus}
          accent="maintain"
        />
        <CalorieSubCard
          label="Muscle Gain"
          value={calorieTargets?.muscleGain}
          icon={TrendingUp}
          accent="gain"
        />
      </div>
    </div>
  );
}
