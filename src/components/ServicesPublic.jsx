import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';

export default function ServicesPublic() {
  const { theme } = useTheme();
  const [services, setServices] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const categoryScrollRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollRef = useRef(0);

  useEffect(() => {
    fetchServices();
    fetchCategories();
  }, []);

  const handleCategoryPointerDown = (event) => {
    if (!categoryScrollRef.current) return;
    isDraggingRef.current = true;
    dragStartXRef.current = event.clientX;
    dragStartScrollRef.current = categoryScrollRef.current.scrollLeft;
    categoryScrollRef.current.setPointerCapture(event.pointerId);
  };

  const handleCategoryPointerMove = (event) => {
    if (!isDraggingRef.current || !categoryScrollRef.current) return;
    const deltaX = event.clientX - dragStartXRef.current;
    categoryScrollRef.current.scrollLeft = dragStartScrollRef.current - deltaX;
  };

  const handleCategoryPointerUp = (event) => {
    if (!categoryScrollRef.current) return;
    isDraggingRef.current = false;
    categoryScrollRef.current.releasePointerCapture(event.pointerId);
  };

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
    const { data } = await supabase
      .from('service_categories')
      .select('*')
      .order('sort_order', { ascending: true });
    setDbCategories(data || []);
  };

  const groupedServices = services.reduce((acc, service) => {
    const cat = service.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(service);
    return acc;
  }, {});

  const categoryOrder = dbCategories.map((category) => category.name);
  const categoryOrderMap = new Map(categoryOrder.map((cat, index) => [cat, index]));

  const sortedCategories = Object.keys(groupedServices).sort((a, b) => {
    const aIdx = categoryOrderMap.has(a) ? categoryOrderMap.get(a) : 999;
    const bIdx = categoryOrderMap.has(b) ? categoryOrderMap.get(b) : 999;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.localeCompare(b);
  });

  const categories = ['All', ...sortedCategories];

  const displayCategories = activeCategory === 'All'
    ? sortedCategories
    : sortedCategories.filter((c) => c === activeCategory);

  return (
    <div className={`min-h-screen w-full overflow-x-hidden ${theme === 'dark' ? 'bg-charcoal' : 'bg-cream'}`}>
      <div className={`sticky top-0 z-50 ${theme === 'dark' ? 'bg-charcoal' : 'bg-cream'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="text-gold font-heading text-xl">Services & Pricing</div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
          <div
            ref={categoryScrollRef}
            onPointerDown={handleCategoryPointerDown}
            onPointerMove={handleCategoryPointerMove}
            onPointerUp={handleCategoryPointerUp}
            onPointerCancel={handleCategoryPointerUp}
            className="flex gap-2 overflow-x-auto no-scrollbar pb-1 cursor-grab"
            style={{ touchAction: 'pan-x' }}
          >
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setExpandedCategory(null); }}
                className={`px-4 py-2 rounded-full text-sm font-heading whitespace-nowrap transition-all flex-shrink-0 ${
                  activeCategory === cat
                    ? 'bg-gold text-charcoal'
                    : `border border-gold/30 hover:border-gold hover:text-gold ${theme === 'dark' ? 'text-offwhite/60' : 'text-charcoal/60'}`
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
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
          <div className="space-y-4">
            {displayCategories.map((category) => {
              const isOpen = displayCategories.length === 1 || expandedCategory === category;
              return (
                <div key={category} className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-gold/20 bg-white/2' : 'border-gold/30 bg-white/50'}`}>
                  <button
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