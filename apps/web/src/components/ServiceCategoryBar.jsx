/**
 * Horizontal category tabs with edge fade masks (native scroll — no drag handlers).
 */

export function useCategoryFade(onSelect) {
  const changeCategory = (nextCategory, currentCategory, setVisible) => {
    if (nextCategory === currentCategory) return;
    setVisible(false);
    window.setTimeout(() => {
      onSelect(nextCategory);
      setVisible(true);
    }, 200);
  };

  return { changeCategory };
}

export default function ServiceCategoryBar({
  tabs,
  activeCategory,
  onSelect,
  fadeFrom,
  inactiveClassName,
}) {
  return (
    <div className="relative">
      <div
        className="flex gap-2 overflow-x-auto no-scrollbar pb-2 scroll-smooth overscroll-x-contain"
        style={{ WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none' }}
      >
        {tabs.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(category)}
            className={`px-4 py-2 rounded-full text-sm font-heading whitespace-nowrap transition-all flex-shrink-0 ${
              activeCategory === category
                ? 'bg-gold text-charcoal'
                : inactiveClassName
            }`}
          >
            {category}
          </button>
        ))}
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-8"
        style={{ background: `linear-gradient(to right, ${fadeFrom}, transparent)` }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-8"
        style={{ background: `linear-gradient(to left, ${fadeFrom}, transparent)` }}
        aria-hidden
      />
    </div>
  );
}
