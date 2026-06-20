export default function AtelierOrchidAccent({ className = '', style = {}, color = 'currentColor', variant = 'full' }) {
  if (variant === 'icon') {
    return (
      <svg className={className} style={style} viewBox="0 0 40 32" fill="none" aria-hidden>
        <path d="M20 28 L20 14 M14 20 Q20 12 26 20" stroke={color} strokeWidth="1" opacity="0.7" />
        <ellipse cx="14" cy="18" rx="5" ry="8" stroke={color} strokeWidth="0.8" opacity="0.55" transform="rotate(-25 14 18)" />
        <ellipse cx="26" cy="18" rx="5" ry="8" stroke={color} strokeWidth="0.8" opacity="0.55" transform="rotate(25 26 18)" />
        <circle cx="20" cy="10" r="3" stroke={color} strokeWidth="0.7" opacity="0.6" />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 120 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M60 130 L60 70" stroke={color} strokeWidth="1" opacity="0.45" />
      <ellipse cx="38" cy="88" rx="14" ry="22" stroke={color} strokeWidth="1" opacity="0.4" transform="rotate(-20 38 88)" />
      <ellipse cx="82" cy="88" rx="14" ry="22" stroke={color} strokeWidth="1" opacity="0.4" transform="rotate(20 82 88)" />
      <ellipse cx="48" cy="72" rx="10" ry="16" stroke={color} strokeWidth="0.9" opacity="0.35" transform="rotate(-35 48 72)" />
      <ellipse cx="72" cy="72" rx="10" ry="16" stroke={color} strokeWidth="0.9" opacity="0.35" transform="rotate(35 72 72)" />
      <path d="M60 58 Q52 42 60 28 Q68 42 60 58" stroke={color} strokeWidth="1" opacity="0.5" />
      <circle cx="60" cy="24" r="6" stroke={color} strokeWidth="0.9" opacity="0.45" />
      <path d="M20 110 Q40 100 60 105 Q80 100 100 110" stroke={color} strokeWidth="0.6" opacity="0.3" />
    </svg>
  );
}
