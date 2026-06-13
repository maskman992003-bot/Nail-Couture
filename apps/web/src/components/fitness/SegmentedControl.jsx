import clsx from 'clsx';

export default function SegmentedControl({ tabs, value, onChange, className }) {
  return (
    <div
      className={clsx(
        'flex items-center gap-2 bg-secondary rounded-xl p-1 border border-light w-full sm:w-auto',
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          aria-pressed={value === tab.id}
          className={clsx(
            'flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out',
            value === tab.id
              ? 'bg-gold text-charcoal shadow-lg shadow-gold/20'
              : 'text-secondary hover:text-primary',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
