import { useState } from 'react';

const servicesData = [
  {
    id: 1,
    name: 'The Signature Russian Manicure',
    price: 80,
    duration: 90,
    description: 'Our signature technique originating from Eastern Europe. Features thorough cuticle work, Russian file shaping, and a flawless gel polish finish that lasts up to 4 weeks.',
    addOns: [
      { name: 'French Tip', price: 15 },
      { name: 'Chrome Finish', price: 20 },
      { name: 'Strength Layer', price: 10 },
    ],
  },
  {
    id: 2,
    name: 'Gel-X Extensions',
    price: 100,
    duration: 120,
    description: 'Full coverage gel extensions for length and strength. Perfect for weak or bitten nails. Includes custom shaping and your choice of finish.',
    addOns: [
      { name: 'French Tip', price: 15 },
      { name: 'Chrome Finish', price: 20 },
      { name: 'Strength Layer', price: 10 },
    ],
  },
  {
    id: 3,
    name: 'Luxury Spa Pedicure',
    price: 60,
    duration: 60,
    description: 'A pampering experience combining exfoliation, paraffin treatment, extended massage, and flawless polish. Your feet deserve coutured care.',
    addOns: [
      { name: 'French Tip', price: 15 },
      { name: 'Chrome Finish', price: 20 },
      { name: 'Strength Layer', price: 10 },
    ],
  },
];

const packagesData = [
  {
    id: 1,
    name: 'The Couture Bride',
    price: 350,
    description: 'Complete bridal nail experience including consultation, custom nail art design, Gel-X extensions with premium crystals, and a hand massage with organic oils. Includes complimentary touch-ups.',
    features: ['Custom bridal design', 'Gel-X extensions', 'Premium crystal accents', 'Organic oil massage', 'Complimentary touch-up'],
    popular: true,
  },
  {
    id: 2,
    name: 'The Monthly Maintenance',
    price: 200,
    description: 'A 4-session monthly membership for consistent nail health. Includes Russian manicures, gel polish changes, and priority booking.',
    features: ['4 sessions/month', 'Russian manicure technique', 'Gel polish', 'Priority booking', '10% off add-ons'],
    popular: false,
  },
  {
    id: 3,
    name: 'The VIP Refresh',
    price: 150,
    description: 'An express luxury experience for busy professionals. Quick turnaround without compromising on quality or precision.',
    features: ['Express service (60 min)', 'Russian manicure', 'Gel polish', 'Hand massage', 'Flexible scheduling'],
    popular: false,
  },
];

function ServiceCard({ service, isSelected, onSelect }) {
  return (
    <div
      onClick={onSelect}
      className={`p-6 border cursor-pointer transition-all ${
        isSelected
          ? 'border-gold bg-gold/5'
          : 'border-charcoal/10 hover:border-gold/30'
      }`}
    >
      <h4 className="font-heading text-charcoal text-lg mb-2">{service.name}</h4>
      <div className="flex justify-between items-baseline mb-3">
        <span className="text-gold text-xl">${service.price}</span>
        <span className="text-charcoal/50 text-sm">{service.duration} min</span>
      </div>
      <p className="text-charcoal/60 text-sm leading-relaxed mb-4">{service.description}</p>
    </div>
  );
}

