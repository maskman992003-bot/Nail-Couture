import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getHomePath } from '../utils/routes';
import { CUSTOMER_ONLINE_BOOKING } from '../constants/featureFlags';
import { getServices } from '../services/services';
import Sidebar from './Sidebar';

export default function CustomerServices() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.is_staff) {
      navigate(getHomePath(user.role));
      return;
    }
    getServices()
      .then((data) => setServices(data || []))
      .catch((err) => {
        if (process.env.NODE_ENV === 'development') console.error(err);
      })
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const mainServices = services.filter((service) => !service.is_addon);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredServices = mainServices.filter((service) => {
    if (!normalizedSearch) return true;
    return (
      service.name.toLowerCase().includes(normalizedSearch) ||
      (service.category || '').toLowerCase().includes(normalizedSearch)
    );
  });

  const groupedServices = filteredServices.reduce((acc, service) => {
    const category = service.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {});

  const sortedCategories = Object.keys(groupedServices).sort((a, b) => a.localeCompare(b));
  const categoryTabs = ['All', ...sortedCategories];
  const displayCategories = activeCategory === 'All'
    ? sortedCategories
    : sortedCategories.filter((category) => category === activeCategory);

  return (
    <div className={`min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 ${theme === 'dark' ? 'bg-[#0B0B0C] text-white' : 'bg-white text-charcoal'}`}>
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 max-w-5xl mx-auto">
        <div className="border-b border-gold/10 pb-6 mb-6">
          <h1 className="font-heading text-3xl text-gold tracking-wide">Services & Pricing</h1>
          <p className={theme === 'dark' ? 'text-offwhite/60 text-sm mt-2' : 'text-charcoal/60 text-sm mt-2'}>
            Browse our menu of nail couture services, durations, and pricing.
          </p>
        </div>

        <div className="mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search services or categories..."
            className={theme === 'dark' ? 'w-full px-4 py-3 bg-offwhite/5 border border-offwhite/10 text-offwhite rounded-xl focus:border-gold focus:outline-none text-sm placeholder-offwhite/30' : 'w-full px-4 py-3 bg-charcoal/5 border border-charcoal/10 text-charcoal rounded-xl focus:border-gold focus:outline-none text-sm placeholder-charcoal/30'}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-6">
          {categoryTabs.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => {
                setActiveCategory(category);
                setExpandedCategory(null);
              }}
              className={`px-4 py-2 rounded-full text-sm font-heading whitespace-nowrap transition-all flex-shrink-0 ${
                activeCategory === category
                  ? 'bg-gold text-charcoal'
                  : theme === 'dark' ? 'border border-gold/30 text-offwhite/60 hover:border-gold hover:text-gold' : 'border border-gold/30 text-charcoal/60 hover:border-gold hover:text-gold'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-gold animate-pulse tracking-widest text-sm">LOADING SERVICES...</div>
          </div>
        ) : displayCategories.length === 0 ? (
          <div className={theme === 'dark' ? 'text-center py-16 bg-offwhite/5 border border-offwhite/10 rounded-2xl' : 'text-center py-16 bg-charcoal/5 border border-charcoal/10 rounded-2xl'}>
            <p className={theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40'}>No services found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayCategories.map((category) => {
              const isOpen = displayCategories.length === 1 || expandedCategory === category;
              return (
                <div
                  key={category}
                  className={theme === 'dark' ? 'rounded-2xl border border-gold/20 bg-offwhite/5 overflow-hidden' : 'rounded-2xl border border-gold/20 bg-charcoal/5 overflow-hidden'}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedCategory(isOpen ? null : category)}
                    className={theme === 'dark' ? 'w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors' : 'w-full flex items-center justify-between px-5 py-4 hover:bg-gold/5 transition-colors'}
                  >
                    <div className="flex items-center gap-3">
                      <h2 className={theme === 'dark' ? 'font-heading text-xl text-offwhite' : 'font-heading text-xl text-charcoal'}>{category}</h2>
                      <span className={theme === 'dark' ? 'text-offwhite/40 text-sm' : 'text-charcoal/40 text-sm'}>({groupedServices[category].length})</span>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gold transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {groupedServices[category].map((service) => (
                        <div
                          key={service.id}
                          className={theme === 'dark' ? 'bg-[#0B0B0C]/60 border border-gold/10 rounded-xl p-5 hover:border-gold/30 transition-all' : 'bg-white border border-gold/10 rounded-xl p-5 hover:border-gold/30 transition-all'}
                        >
                          <div className="flex justify-between items-start gap-3 mb-2">
                            <h3 className={theme === 'dark' ? 'font-heading text-lg text-offwhite' : 'font-heading text-lg text-charcoal'}>{service.name}</h3>
                            <span className="text-gold font-heading text-xl shrink-0">
                              ${Number(service.price || 0).toFixed(0)}
                            </span>
                          </div>
                          {service.description && (
                            <p className={theme === 'dark' ? 'text-offwhite/50 text-sm mb-4' : 'text-charcoal/50 text-sm mb-4'}>{service.description}</p>
                          )}
                          <div className="flex items-center justify-between gap-3">
                            <span className={theme === 'dark' ? 'text-offwhite/40 text-sm' : 'text-charcoal/40 text-sm'}>
                              ~{service.duration_minutes || 0} min
                            </span>
                            {CUSTOMER_ONLINE_BOOKING && (
                              <Link
                                to="/customer/book"
                                className="px-4 py-2 bg-gold text-charcoal hover:bg-gold/90 font-heading text-xs rounded-lg transition-colors"
                              >
                                Book Now
                              </Link>
                            )}
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

        {CUSTOMER_ONLINE_BOOKING && !loading && mainServices.length > 0 && (
          <div className="mt-10 text-center">
            <div className="bg-gold/10 border border-gold/30 rounded-2xl p-8">
              <h3 className="font-heading text-2xl text-gold mb-2">Ready to Book?</h3>
              <p className={theme === 'dark' ? 'text-offwhite/60 mb-6' : 'text-charcoal/60 mb-6'}>Schedule your next visit from your customer portal.</p>
              <Link
                to="/customer/book"
                className="inline-block px-8 py-3 bg-gold text-charcoal hover:bg-gold/90 font-heading text-sm rounded-xl transition-colors"
              >
                Book Appointment
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
