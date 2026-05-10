import { useState, useEffect } from 'react';

const servicesData = [
  {
    id: 1,
    name: 'The Signature Russian Manicure',
    price: 80,
    duration: 90,
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
    addOns: [
      { name: 'French Tip', price: 15 },
      { name: 'Chrome Finish', price: 20 },
      { name: 'Strength Layer', price: 10 },
    ],
  },
];

const artists = [
  { id: 1, name: 'Elena - Master Artist' },
  { id: 2, name: 'Sasha - Senior Tech' },
];

const packagesData = [
  {
    id: 'pkg1',
    name: 'The "First Impression" Package',
    description: 'Manicure + Pedicure + Hand Massage',
    originalPrice: 150,
    packagePrice: 135,
    savings: 10,
    includes: ['Signature Russian Manicure', 'Luxury Spa Pedicure', 'Relaxing Hand Massage'],
    tag: 'Save 10%',
  },
  {
    id: 'pkg2',
    name: 'The "Bridal Party" Bundle',
    description: 'Group booking for 4+ people with Complimentary Toast',
    originalPrice: 0,
    packagePrice: 0,
    savings: 0,
    includes: ['4+ Bridal Party Members', 'Complimentary Champagne Toast', 'Coordinated Styling'],
    tag: 'Complimentary',
    minPeople: 4,
  },
  {
    id: 'pkg3',
    name: 'The "Russian Routine" Subscription',
    description: 'Pre-pay for 5 manicures, get the 6th free',
    originalPrice: 400,
    packagePrice: 320,
    savings: 20,
    includes: ['5 Signature Russian Manicures', '1 Free Manicure (6th)', 'Priority Scheduling'],
    tag: 'Buy 5 Get 1 Free',
  },
];