function PackageCard({ pkg, onBook }) {
  return (
    <div className={`relative bg-white border ${pkg.popular ? 'border-gold' : 'border-charcoal/10'} p-8`}>
      {pkg.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-gold text-charcoal text-xs px-4 py-1 tracking-wider">MOST POPULAR</span>
        </div>
      )}
      <h4 className="font-heading text-charcoal text-xl mb-2">{pkg.name}</h4>
      <div className="flex items-baseline mb-4">
        <span className="text-gold text-3xl font-heading">${pkg.price}</span>
        <span className="text-charcoal/50 text-sm ml-2">per package</span>
      </div>
      <p className="text-charcoal/60 text-sm leading-relaxed mb-6">{pkg.description}</p>
      <ul className="space-y-2 mb-8">
        {pkg.features.map((feature, i) => (
          <li key={i} className="flex items-center text-sm text-charcoal">
            <svg className="w-4 h-4 text-gold mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <button
        onClick={onBook}
        className={`w-full py-3 tracking-wider transition-all ${
          pkg.popular
            ? 'bg-gold text-charcoal hover:bg-gold/90'
            : 'bg-charcoal text-offwhite hover:bg-charcoal/80'
        }`}
      >
        BOOK PACKAGE
      </button>
    </div>
  );
}

export default function Services() {
  const [showAddOns, setShowAddOns] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [showPackages, setShowPackages] = useState(false);

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setSelectedAddOns([]);
    setShowAddOns(service.id);
  };

  const toggleAddOn = (addOn) => {
    setSelectedAddOns((prev) =>
      prev.find((a) => a.name === addOn.name)
        ? prev.filter((a) => a.name !== addOn.name)
        : [...prev, addOn]
    );
  };

  const totalPrice = selectedService
    ? selectedService.price + selectedAddOns.reduce((sum, a) => sum + a.price, 0)
    : 0;
  const totalMinutes = selectedService
    ? selectedService.duration + selectedAddOns.length * 15
    : 0;

  return (
    <section id="services" className="py-16 sm:py-24 px-4 sm:px-6 bg-offwhite">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-heading text-charcoal text-3xl sm:text-4xl md:text-5xl mb-4">Our Services</h2>
          <p className="text-charcoal/60 max-w-2xl mx-auto">
            Precision techniques, non-toxic products, and medical-grade sterilization. 
            Every service is a masterpiece crafted for you.
          </p>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setShowPackages(false)}
            className={`px-6 py-2 text-sm tracking-wider transition-all ${
              !showPackages
                ? 'bg-charcoal text-offwhite'
                : 'border border-charcoal/20 text-charcoal/60 hover:border-gold hover:text-gold'
            }`}
          >
            INDIVIDUAL SERVICES
          </button>
          <button
            onClick={() => setShowPackages(true)}
            className={`px-6 py-2 text-sm tracking-wider transition-all ${
              showPackages
                ? 'bg-charcoal text-offwhite'
                : 'border border-charcoal/20 text-charcoal/60 hover:border-gold hover:text-gold'
            }`}
          >
            PACKAGES
          </button>
        </div>

        {!showPackages ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {servicesData.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  isSelected={selectedService?.id === service.id}
                  onSelect={() => handleServiceSelect(service)}
                />
              ))}
            </div>

            {showAddOns && selectedService && (
              <div className="bg-white border border-charcoal/10 p-6 sm:p-8 animate-fade-in">
                <h4 className="text-sm text-charcoal/50 tracking-wider uppercase mb-4">Customize Your {selectedService.name}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {selectedService.addOns.map((addOn) => {
                    const isSelected = selectedAddOns.find((a) => a.name === addOn.name);
                    return (
                      <label
                        key={addOn.name}
                        className={`flex items-center justify-between p-4 border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-gold bg-gold/5'
                            : 'border-charcoal/10 hover:border-gold/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 border flex items-center justify-center ${
                              isSelected ? 'bg-gold border-gold' : 'border-charcoal/30'
                            }`}
                          >
                            {isSelected && (
                              <svg className="w-3 h-3 text-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className="text-sm text-charcoal">{addOn.name}</span>
                        </div>
                        <span className="text-sm text-gold">+${addOn.price}</span>
                        <input
                          type="checkbox"
                          checked={!!isSelected}
                          onChange={() => toggleAddOn(addOn)}
                          className="sr-only"
                        />
                      </label>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-charcoal text-offwhite gap-4">
                  <div>
                    <span className="text-sm text-offwhite/60">Total Time: </span>
                    <span className="font-medium">{totalMinutes} min</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-offwhite/60">Total: </span>
                    <span className="text-gold text-2xl font-heading ml-2">${totalPrice}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {packagesData.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                onBook={() => {
                  const element = document.getElementById('book');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              />
            ))}
          </div>
        )}

        <div className="mt-12 p-6 bg-charcoal text-offwhite">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-center">
            <div>
              <div className="text-gold font-heading text-2xl mb-1">Medical-Grade</div>
              <div className="text-sm text-offwhite/60">Sterilization</div>
            </div>
            <div className="hidden md:block w-px h-12 bg-offwhite/20" />
            <div>
              <div className="text-gold font-heading text-2xl mb-1">Non-Toxic</div>
              <div className="text-sm text-offwhite/60">Products Only</div>
            </div>
            <div className="hidden md:block w-px h-12 bg-offwhite/20" />
            <div>
              <div className="text-gold font-heading text-2xl mb-1">4-Week</div>
              <div className="text-sm text-offwhite/60">Guarantee</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
