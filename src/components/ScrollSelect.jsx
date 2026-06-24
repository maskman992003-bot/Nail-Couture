import { useState, useRef, useEffect } from 'react';

export default function ScrollSelect({ value, onChange, options, placeholder, className, theme }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const selected = options.find(o => o.value === value);
  const display = selected ? selected.label : placeholder || 'Select';
  const usesSkinTokens = theme == null;

  const triggerClass = usesSkinTokens
    ? 'bg-input border border-input text-primary focus:outline-none focus:border-gold'
    : theme === 'dark'
      ? 'bg-offwhite/10 border border-offwhite/20 text-offwhite focus:border-gold'
      : 'bg-charcoal/10 border border-charcoal/20 text-charcoal focus:border-gold';

  const dropdownClass = usesSkinTokens
    ? 'bg-secondary border border-input'
    : '';

  const dropdownStyle = usesSkinTokens
    ? undefined
    : { background: theme === 'dark' ? '#1a1a1a' : '#fff' };

  const optionClass = (opt) => {
    if (value === opt.value) return 'bg-gold/20 text-gold';
    if (usesSkinTokens) return 'text-primary hover:bg-input';
    return theme === 'dark'
      ? 'text-offwhite hover:bg-white/5'
      : 'text-charcoal hover:bg-charcoal/5';
  };

  return (
    <div ref={ref} className={`relative ${className || ''}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full px-4 py-3 rounded-lg text-left flex items-center justify-between transition-colors ${triggerClass} ${open ? 'border-gold' : ''}`}
      >
        <span className={value ? '' : 'text-muted'}>{display}</span>
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          className={`absolute z-50 left-0 right-0 mt-1 rounded-lg border border-gold/20 overflow-hidden shadow-xl ${dropdownClass}`}
          style={dropdownStyle}
        >
          <div className="max-h-40 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${optionClass(opt)}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