const generateTimeSlots = () => {
  const slots = [];
  let hour = 9;
  let minute = 0;
  while (hour < 19 || (hour === 19 && minute === 0)) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    slots.push({
      value: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
      label: `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`,
    });
    minute += 30;
    if (minute >= 60) {
      minute = 0;
      hour++;
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots();

function Calendar({ selectedDate, onSelectDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay, year, month };
  };
  
  const { daysInMonth, startingDay, year, month } = getDaysInMonth(currentMonth);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };
  
  const isDateDisabled = (day) => {
    const date = new Date(year, month, day);
    return date < today || date.getDay() === 0;
  };
  
  const isSelected = (day) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year
    );
  };
  
  const selectDate = (day) => {
    if (!isDateDisabled(day)) {
      onSelectDate(new Date(year, month, day));
    }
  };
  
  const canGoPrev = () => {
    const prevMonthDate = new Date(year, month - 1, 1);
    return prevMonthDate.getMonth() >= today.getMonth() || 
           prevMonthDate.getFullYear() > today.getFullYear();
  };

  return (
    <div className="bg-white border border-charcoal/10 p-3 sm:p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <button
          onClick={prevMonth}
          disabled={!canGoPrev()}
          className={`p-2 ${canGoPrev() ? 'hover:bg-charcoal/5' : 'opacity-30 cursor-not-allowed'}`}
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-heading text-base sm:text-lg text-charcoal">
          {monthNames[month]} {year}
        </span>
        <button onClick={nextMonth} className="p-2 hover:bg-charcoal/5">
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1 sm:mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-[10px] sm:text-xs text-charcoal/50 py-1 sm:py-2">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {[...Array(startingDay)].map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {[...Array(daysInMonth)].map((_, i) => {
          const day = i + 1;
          const disabled = isDateDisabled(day);
          const selected = isSelected(day);
          return (
            <button
              key={day}
              onClick={() => selectDate(day)}
              disabled={disabled}
              className={`aspect-square flex items-center justify-center text-xs sm:text-sm rounded-none transition-all touch-manipulation
                ${disabled ? 'text-charcoal/20 cursor-not-allowed' : 'hover:bg-gold/20 active:bg-gold/30'}
                ${selected ? 'bg-gold text-charcoal' : ''}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepIndicator({ currentStep }) {
  const steps = ['Selections', 'Time & Artist', 'Details'];
  return (
    <div className="flex items-center justify-center mb-8 sm:mb-12">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center border-2 transition-all ${
                index + 1 <= currentStep
                  ? 'bg-gold border-gold text-charcoal'
                  : 'border-charcoal/20 text-charcoal/20'
              }`}
            >
              <span className="font-heading text-sm sm:text-lg">{index + 1}</span>
            </div>
            <span className={`text-[10px] sm:text-xs mt-1 sm:mt-2 ${index + 1 <= currentStep ? 'text-charcoal' : 'text-charcoal/40'}`}>
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-12 sm:w-24 h-0.5 mx-1 sm:mx-2 transition-all ${
                index + 1 < currentStep ? 'bg-gold' : 'bg-charcoal/10'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function StepContent({ children, isActive }) {
  useEffect(() => {
    if (isActive) {
      const element = document.querySelector('[data-step-content]');
      if (element) {
        element.classList.add('fade-in');
      }
    }
  }, [isActive]);

  return (
    <div 
      data-step-content
      className={`transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0 hidden'}`}
    >
      {children}
    </div>
  );
}

function BookingWizard() {
  const [step, setStep] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedArtist, setSelectedArtist] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', agreed: false });
  const [bookingId, setBookingId] = useState('');
  const [errors, setErrors] = useState({});
  const [animationKey, setAnimationKey] = useState(0);

  const toggleAddOn = (addOn) => {
    setSelectedAddOns((prev) =>
      prev.find((a) => a.name === addOn.name)
        ? prev.filter((a) => a.name !== addOn.name)
        : [...prev, addOn]
    );
  };

  const totalPrice = selectedPackage
    ? selectedPackage.packagePrice + selectedAddOns.reduce((sum, a) => sum + a.price, 0)
    : selectedService
      ? selectedService.price + selectedAddOns.reduce((sum, a) => sum + a.price, 0)
      : 0;
  const totalMinutes = selectedPackage
    ? 150 + selectedAddOns.length * 15
    : selectedService
      ? selectedService.duration + selectedAddOns.length * 15
      : 0;

  const handlePackageSelect = (pkg) => {
    setSelectedPackage(pkg);
    setSelectedService(null);
    setSelectedAddOns([]);
  };

  const handleServiceSelect = (service) => {
    setSelectedPackage(null);
    setSelectedService(service);
    setSelectedAddOns([]);
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData({ ...formData, phone: value });
  };

  const validateStep3 = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (formData.phone.length !== 10) {
      newErrors.phone = 'Phone number must be 10 digits';
    }
    if (!formData.agreed) newErrors.agreed = 'You must agree to the cancellation policy';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = (nextStep) => {
    setAnimationKey((prev) => prev + 1);
    setStep(nextStep);
  };

  const handleSubmit = () => {
    if (!validateStep3()) return;
    const id = `NC-${Date.now().toString(36).toUpperCase()}`;
    setBookingId(id);
    handleNextStep(4);
  };

  const resetBooking = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedAddOns([]);
    setSelectedDate(null);
    setSelectedTime('');
    setSelectedArtist('');
    setFormData({ name: '', email: '', phone: '', agreed: false });
    setErrors({});
  };

  return (
    <section id="book" className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 bg-offwhite">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-2 sm:mb-4">Book Your Appointment</h2>
          <p className="text-charcoal/60 text-sm sm:text-base">Reserve your moment of luxury</p>
        </div>

        {step < 4 && <StepIndicator currentStep={step} />}

        <div key={animationKey} className="animate-fade-in">
          {step === 1 && (
            <div className="bg-white border border-charcoal/10 p-4 sm:p-6 md:p-8 rounded-sm">
              <h3 className="font-heading text-xl sm:text-2xl mb-6 sm:mb-8 text-center">Select Your Service or Package</h3>
              
              <div className="mb-8">
                <div className="text-xs text-charcoal/50 uppercase tracking-wider mb-4">Special Packages & Bundles</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {packagesData.map((pkg) => (
                    <div
                      key={pkg.id}
                      onClick={() => handlePackageSelect(pkg)}
                      className={`relative p-4 sm:p-6 border cursor-pointer transition-all touch-manipulation ${
                        selectedPackage?.id === pkg.id
                          ? 'border-gold bg-gold/5'
                          : 'border-charcoal/10 hover:border-gold/30'
                      }`}
                    >
                      {pkg.tag && (
                        <div className="absolute -top-2 -right-2 px-2 py-1 bg-gold text-charcoal text-xs font-medium">
                          {pkg.tag}
                        </div>
                      )}
                      <h4 className="font-heading text-base sm:text-lg mb-2">{pkg.name}</h4>
                      <p className="text-sm text-charcoal/60 mb-3">{pkg.description}</p>
                      {pkg.originalPrice > 0 ? (
                        <div className="flex items-baseline gap-2">
                          <span className="text-gold text-lg sm:text-xl font-heading">${pkg.packagePrice}</span>
                          <span className="text-charcoal/40 text-sm line-through">${pkg.originalPrice}</span>
                          <span className="text-green-600 text-sm">Save {pkg.savings}%</span>
                        </div>
                      ) : (
                        <div className="text-gold text-lg sm:text-xl">Custom Quote</div>
                      )}
                      {pkg.minPeople && (
                        <div className="mt-2 text-xs text-charcoal/50">Min. {pkg.minPeople} people</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <div className="text-xs text-charcoal/50 uppercase tracking-wider mb-4">Individual Services</div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:gap-6 mb-6 sm:mb-8">
                {servicesData.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => handleServiceSelect(service)}
                    className={`p-4 sm:p-6 border cursor-pointer transition-all touch-manipulation ${
                      selectedService?.id === service.id
                        ? 'border-gold bg-gold/5'
                        : 'border-charcoal/10 hover:border-gold/30'
                    }`}
                  >
                    <h4 className="font-heading text-base sm:text-lg mb-2">{service.name}</h4>
                    <div className="flex justify-between items-baseline">
                      <span className="text-gold text-lg sm:text-xl">${service.price}</span>
                      <span className="text-charcoal/50 text-sm">{service.duration} min</span>
                    </div>
                  </div>
                ))}
              </div>

              {(selectedService || selectedPackage) && (
                <div className="border-t border-charcoal/10 pt-6 sm:pt-8">
                  <h4 className="text-xs sm:text-sm text-charcoal/50 tracking-wider uppercase mb-4">Extra Enhancements</h4>
                  <div className="grid grid-cols-1 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    {(selectedService?.addOns || [
                      { name: 'French Tip', price: 15 },
                      { name: 'Chrome Finish', price: 20 },
                      { name: 'Strength Layer', price: 10 },
                      { name: 'Luxury Hand Massage', price: 25 },
                    ]).map((addOn) => {
                      const isSelected = selectedAddOns.find((a) => a.name === addOn.name);
                      return (
                        <label
                          key={addOn.name}
                          className={`flex items-center justify-between p-3 sm:p-4 border cursor-pointer transition-all touch-manipulation ${
                            isSelected
                              ? 'border-gold bg-gold/5'
                              : 'border-charcoal/10 hover:border-gold/30'
                          }`}
                        >
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div
                              className={`w-4 sm:w-5 h-4 sm:h-5 border flex items-center justify-center ${
                                isSelected ? 'bg-gold border-gold' : 'border-charcoal/30'
                              }`}
                            >
                              {isSelected && (
                                <svg className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                  <div className="flex flex-col sm:flex-row justify-between items-center p-3 sm:p-4 bg-charcoal text-offwhite gap-2">
                    <div>
                      <span className="text-xs sm:text-sm text-offwhite/60">Total Time: </span>
                      <span className="font-medium">{totalMinutes} min</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs sm:text-sm text-offwhite/60">Total: </span>
                      <span className="text-gold text-xl sm:text-2xl font-heading ml-2">${totalPrice}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 sm:mt-8 text-center">
                <button
                  onClick={() => handleNextStep(2)}
                  disabled={!selectedService}
                  className={`w-full sm:w-auto px-6 sm:px-8 py-3 tracking-wider transition-all touch-manipulation ${
                    selectedService
                      ? 'bg-charcoal text-offwhite hover:bg-charcoal/80'
                      : 'bg-charcoal/30 text-charcoal/50 cursor-not-allowed'
                  }`}
                >
                  CONTINUE
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="bg-white border border-charcoal/10 p-4 sm:p-6 md:p-8 rounded-sm">
              <h3 className="font-heading text-xl sm:text-2xl mb-6 sm:mb-8 text-center">Schedule Your Appointment</h3>
              
              <div className="grid grid-cols-1 gap-6 sm:gap-8 mb-6 sm:mb-8">
                <div>
                  <label className="text-xs sm:text-sm text-charcoal/50 tracking-wider uppercase block mb-3 sm:mb-4">Select Date</label>
                  <Calendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
                </div>
              
                <div>
                  <label className="text-xs sm:text-sm text-charcoal/50 tracking-wider uppercase block mb-3 sm:mb-4">Select Time</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2 max-h-48 sm:max-h-72 overflow-y-auto border border-charcoal/10 p-2 sm:p-4">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot.value}
                        onClick={() => setSelectedTime(slot.value)}
                        className={`py-2 px-1 sm:px-3 text-xs sm:text-sm transition-all touch-manipulation ${
                          selectedTime === slot.value
                            ? 'bg-gold text-charcoal'
                            : 'bg-white text-charcoal hover:bg-gold/20'
                        } border border-charcoal/10`}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mb-6 sm:mb-8">
                <label className="text-xs sm:text-sm text-charcoal/50 tracking-wider uppercase block mb-3 sm:mb-4">Select Artist (Optional)</label>
                <select
                  value={selectedArtist}
                  onChange={(e) => setSelectedArtist(e.target.value)}
                  className="w-full p-3 sm:p-4 border border-charcoal/10 bg-white text-charcoal focus:border-gold focus:outline-none text-sm sm:text-base"
                >
                  <option value="">Choose an artist...</option>
                  {artists.map((artist) => (
                    <option key={artist.id} value={artist.name}>
                      {artist.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center p-3 sm:p-4 bg-charcoal text-offwhite gap-2 text-xs sm:text-sm">
                <span>
                  {selectedDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {selectedTime && ` at ${timeSlots.find(s => s.value === selectedTime)?.label}`}
                </span>
                {selectedArtist && <span>{selectedArtist}</span>}
              </div>

              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-between gap-3">
                <button
                  onClick={() => handleNextStep(1)}
                  className="order-2 sm:order-1 px-6 py-3 border border-charcoal/20 text-charcoal hover:bg-charcoal/5 transition-all touch-manipulation text-sm sm:text-base"
                >
                  BACK
                </button>
                <button
                  onClick={() => handleNextStep(3)}
                  disabled={!selectedDate || !selectedTime}
                  className={`order-1 sm:order-2 w-full sm:w-auto px-6 sm:px-8 py-3 tracking-wider transition-all touch-manipulation text-sm sm:text-base ${
                    selectedDate && selectedTime
                      ? 'bg-charcoal text-offwhite hover:bg-charcoal/80'
                      : 'bg-charcoal/30 text-charcoal/50 cursor-not-allowed'
                  }`}
                >
                  CONTINUE
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="bg-white border border-charcoal/10 p-4 sm:p-6 md:p-8 rounded-sm">
              <h3 className="font-heading text-xl sm:text-2xl mb-6 sm:mb-8 text-center">Your Details</h3>
              
              <div className="max-w-md mx-auto">
                <div className="mb-4 sm:mb-6">
                  <label className="text-xs sm:text-sm text-charcoal/50 tracking-wider uppercase block mb-2">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full p-3 sm:p-4 border bg-white text-charcoal focus:outline-none transition-colors text-sm sm:text-base ${
                      errors.name ? 'border-red-500' : 'border-charcoal/10 focus:border-gold'
                    }`}
                    placeholder="Alexandra Chen"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                <div className="mb-4 sm:mb-6">
                  <label className="text-xs sm:text-sm text-charcoal/50 tracking-wider uppercase block mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full p-3 sm:p-4 border bg-white text-charcoal focus:outline-none transition-colors text-sm sm:text-base ${
                      errors.email ? 'border-red-500' : 'border-charcoal/10 focus:border-gold'
                    }`}
                    placeholder="alexandra@example.com"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                <div className="mb-4 sm:mb-6">
                  <label className="text-xs sm:text-sm text-charcoal/50 tracking-wider uppercase block mb-2">Phone (10 digits)</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className={`w-full p-3 sm:p-4 border bg-white text-charcoal focus:outline-none transition-colors text-sm sm:text-base ${
                      errors.phone ? 'border-red-500' : 'border-charcoal/10 focus:border-gold'
                    }`}
                    placeholder="5551234567"
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>

                <label className={`flex items-start gap-3 sm:gap-4 p-3 sm:p-4 border cursor-pointer transition-all mb-6 sm:mb-8 touch-manipulation ${
                  errors.agreed ? 'border-red-500' : formData.agreed ? 'border-gold bg-gold/5' : 'border-charcoal/10'
                }`}>
                  <div className={`w-4 sm:w-5 h-4 sm:h-5 mt-0.5 border flex items-center justify-center flex-shrink-0 ${
                    formData.agreed ? 'bg-gold border-gold' : 'border-charcoal/30'
                  }`}>
                    {formData.agreed && (
                      <svg className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.agreed}
                    onChange={(e) => setFormData({ ...formData, agreed: e.target.checked })}
                    className="sr-only"
                  />
                  <span className="text-xs sm:text-sm text-charcoal leading-relaxed">
                    I agree to pay on-site and understand the 24-hour cancellation policy.
                  </span>
                </label>
                {errors.agreed && <p className="text-red-500 text-xs -mt-6 sm:-mt-8 mb-6 sm:mb-8">{errors.agreed}</p>}

                <div className="flex flex-col sm:flex-row justify-between items-center p-3 sm:p-4 bg-charcoal text-offwhite gap-2">
                  <span className="text-xs sm:text-sm">
                    {selectedPackage?.name || selectedService?.name}
                    {selectedAddOns.length > 0 && ` + ${selectedAddOns.map(a => a.name).join(', ')}`}
                  </span>
                  <span className="text-gold font-heading text-lg sm:text-xl">${totalPrice}</span>
                </div>

                <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-between gap-3">
                  <button
                    onClick={() => handleNextStep(2)}
                    className="order-2 sm:order-1 px-6 py-3 border border-charcoal/20 text-charcoal hover:bg-charcoal/5 transition-all touch-manipulation text-sm sm:text-base"
                  >
                    BACK
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="order-1 sm:order-2 w-full sm:w-auto px-6 sm:px-8 py-3 bg-gold text-charcoal hover:bg-gold/90 transition-all tracking-wider touch-manipulation text-sm sm:text-base"
                  >
                    CONFIRM
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="bg-white border border-gold/30 p-6 sm:p-8 md:p-12 text-center rounded-sm">
              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 rounded-full bg-gold/20 flex items-center justify-center">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-heading text-2xl sm:text-3xl mb-2">Reservation Confirmed</h3>
              <p className="text-charcoal/60 text-sm sm:text-base mb-4 sm:mb-8">Your booking ID is:</p>
              <div className="inline-block px-6 sm:px-8 py-3 sm:py-4 bg-charcoal text-gold font-heading text-xl sm:text-2xl tracking-wider mb-6 sm:mb-8">
                {bookingId}
              </div>
              <div className="text-left max-w-md mx-auto p-4 sm:p-6 bg-offwhite border border-charcoal/10 mb-6 sm:mb-8">
                <h4 className="font-heading text-base sm:text-lg mb-3 sm:mb-4">Booking Details</h4>
                <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                  <p><span className="text-charcoal/50">{selectedPackage ? 'Package' : 'Service'}:</span> <span className="text-charcoal">{selectedPackage?.name || selectedService?.name}</span></p>
                  {selectedPackage && (
                    <p><span className="text-charcoal/50">Includes:</span> <span className="text-charcoal">{selectedPackage.includes.join(', ')}</span></p>
                  )}
                  {selectedAddOns.length > 0 && (
                    <p><span className="text-charcoal/50">Add-ons:</span> <span className="text-charcoal">{selectedAddOns.map(a => a.name).join(', ')}</span></p>
                  )}
                  <p><span className="text-charcoal/50">Date:</span> <span className="text-charcoal">{selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span></p>
                  <p><span className="text-charcoal/50">Time:</span> <span className="text-charcoal">{timeSlots.find(s => s.value === selectedTime)?.label}</span></p>
                  <p><span className="text-charcoal/50">Artist:</span> <span className="text-charcoal">{selectedArtist || 'Any Available'}</span></p>
                  <p><span className="text-charcoal/50">Client:</span> <span className="text-charcoal">{formData.name}</span></p>
                  <p><span className="text-charcoal/50">Total:</span> <span className="text-gold font-heading">${totalPrice}</span></p>
                </div>
              </div>
              <p className="text-charcoal/50 text-xs sm:text-sm mb-4 sm:mb-6">Confirmation sent to {formData.email}</p>
              <button
                onClick={resetBooking}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-charcoal text-offwhite hover:bg-charcoal/80 transition-all tracking-wider touch-manipulation text-sm sm:text-base"
              >
                BOOK ANOTHER
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default BookingWizard;
