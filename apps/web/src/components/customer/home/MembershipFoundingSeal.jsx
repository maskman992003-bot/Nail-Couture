export default function MembershipFoundingSeal({ size = 56, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <circle cx="40" cy="40" r="38" stroke="#C5A059" strokeWidth="1.5" opacity="0.9" />
      <circle cx="40" cy="40" r="32" stroke="#C5A059" strokeWidth="0.75" opacity="0.55" />
      <circle cx="40" cy="40" r="26" fill="#1A1A1F" stroke="#C5A059" strokeWidth="1.25" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 40 + Math.cos(rad) * 28;
        const y1 = 40 + Math.sin(rad) * 28;
        const x2 = 40 + Math.cos(rad) * 34;
        const y2 = 40 + Math.sin(rad) * 34;
        return (
          <line
            key={deg}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#C5A059"
            strokeWidth="1"
            opacity="0.65"
          />
        );
      })}
      <text
        x="40"
        y="46"
        textAnchor="middle"
        fill="#E8D5A3"
        fontSize="18"
        fontFamily="'Playfair Display', Georgia, serif"
        fontWeight="700"
        letterSpacing="1"
      >
        FM
      </text>
    </svg>
  );
}
