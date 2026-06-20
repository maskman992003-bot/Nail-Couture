import { useTiltSensor } from '../../hooks/useTiltSensor';

export default function TierCardBase({
  gradient,
  borderGradient,
  glowFounding = false,
  title,
  subtitle,
  titleColor = '#2A2A2A',
  children,
  onConciergePress,
  className = '',
}) {
  const { tiltX, tiltY } = useTiltSensor(true);
  const shiftX = tiltX * 8;
  const shiftY = tiltY * 6;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 p-5 min-h-[200px] flex flex-col justify-between transition-shadow ${className}`}
      style={{
        background: gradient,
        backgroundSize: '200% 200%',
        backgroundPosition: `${50 + shiftX}% ${40 + shiftY}%`,
        borderColor: glowFounding ? '#C5A059' : 'rgba(197,160,89,0.35)',
        boxShadow: glowFounding
          ? '0 0 24px rgba(197,160,89,0.45), inset 0 0 0 1px rgba(197,160,89,0.2)'
          : '0 8px 24px rgba(0,0,0,0.15)',
        ...(borderGradient ? { borderImage: `${borderGradient} 1` } : {}),
      }}
    >
      <div>
        <h3 className="font-heading text-xl tracking-wide" style={{ color: titleColor }}>{title}</h3>
        {subtitle ? (
          <p className="text-xs mt-1 leading-relaxed opacity-75" style={{ color: titleColor }}>{subtitle}</p>
        ) : null}
      </div>
      {children}
      {onConciergePress ? (
        <button
          type="button"
          onClick={onConciergePress}
          className="mt-3 self-start px-4 py-2 rounded-lg text-[11px] font-bold tracking-widest border border-gold/50 text-[#F5E6C8] bg-gold/20 hover:bg-gold/30 transition-colors"
        >
          Concierge
        </button>
      ) : null}
    </div>
  );
}
