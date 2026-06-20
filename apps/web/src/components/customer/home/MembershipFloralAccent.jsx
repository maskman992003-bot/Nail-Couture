export default function MembershipFloralAccent({ className = '', style = {} }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 120 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M60 20 C45 35 35 55 38 75 C40 90 52 98 60 105 C68 98 80 90 82 75 C85 55 75 35 60 20Z"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.55"
      />
      <path
        d="M60 105 L60 145 M45 120 Q60 110 75 120 M50 135 Q60 128 70 135"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.45"
      />
      <ellipse cx="48" cy="58" rx="8" ry="12" stroke="currentColor" strokeWidth="0.8" opacity="0.35" />
      <ellipse cx="72" cy="58" rx="8" ry="12" stroke="currentColor" strokeWidth="0.8" opacity="0.35" />
    </svg>
  );
}
