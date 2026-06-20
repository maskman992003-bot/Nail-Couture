export default function DiamondCrownAccent({ className = '', style = {}, color = 'currentColor' }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 280 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M20 22 L140 22" stroke={color} strokeWidth="0.5" opacity="0.35" />
      <path d="M140 22 L260 22" stroke={color} strokeWidth="0.5" opacity="0.35" />
      <path
        d="M128 24 L134 14 L140 20 L146 14 L152 24 L140 28 Z"
        stroke={color}
        strokeWidth="1"
        fill="none"
        opacity="0.75"
      />
      <circle cx="134" cy="16" r="1.5" fill={color} opacity="0.6" />
      <circle cx="146" cy="16" r="1.5" fill={color} opacity="0.6" />
      <circle cx="140" cy="20" r="1.5" fill={color} opacity="0.6" />
    </svg>
  );
}
