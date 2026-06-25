const DEFAULT_PALETTE = {
  outer: '#8B5E4A',
  mid: '#6B4A3A',
  inner: '#F5E6D8',
  text: '#4A3028',
  highlight: '#C9A88A',
};

export default function FoundingWaxSeal({ size, className = '', palette = DEFAULT_PALETTE }) {
  const dimension = size || '100%';
  const rays = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <svg
      viewBox="0 0 80 80"
      width={dimension}
      height={dimension}
      className={`block ${className}`.trim()}
      aria-hidden="true"
      role="img"
    >
      <defs>
        <radialGradient id="fmSealWax" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor={palette.highlight} />
          <stop offset="55%" stopColor={palette.outer} />
          <stop offset="100%" stopColor={palette.mid} />
        </radialGradient>
      </defs>
      <circle cx="40" cy="40" r="36" fill="url(#fmSealWax)" stroke={palette.mid} strokeWidth="1.5" />
      <circle cx="40" cy="40" r="30" fill="none" stroke={palette.mid} strokeWidth="0.75" opacity="0.55" />
      <circle cx="40" cy="40" r="24" fill={palette.inner} stroke={palette.outer} strokeWidth="1.25" />
      {rays.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 40 + Math.cos(rad) * 26;
        const y1 = 40 + Math.sin(rad) * 26;
        const x2 = 40 + Math.cos(rad) * 32;
        const y2 = 40 + Math.sin(rad) * 32;
        return (
          <line
            key={deg}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={palette.outer}
            strokeWidth="0.9"
            opacity="0.6"
          />
        );
      })}
      <text x="40" y="46" textAnchor="middle" fill={palette.text} fontSize="16" fontWeight="700">
        FM
      </text>
    </svg>
  );
}
