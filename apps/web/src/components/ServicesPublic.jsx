import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { buildCategoryTabs, fetchServiceCategories, getDisplayCategories } from '@nail-couture/shared/utils/serviceCategories';
import ServiceCategoryBar, { useCategoryFade } from './ServiceCategoryBar';

export default function ServicesPublic() {
  const { theme } = useTheme();
  const [services, setServices] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [contentVisible, setContentVisible] = useState(true);
  const isFirstCategoryRender = useRef(true);

  useEffect(() => {
    fetchServices();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (activeCategory === 'All') return;
    const { sortedCategories } = buildCategoryTabs(services, dbCategories);
    if (!sortedCategories.includes(activeCategory)) {
      setActiveCategory('All');
      setExpandedCategory(null);
    }
  }, [services, dbCategories, activeCategory]);

  const { changeCategory } = useCategoryFade((cat) => {
    setActiveCategory(cat);
    setExpandedCategory(null);
  });

  const handleCategorySelect = (cat) => {
    changeCategory(cat, activeCategory, setContentVisible);
  };

  useEffect(() => {
    if (isFirstCategoryRender.current) {
      isFirstCategoryRender.current = false;
      return;
    }
    setContentVisible(true);
  }, [activeCategory]);

  const fetchServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('*')
      .order('category', { ascending: true })
      .order('price', { ascending: true });
    setServices(data || []);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const data = await fetchServiceCategories(supabase);
    setDbCategories(data);
  };

  const { grouped: groupedServices, sortedCategories, categoryTabs } = buildCategoryTabs(services, dbCategories);
  const displayCategories = getDisplayCategories(activeCategory, sortedCategories);
  const fadeFrom = theme === 'dark' ? '#1a1a1a' : '#fdf8f0';
  const inactiveClass = theme === 'dark'
    ? 'border border-gold/30 text-offwhite/60 hover:border-gold hover:text-gold'
    : 'border border-gold/30 text-charcoal/60 hover:border-gold hover:text-gold';

  return (
    <div className={`min-h-screen w-full overflow-x-hidden ${theme === 'dark' ? 'bg-charcoal' : 'bg-cream'}`}>
      <div className={`sticky top-0 z-50 ${theme === 'dark' ? 'bg-charcoal' : 'bg-cream'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="text-gold font-heading text-xl">Services & Pricing</div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
          <ServiceCategoryBar
            tabs={categoryTabs}
            activeCategory={activeCategory}
            onSelect={handleCategorySelect}
            fadeFrom={fadeFrom}
            inactiveClassName={inactiveClass}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl sm:text-5xl text-gold mb-4">Our Services</h1>
          <p className={`text-lg max-w-2xl mx-auto ${theme === 'dark' ? 'text-offwhite/60' : 'text-charcoal/60'}`}>
            Expert craftsmanship in nail couture. Each service is performed with precision,
            medical-grade sterilization, and premium non-toxic products.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-gold animate-pulse text-lg">Loading services...</div>
          </div>
        ) : (
          <div
            className={`space-y-4 transition-opacity duration-300 ease-out ${contentVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            {displayCategories.map((category) => {
              const isOpen = displayCategories.length === 1 || expandedCategory === category;
              return (
                <div key={category} className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-gold/20 bg-white/2' : 'border-gold/30 bg-white/50'}`}>
                  <button
                    type="button"
                    onClick={() => setExpandedCategory(isOpen ? null : category)}
                    className={`w-full flex items-center justify-between px-6 py-4 transition-colors ${theme === 'dark' ? 'hover:bg-white/3' : 'hover:bg-white/70'}`}
                  >
                    <div className="flex items-center gap-3">
                      <h2 className={`font-heading text-xl ${theme === 'dark' ? 'text-offwhite' : 'text-charcoal'}`}>{category}</h2>
                      <span className={`text-sm ${theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40'}`}>({groupedServices[category].length})</span>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gold transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {groupedServices[category].map((service) => (
                        <div
                          key={service.id}
                          className={`border border-gold/10 rounded-xl p-5 hover:border-gold/30 transition-all ${theme === 'dark' ? 'bg-white/3' : 'bg-white/70'}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className={`font-heading text-lg ${theme === 'dark' ? 'text-offwhite' : 'text-charcoal'}`}>{service.name}</h3>
                            <span className="text-gold font-heading text-xl">${service.price?.toFixed(0)}</span>
                          </div>
                          {service.description && (
                            <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50'}`}>{service.description}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className={`text-sm ${theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40'}`}>~{service.duration_minutes} min</span>
                            <a
                              href="/about#contact"
                              className="px-4 py-2 bg-gold text-charcoal hover:bg-gold/90 font-heading text-xs rounded-lg transition-colors"
                            >
                              Contact Us
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-16 text-center">
          <div className="bg-gold/10 border border-gold/30 rounded-xl p-8 max-w-2xl mx-auto">
            <h3 className="font-heading text-2xl text-gold mb-2">Need Help Scheduling?</h3>
            <p className={`mb-6 ${theme === 'dark' ? 'text-offwhite/60' : 'text-charcoal/60'}`}>Please contact us so we can schedule your visit.</p>
            <a
              href="/about#contact"
              className="inline-block px-8 py-3 bg-gold text-charcoal hover:bg-gold/90 font-heading text-lg rounded-lg transition-colors"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
