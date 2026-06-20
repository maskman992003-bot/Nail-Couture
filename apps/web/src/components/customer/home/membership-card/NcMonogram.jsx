export default function NcMonogram({
  className = '',
  style = {},
  gradientId = 'ncMetallic',
  colors = ['#FFD3D9', '#C9897A', '#8B5E4A', '#B76E79'],
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 120 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="35%" stopColor={colors[1] || colors[0]} />
          <stop offset="70%" stopColor={colors[2] || colors[1]} />
          <stop offset="100%" stopColor={colors[3] || colors[2]} />
        </linearGradient>
        <filter id={`${gradientId}-emboss`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#8B5E4A" floodOpacity="0.35" />
          <feDropShadow dx="0" dy="-0.5" stdDeviation="0.5" floodColor="#FFFFFF" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter={`url(#${gradientId}-emboss)`}>
        <text
          x="18"
          y="58"
          fill={`url(#${gradientId})`}
          fontFamily="'Playfair Display', Georgia, serif"
          fontSize="52"
          fontWeight="600"
        >
          N
        </text>
        <path
          d="M62 18 C78 18, 92 28, 96 44 C100 58, 92 68, 78 68 C68 68, 58 62, 54 52"
          stroke={`url(#${gradientId})`}
          strokeWidth="4.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M54 52 C58 62, 68 72, 82 72 C96 72, 104 60, 100 44"
          stroke={`url(#${gradientId})`}
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
        />
      </g>
    </svg>
  );
}
