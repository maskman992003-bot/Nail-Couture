/**
 * @param {{
 *   checked?: boolean,
 *   disabled?: boolean,
 *   onChange?: (checked: boolean) => void,
 *   theme?: 'dark' | 'light',
 *   className?: string,
 *   ariaLabel?: string,
 * }} props
 */
export default function ToggleSwitch({
  checked = false,
  disabled = false,
  onChange,
  theme = 'dark',
  className = '',
  ariaLabel,
}) {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={className}
      style={{
        position: 'relative',
        display: 'inline-block',
        boxSizing: 'border-box',
        height: 24,
        width: 44,
        flexShrink: 0,
        margin: 0,
        padding: 0,
        borderRadius: 9999,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: checked ? '#C5A059' : isDark ? 'rgba(197, 160, 89, 0.5)' : 'rgba(197, 160, 89, 0.4)',
        backgroundColor: checked
          ? '#C5A059'
          : isDark
            ? 'rgba(0, 0, 0, 0.3)'
            : 'rgba(255, 255, 255, 0.8)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background-color 200ms ease, border-color 200ms ease',
        verticalAlign: 'middle',
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 4,
          left: checked ? 25 : 3,
          width: 16,
          height: 16,
          borderRadius: 9999,
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
          transition: 'left 200ms ease-in-out',
          pointerEvents: 'none',
        }}
      />
    </button>
  );
}
