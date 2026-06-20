export default function PearlFloralAccent({ className = '', style = {}, color = 'currentColor' }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 280 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M8 28 Q20 22 32 28" stroke={color} strokeWidth="0.8" opacity="0.5" />
      <path
        d="M32 28 Q38 18 44 24 Q50 30 56 28 Q62 26 68 20 Q72 16 76 22 Q80 28 86 26"
        stroke={color}
        strokeWidth="0.9"
        opacity="0.55"
      />
      <ellipse cx="44" cy="22" rx="4" ry="6" stroke={color} strokeWidth="0.7" opacity="0.45" />
      <ellipse cx="72" cy="20" rx="4" ry="6" stroke={color} strokeWidth="0.7" opacity="0.45" />
      <path d="M86 26 L120 26" stroke={color} strokeWidth="0.6" opacity="0.4" />
      <circle cx="140" cy="26" r="5" stroke={color} strokeWidth="0.9" opacity="0.65" />
      <path d="M140 21 L140 16 M135 26 L130 26 M145 26 L150 26 M140 31 L140 36" stroke={color} strokeWidth="0.7" opacity="0.55" />
      <path d="M140 16 Q138 12 140 10 Q142 12 140 16" stroke={color} strokeWidth="0.6" opacity="0.5" />
      <path d="M130 26 Q128 22 126 24" stroke={color} strokeWidth="0.6" opacity="0.45" />
      <path d="M150 26 Q152 22 154 24" stroke={color} strokeWidth="0.6" opacity="0.45" />
      <path d="M140 36 Q138 40 140 42 Q142 40 140 36" stroke={color} strokeWidth="0.6" opacity="0.5" />
      <path d="M160 26 L194 26" stroke={color} strokeWidth="0.6" opacity="0.4" />
      <path
        d="M194 26 Q200 20 206 24 Q212 28 218 26 Q224 24 230 18 Q234 14 238 20 Q242 26 248 28"
        stroke={color}
        strokeWidth="0.9"
        opacity="0.55"
      />
      <ellipse cx="206" cy="22" rx="4" ry="6" stroke={color} strokeWidth="0.7" opacity="0.45" />
      <ellipse cx="234" cy="20" rx="4" ry="6" stroke={color} strokeWidth="0.7" opacity="0.45" />
      <path d="M248 28 Q260 22 272 28" stroke={color} strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
}
