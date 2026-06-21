import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { getVaultMaxPoints, VAULT_MILESTONES } from '@nail-couture/shared/constants/loyaltyProgram.js';
import { mergeVaultMilestones } from '@nail-couture/shared/utils/vaultMilestones.js';
import { useTheme } from '../../../../contexts/ThemeContext';

const VIAL_HEIGHT = 220;

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
      className="rounded-2xl p-6 border flex flex-col md:flex-row items-center gap-6"
      style={{ borderColor: 'rgba(197,160,89,0.3)', backgroundColor: cardBg }}
    >
      <div className="flex flex-col items-center">
        <p className={`text-[10px] uppercase tracking-widest mb-3 ${muted}`}>The Vault</p>
        <div className="relative" style={{ width: 72, height: VIAL_HEIGHT }}>
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
            const y = VIAL_HEIGHT - 8 - (m.points / maxPoints) * (VIAL_HEIGHT - 16);
            const glowing = m.canClaim;
            const used = Boolean(m.used_at);
            return (
              <button
                key={m.points}
                type="button"
                disabled={!m.tappable}
                onClick={() => onMilestonePress?.(m.points)}
                className="absolute flex flex-col items-start gap-0.5 text-left disabled:cursor-default"
                style={{ top: y - 10, left: 80, minWidth: 160 }}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`shrink-0 rounded ${glowing ? 'w-3.5 h-3.5 shadow-[0_0_8px_#C5A059]' : 'w-2 h-2'}`}
                    style={{
                      backgroundColor: used
                        ? 'rgba(150,150,150,0.5)'
                        : m.canViewCode
                          ? '#22c55e'
                          : glowing
                            ? '#C5A059'
                            : 'rgba(150,150,150,0.35)',
                    }}
                  />
                  <span className={`text-xs ${muted}`}>
                    {m.points} pts · {m.rewardLabel}
                  </span>
                </span>
                {m.tappable || used ? (
                  <span className={`text-[10px] pl-5 ${used ? muted : 'text-gold/70'}`}>{m.statusLabel}</span>
                ) : null}
              </button>
            );
          })}
        </div>
        <p className="font-heading text-3xl text-gold mt-3">{points}</p>
        <p className={`text-sm ${muted}`}>points in vault</p>
        <p className={`text-xs ${muted} mt-2 text-center max-w-[200px]`}>
          Claiming a reward deducts points and gives a code to use at checkout.
        </p>
      </div>
    </div>
  );
}
