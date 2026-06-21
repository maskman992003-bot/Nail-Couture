import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { getVaultMaxPoints, VAULT_MILESTONES } from '@nail-couture/shared/constants/loyaltyProgram.js';
import { mergeVaultMilestones } from '@nail-couture/shared/utils/vaultMilestones.js';
import { useTheme } from '../../../../contexts/ThemeContext';

const VIAL_WIDTH = 72;
const VIAL_HEIGHT = 220;

function milestoneY(points, maxPoints) {
  return VIAL_HEIGHT - 8 - (points / maxPoints) * (VIAL_HEIGHT - 16);
}

function dotColor(m, glowing, used) {
  if (used) return 'rgba(150,150,150,0.5)';
  if (m.canViewCode) return '#22c55e';
  if (glowing) return '#C5A059';
  return 'rgba(150,150,150,0.35)';
}

function VaultMilestoneButton({ milestone: m, muted, onMilestonePress, className = '', style }) {
  const glowing = m.canClaim;
  const used = Boolean(m.used_at);

  return (
    <button
      type="button"
      disabled={!m.tappable}
      onClick={() => onMilestonePress?.(m.points)}
      className={`flex flex-col items-start gap-0.5 text-left disabled:cursor-default min-w-0 ${className}`}
      style={style}
    >
      <span className="flex items-start gap-2 min-w-0 w-full">
        <span
          className={`shrink-0 rounded mt-1 ${glowing ? 'w-3.5 h-3.5 shadow-[0_0_8px_#C5A059]' : 'w-2 h-2'}`}
          style={{ backgroundColor: dotColor(m, glowing, used) }}
        />
        <span className={`text-xs leading-snug ${muted} break-words`}>
          {m.points} pts · {m.rewardLabel}
        </span>
      </span>
      {m.tappable || used ? (
        <span className={`text-[10px] pl-5 ${used ? muted : 'text-gold/70'}`}>{m.statusLabel}</span>
      ) : null}
    </button>
  );
}

function VaultVial({ fillRatio, merged, maxPoints }) {
  return (
    <div className="relative shrink-0" style={{ width: VIAL_WIDTH, height: VIAL_HEIGHT }}>
      <div
        className="absolute inset-1 rounded-[20px] border-2"
        style={{
          background: 'rgba(0,0,0,0.2)',
          borderColor: 'rgba(255,255,255,0.15)',
        }}
      />
      <motion.div
        className="absolute left-[10px] right-[10px] bottom-2 rounded-2xl overflow-hidden"
        initial={false}
        animate={{ height: (VIAL_HEIGHT - 16) * fillRatio }}
        transition={{ type: 'spring', damping: 18, stiffness: 120 }}
        style={{
          background: 'linear-gradient(to top, #8B6914, #C5A059)',
          maxHeight: VIAL_HEIGHT - 16,
        }}
      />
      {merged.map((m) => {
        const y = milestoneY(m.points, maxPoints);
        const glowing = m.canClaim;
        const used = Boolean(m.used_at);
        return (
          <span
            key={m.points}
            className={`absolute right-0 translate-x-1/2 rounded ${glowing ? 'w-3 h-3 shadow-[0_0_8px_#C5A059]' : 'w-2 h-2'}`}
            style={{
              top: y - (glowing ? 6 : 4),
              backgroundColor: dotColor(m, glowing, used),
            }}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}

export default function TheVault({ points, milestones = [], onMilestonePress }) {
  const { theme } = useTheme();
  const maxPoints = useMemo(() => getVaultMaxPoints(milestones), [milestones]);
  const fillRatio = Math.min(1, points / maxPoints);
  const muted = theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50';
  const cardBg = theme === 'dark' ? '#111' : '#fff';

  const merged = useMemo(
    () => mergeVaultMilestones(milestones, points, VAULT_MILESTONES),
    [milestones, points],
  );

  return (
    <div
      className="w-full min-w-0 rounded-2xl p-4 sm:p-6 border overflow-hidden"
      style={{ borderColor: 'rgba(197,160,89,0.3)', backgroundColor: cardBg }}
    >
      <p className={`text-[10px] uppercase tracking-widest mb-4 ${muted}`}>The Vault</p>

      <div className="flex flex-row items-start gap-4 sm:gap-6 w-full min-w-0">
        <VaultVial fillRatio={fillRatio} merged={merged} maxPoints={maxPoints} />

        <div
          className="relative flex-1 min-w-0 self-start"
          style={{ height: VIAL_HEIGHT }}
        >
          {merged.map((m) => (
            <VaultMilestoneButton
              key={m.points}
              milestone={m}
              muted={muted}
              onMilestonePress={onMilestonePress}
              className="absolute left-0 right-0 pr-1"
              style={{ top: milestoneY(m.points, maxPoints) - 10 }}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gold/10 text-center">
        <p className="font-heading text-2xl sm:text-3xl text-gold">{points}</p>
        <p className={`text-sm ${muted}`}>points in vault</p>
        <p className={`text-xs ${muted} mt-2 mx-auto max-w-xs sm:max-w-sm`}>
          Claiming a reward deducts points and gives a code to use at checkout.
        </p>
      </div>
    </div>
  );
}
