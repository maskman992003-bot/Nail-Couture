import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const CATEGORIES = ['All', 'Nail Art', 'Extensions', 'Russian Manicure', 'Treatment', 'Packages'];
const categoryOrder = ['Nail Art', 'Extensions', 'Russian Manicure', 'Treatment', 'Packages'];

export default function ServicesPublic() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedCategory, setExpandedCategory] = useState(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('*')
      .order('category', { ascending: true })
      .order('price', { ascending: true });
    setServices(data || []);
    setLoading(false);
  };

  const groupedServices = services.reduce((acc, service) => {
    const cat = service.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(service);
    return acc;
  }, {});

  const sortedCategories = Object.keys(groupedServices).sort((a, b) => {
    const aIdx = categoryOrder.indexOf(a);
    const bIdx = categoryOrder.indexOf(b);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

  const displayCategories = activeCategory === 'All'
    ? sortedCategories
    : sortedCategories.filter((c) => c === activeCategory);

  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ backgroundColor: '#0a0a0a' }}>
      <div className="sticky top-0 z-50 bg-charcoal border-b border-gold/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-4">
            <img src="/NC.jpg" alt="Nail Couture" className="h-12 w-auto" />
            <span className="font-heading text-gold text-xl hidden sm:block">Services & Pricing</span>
          </Link>
          <Link
            to="/booking"
            className="px-4 py-2 bg-gold text-charcoal hover:bg-gold/90 font-heading text-sm rounded-lg"
          >
            Book Appointment
          </Link>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setExpandedCategory(null); }}
                className={`px-4 py-2 rounded-full text-sm font-heading whitespace-nowrap transition-all flex-shrink-0 ${
                  activeCategory === cat
                    ? 'bg-gold text-charcoal'
                    : 'border border-gold/30 text-offwhite/60 hover:border-gold hover:text-gold'
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
          <p className="text-offwhite/60 text-lg max-w-2xl mx-auto">
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
                <div key={category} className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(197,160,89,0.2)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <button
                    onClick={() => setExpandedCategory(isOpen ? null : category)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/3 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <h2 className="font-heading text-xl text-offwhite">{category}</h2>
                      <span className="text-offwhite/40 text-sm">({groupedServices[category].length})</span>
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
                          className="bg-white/3 border border-gold/10 rounded-xl p-5 hover:border-gold/30 transition-all"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-heading text-lg text-offwhite">{service.name}</h3>
                            <span className="text-gold font-heading text-xl">${service.price?.toFixed(0)}</span>
                          </div>
                          {service.description && (
                            <p className="text-offwhite/50 text-sm mb-4">{service.description}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-offwhite/40 text-sm">~{service.duration_minutes} min</span>
                            <Link
                              to="/booking"
                              className="px-4 py-2 bg-gold text-charcoal hover:bg-gold/90 font-heading text-xs rounded-lg transition-colors"
                            >
                              Book Now
                            </Link>
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
            <h3 className="font-heading text-2xl text-gold mb-2">Ready to Book?</h3>
            <p className="text-offwhite/60 mb-6">Schedule your appointment online or visit us for a consultation.</p>
            <Link
              to="/booking"
              className="inline-block px-8 py-3 bg-gold text-charcoal hover:bg-gold/90 font-heading text-lg rounded-lg transition-colors"
            >
              Request Appointment
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}