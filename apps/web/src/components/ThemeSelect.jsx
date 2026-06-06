import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

export default function ThemeSelect({ value, onChange, options, className, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const selected = options.find((o) => o.value === value);
  const display = selected?.label ?? placeholder ?? 'Select';

  return (
    <div ref={ref} className={clsx('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={clsx(
          'w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between gap-2 text-sm transition-colors',
          'bg-input border border-input text-primary focus:border-gold focus:outline-none',
          open && 'border-gold',
        )}
      >
        <span className="truncate">{display}</span>
        <svg
          className={clsx('w-4 h-4 shrink-0 text-gold transition-transform', open && 'rotate-180')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-input bg-secondary shadow-xl overflow-hidden"
        >
          <div className="max-h-48 overflow-y-auto">
            {options.map((opt) => (
              <li key={opt.value} role="option" aria-selected={value === opt.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={clsx(
                    'w-full text-left px-3 py-2.5 text-sm transition-colors',
                    value === opt.value
                      ? 'bg-gold/15 text-gold'
                      : 'text-primary hover:bg-gold/5',
                  )}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </div>
        </ul>
      )}
    </div>
  );
}
