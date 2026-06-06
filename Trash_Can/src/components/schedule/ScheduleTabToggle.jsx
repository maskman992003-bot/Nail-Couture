export default function ScheduleTabToggle({ tabs, activeTab, onChange }) {
  return (
    <div className="flex items-center gap-2 bg-secondary rounded-xl p-1 border border-light w-full sm:w-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          aria-pressed={activeTab === tab.id}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
            activeTab === tab.id
              ? 'bg-gold text-charcoal shadow-lg shadow-gold/20'
              : 'text-secondary hover:text-primary'
          }`}
        >
          {tab.label}
          {tab.badge != null && tab.badge > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold bg-gold text-charcoal">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
