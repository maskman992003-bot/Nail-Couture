import { useTheme } from '../../../../contexts/ThemeContext';

export default function VaultActiveCodes({ codes = [], onCodePress }) {
  const { theme } = useTheme();
  const muted = theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50';
  const cardBg = theme === 'dark' ? '#111' : '#fff';

  if (!codes.length) return null;

  return (
    <div
      className="rounded-2xl p-6 border"
      style={{ borderColor: 'rgba(197,160,89,0.3)', backgroundColor: cardBg }}
    >
      <p className={`text-[10px] uppercase tracking-widest mb-3 ${muted}`}>Your active codes</p>
      <p className={`text-xs mb-4 ${muted}`}>Show these at checkout before they are applied.</p>
      <ul className="space-y-3">
        {codes.map((code) => (
          <li key={code.points}>
            <button
              type="button"
              onClick={() => onCodePress?.(code.redemption_code, code.rewardLabel)}
              className="w-full text-left rounded-xl border border-gold/30 px-4 py-3 hover:bg-gold/5 transition-colors"
            >
              <p className="text-sm text-gold font-medium">{code.rewardLabel}</p>
              <p className={`text-xs mt-1 ${muted}`}>{code.redemption_code}</p>
              <p className={`text-[10px] mt-2 uppercase tracking-wider text-gold/70`}>Tap to view QR</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
