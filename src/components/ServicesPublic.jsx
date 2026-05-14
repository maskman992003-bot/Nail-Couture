import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const categoryOrder = ['Nail Art', 'Extensions', 'Russian Manicure', 'Treatment', 'Packages'];

export default function ServicesPublic() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ backgroundColor: '#0a0a0a' }}>
      <div className="sticky top-0 z-50 bg-charcoal border-b border-gold/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-4">
            <img src="/NC.jpg" alt="Nail Couture" className="h-12 w-auto" />
            <span className="font-heading text-gold text-xl">Services & Pricing</span>
          </Link>
          <Link 
            to="/booking" 
            className="px-4 py-2 bg-gold text-charcoal hover:bg-gold/90 font-heading text-sm rounded-lg"
          >
            Book Appointment
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
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
          <div className="space-y-12">
            {sortedCategories.map((category) => (
              <div key={category}>
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="font-heading text-2xl text-offwhite">{category}</h2>
                  <div className="flex-1 h-px bg-gold/20"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupedServices[category].map((service) => (
                    <div 
                      key={service.id} 
                      className="bg-white/5 border border-gold/10 rounded-xl p-6 hover:border-gold/30 transition-all"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-heading text-xl text-offwhite">{service.name}</h3>
                        <span className="text-gold font-heading text-2xl">${service.price?.toFixed(0)}</span>
                      </div>
                      {service.description && (
                        <p className="text-offwhite/50 text-sm mb-4">{service.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-offwhite/40 text-sm">~{service.duration_minutes} min</span>
                        <Link
                          to="/booking"
                          className="px-6 py-2 bg-gold text-charcoal hover:bg-gold/90 font-heading text-sm rounded-lg transition-colors"
                        >
                          Book Now
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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