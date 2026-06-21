import fmBadge from '../../../../assets/membership/FM.png';

export default function FoundingWaxSeal({ size, className = '' }) {
  const dimensionStyle = size ? { width: size, height: size } : undefined;

  return (
    <img
      src={fmBadge}
      alt="Founding member seal"
      style={dimensionStyle}
      className={`block object-contain rounded-xl ${size ? '' : 'w-full h-full'} ${className}`.trim()}
      draggable={false}
      decoding="async"
    />
  );
}
