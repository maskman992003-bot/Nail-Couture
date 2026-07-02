import { useEffect, useState } from 'react';
import { getServices } from '@nail-couture/shared/services/services';
import { fetchServiceCategories, buildCategoryTabs, getDisplayCategories } from '@nail-couture/shared/utils/serviceCategories';
import { isServiceBookable, isAddOnBookable, isServiceMenuVisible } from '@nail-couture/shared/utils/serviceVisibility';
import { supabase } from '../lib/supabase';

export default function ServiceSelection({ onSelect, onBack, initialServices = [], initialAddOns = [] }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [selectedServices, setSelectedServices] = useState(initialServices || []);
  const [selectedAddOns, setSelectedAddOns] = useState(initialAddOns || []);
  const [dbCategories, setDbCategories] = useState([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([getServices(), fetchServiceCategories(supabase)])
      .then(([svcData, catData]) => {
        setServices(svcData);
        setDbCategories(catData);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (activeCategory === 'All') return;
    const { sortedCategories } = buildCategoryTabs(
      services.filter((s) => isServiceMenuVisible(s)),
      dbCategories,
    );
    if (!sortedCategories.includes(activeCategory)) {
      setActiveCategory('All');
      setExpandedCategory(null);
    }
  }, [services, dbCategories, activeCategory]);

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-gold animate-pulse">Loading services...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  const menuServices = services.filter((s) => isServiceMenuVisible(s));
  const addOns = services.filter((s) => isAddOnBookable(s));
  const selectedAddOnDetails = addOns.filter((a) => selectedAddOns.includes(a.id));
  const totalPrice =
    selectedServices.reduce((sum, s) => sum + (s.price || 0), 0) +
    selectedAddOnDetails.reduce((sum, a) => sum + (a.price || 0), 0);

  const { grouped: groupedServices, sortedCategories, categoryTabs } = buildCategoryTabs(menuServices, dbCategories);
  const displayCategories = getDisplayCategories(activeCategory, sortedCategories);
  const showAllCategories = activeCategory === 'All';

  const toggleService = (service) => {
    if (!isServiceBookable(service)) return;
    setSelectedServices((prev) =>
      prev.some((s) => s.id === service.id)
        ? prev.filter((s) => s.id !== service.id)
        : [...prev, service],
    );
  };

  const toggleAddOn = (id) => {
    setSelectedAddOns((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="relative min-h-screen bg-primary text-primary flex flex-col p-4 sm:p-8 pt-16 sm:pt-20 animate-fade-in overflow-y-auto">
      <button
        onClick={onBack}
        className="absolute top-6 left-6 text-secondary hover:text-gold-strong transition-colors z-10"
        aria-label="Go back"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="w-full max-w-3xl mx-auto flex-1">
        <div className="text-center mb-6">
          <h2 className="font-heading text-3xl text-gold mb-2">Select Your Services</h2>
          <p className="text-secondary">Choose one or more treatments</p>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x w-full px-1 pb-3 mb-4">
          {categoryTabs.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setExpandedCategory(null);
              }}
              className={`px-4 py-2 rounded-full text-sm font-heading whitespace-nowrap transition-all flex-shrink-0 snap-start ${
                activeCategory === cat
                  ? 'bg-gold text-charcoal'
                  : 'border border-theme text-secondary hover:border-theme hover:text-gold-strong'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {menuServices.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-theme bg-card">
            <p className="text-secondary">No services available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayCategories.map((category) => {
              const isOpen = showAllCategories || displayCategories.length === 1 || expandedCategory === category;
              return (
                <div key={category} className="rounded-xl border border-theme bg-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      if (showAllCategories) return;
                      setExpandedCategory(isOpen ? null : category);
                    }}
                    className={`w-full flex items-center justify-between px-5 py-3 transition-colors ${
                      showAllCategories ? 'cursor-default' : 'hover:bg-primary/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading text-base text-gold-strong">{category}</h3>
                      <span className="text-secondary text-xs">({groupedServices[category].length})</span>
                    </div>
                    {!showAllCategories && (
                      <svg
                        className={`w-4 h-4 text-gold-strong transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {groupedServices[category].map((service) => {
                        const isSelected = selectedServices.some((s) => s.id === service.id);
                        const canSelect = isServiceBookable(service);
                        return (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => toggleService(service)}
                            disabled={!canSelect}
                            className={`rounded-xl p-4 text-left border transition-all flex items-center gap-3 ${
                              !canSelect
                                ? 'border-light bg-primary/20 opacity-60 cursor-not-allowed'
                                : isSelected
                                  ? 'border-2 border-theme bg-primary/60'
                                  : 'border-light bg-primary/30 hover:border-theme'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center ${
                              isSelected ? 'border-gold bg-gold' : 'border-light'
                            }`}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-heading text-base text-primary">{service.name}</div>
                              <div className="text-muted text-xs">
                                {canSelect ? `${service.duration_minutes} min` : 'Coming soon'}
                              </div>
                            </div>
                            <div className="text-gold font-heading text-lg">${service.price}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedServices.length > 0 ? (
          <div className="mt-4 rounded-xl border border-theme bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-primary font-heading">
                  {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected
                </div>
                <div className="text-secondary text-xs">
                  {selectedServices.map((s) => s.name).join(', ')}
                </div>
              </div>
              <div className="text-gold font-heading text-xl">${totalPrice.toFixed(2)}</div>
            </div>

            {addOns.length > 0 ? (
              <div className="mb-3">
                <div className="text-muted text-xs uppercase tracking-widest mb-2">Add-Ons (Optional)</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {addOns.map((addOn) => (
                    <label
                      key={addOn.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedAddOns.includes(addOn.id) ? 'border-theme bg-card' : 'border-light hover:border-theme'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAddOns.includes(addOn.id)}
                        onChange={() => toggleAddOn(addOn.id)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                        selectedAddOns.includes(addOn.id) ? 'border-gold bg-gold' : 'border-light'
                      }`}>
                        {selectedAddOns.includes(addOn.id) ? (
                          <svg className="w-2.5 h-2.5 text-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : null}
                      </div>
                      <div className="flex-1">
                        <div className="text-primary font-heading text-sm">{addOn.name}</div>
                        <div className="text-muted text-xs">+{addOn.duration_minutes} min</div>
                      </div>
                      <div className="text-gold font-heading text-sm">+${addOn.price}</div>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <p className="text-center text-secondary text-sm mt-6 pb-4">Times are approximate to ensure couture quality.</p>

        {selectedServices.length > 0 ? (
          <div className="mt-2 mb-6 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in">
            <button
              type="button"
              onClick={onBack}
              className="min-w-[120px] px-5 py-3 rounded-full border border-light text-secondary text-sm font-heading uppercase tracking-[0.24em] hover:border-theme hover:text-gold-strong transition-all"
            >
              CANCEL
            </button>
            <button
              onClick={() => onSelect({ services: selectedServices, addOns: selectedAddOnDetails })}
              className="min-w-[140px] px-5 py-3 rounded-full bg-gold text-charcoal text-sm font-heading uppercase tracking-[0.24em] hover:bg-gold/90 transition-all"
            >
              CONFIRM
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
