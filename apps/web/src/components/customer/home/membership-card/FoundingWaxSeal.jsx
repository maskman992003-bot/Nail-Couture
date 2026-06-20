export default function FoundingWaxSeal({ palette, size = 44, className = '' }) {
  const p = palette || {
    outer: '#C5A059',
    mid: '#8B6914',
    inner: '#1A1A1F',
    text: '#E8D5A3',
    highlight: '#F5E6C8',
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Founding member seal"
    >
      <defs>
        <radialGradient id="sealWax" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor={p.highlight} />
          <stop offset="55%" stopColor={p.outer} />
          <stop offset="100%" stopColor={p.mid} />
        </radialGradient>
        <filter id="sealShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor={p.mid} floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter="url(#sealShadow)">
        <circle cx="40" cy="40" r="36" fill="url(#sealWax)" stroke={p.mid} strokeWidth="1.5" />
        <circle cx="40" cy="40" r="30" fill="none" stroke={p.mid} strokeWidth="0.75" opacity="0.55" />
        <circle cx="40" cy="40" r="24" fill={p.inner} stroke={p.outer} strokeWidth="1.25" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <line
              key={deg}
              x1={40 + Math.cos(rad) * 26}
              y1={40 + Math.sin(rad) * 26}
              x2={40 + Math.cos(rad) * 32}
              y2={40 + Math.sin(rad) * 32}
              stroke={p.outer}
              strokeWidth="0.9"
              opacity="0.6"
            />
          );
        })}
        <text
          x="40"
          y="46"
          textAnchor="middle"
          fill={p.text}
          fontSize="16"
          fontFamily="'Playfair Display', Georgia, serif"
          fontWeight="700"
          letterSpacing="1"
        >
          FM
        </text>
      </g>
    </svg>
  );
}
