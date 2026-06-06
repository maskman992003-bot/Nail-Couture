import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CUSTOMER_ONLINE_BOOKING } from '../constants/featureFlags';
import { getHomePath } from '../utils/routes';
import Sidebar from './Sidebar';

export default function CustomerBooking() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableTechnicians, setAvailableTechnicians] = useState([]);
  const [loadingTechs, setLoadingTechs] = useState(false);
  const [selectedTech, setSelectedTech] = useState(null);
  const [bookLoading, setBookLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [dbCategories, setDbCategories] = useState([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupSize, setGroupSize] = useState('');

  const userId = user?.id;
  const firstName = user?.full_name ? user.full_name.split(' ')[0] : 'there';

  const fetchServices = async () => {
    try {
      const { data: servicesData } = await supabase.from('services').select('*').order('category').order('name');
      setServices(servicesData || []);
    } catch { }
    setLoading(false);
  };

  const fetchCategories = async () => {
    try {
      const { data } = await supabase.from('service_categories').select('*').order('sort_order');
      setDbCategories(data || []);
    } catch { }
  };

  const fetchAvailableTechnicians = async () => {
    setLoadingTechs(true);
    try {
      const { data } = await supabase.rpc('get_available_technicians', {
        p_date: selectedDate,
        p_time: selectedTime,
      });
      setAvailableTechnicians(data || []);
      if (data?.length === 0) {
        setSelectedTech(null);
      } else if (data?.length === 1) {
        setSelectedTech(data[0]);
      }
    } catch {
      setAvailableTechnicians([]);
    }
    setLoadingTechs(false);
  };

  const handleBooking = async () => {
    if (selectedServices.length === 0 || !selectedDate || !selectedTime) return;
    setBookLoading(true);
    if (!userId) { setBookLoading(false); navigate('/login'); return; }
    const checkInTime = new Date(`${selectedDate}T${selectedTime}:00`);
    const allNames = [...selectedServices.map((s) => s.name), ...selectedAddOns.map((id) => {
      const addOn = services.find((s) => s.id === id);
      return addOn?.name;
    }).filter(Boolean)].join(', ');
    const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0) +
      selectedAddOns.reduce((sum, id) => {
        const addOn = services.find((s) => s.id === id);
        return sum + (addOn?.price || 0);
      }, 0);
    const { error } = await supabase.from('appointments').insert({
      customer_id: userId,
      service_id: selectedServices[0]?.id || null,
      add_ons: allNames || null,
      final_price: totalPrice,
      technician_id: selectedTech?.staff_id || null,
      scheduled_at: checkInTime.toISOString(),
      status: 'confirmed',
      booking_type: 'online',
    });
    if (!error) setBookingSuccess(true);
    setBookLoading(false);
  };

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.is_staff) {
      navigate(getHomePath(user.role));
      return;
    }
    fetchServices();
    fetchCategories();
  }, [user, navigate]);

  useEffect(() => {
    if (!CUSTOMER_ONLINE_BOOKING) return;
    if (selectedDate && selectedTime) {
      fetchAvailableTechnicians();
    } else {
      setAvailableTechnicians([]);
      setSelectedTech(null);
    }
  }, [selectedDate, selectedTime]);

  if (!CUSTOMER_ONLINE_BOOKING) {
    return (
      <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
        <Sidebar />
        <div className="flex items-center justify-center p-6">
          <div className="max-w-xl rounded-3xl border border-gold/30 bg-[#111] p-10 text-center">
            <div className="text-gold text-4xl font-heading mb-4">Booking Temporarily Unavailable</div>
            <p className="text-offwhite/70 mb-6">Online booking is currently disabled while we complete system updates. Please contact us to schedule your visit.</p>
            <div className="flex flex-col gap-3 sm:flex-row justify-center">
              <Link to="/portal" className="px-6 py-3 bg-offwhite/10 text-offwhite rounded-xl hover:bg-offwhite/20">Return to Portal</Link>
              <a href="/about#contact" className="px-6 py-3 bg-gold text-charcoal rounded-xl hover:bg-gold/90">Contact Us</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const categoryOrder = dbCategories.map((c) => c.name);
  const categories = ['All', ...categoryOrder];

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

  const addOns = services.filter((s) => s.category === 'Add-on');
  const selectedAddOnDetails = addOns.filter((a) => selectedAddOns.includes(a.id));

  const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0) + selectedAddOnDetails.reduce((sum, a) => sum + (a.price || 0), 0);
  const totalMinutes = selectedServices.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) + selectedAddOnDetails.reduce((sum, a) => sum + (a.duration_minutes || 0), 0);

  const toggleService = (service) => {
    setSelectedServices((prev) =>
      prev.some((s) => s.id === service.id)
        ? prev.filter((s) => s.id !== service.id)
        : [...prev, service]
    );
  };

  const toggleAddOn = (addOnId) => {
    setSelectedAddOns((prev) =>
      prev.includes(addOnId) ? prev.filter((id) => id !== addOnId) : [...prev, addOnId]
    );
  };

  const today = new Date().toISOString().split('T')[0];
  const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'];

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
        <Sidebar />
        <div className="flex items-center justify-center p-4 md:p-10">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c5a059, #f0d78c)', boxShadow: '0 0 30px rgba(197, 160, 89, 0.3)' }}>
              <svg className="w-10 h-10 text-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="font-heading text-3xl text-gold mb-2">Thank you, {firstName}!</h2>
            <h3 className="font-heading text-2xl text-offwhite mb-6">Booking Confirmed</h3>
            <p className="text-offwhite/60 mb-4">Your appointment has been confirmed. We'll see you at your scheduled time.</p>
            <p className="text-offwhite text-sm mb-8">We look forward to welcoming you.</p>
            <Link to="/portal" className="inline-block px-8 py-4 bg-gold text-charcoal font-heading tracking-wider text-sm rounded-xl hover:bg-gold/90 transition-colors shadow-lg shadow-gold/20">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link to="/portal" className="text-offwhite/40 hover:text-gold text-sm">Home</Link>
              <span className="text-offwhite/30">/</span>
              <span className="text-gold font-heading text-sm">Book Appointment</span>
            </div>
            <h1 className="font-heading text-4xl text-gold">Book Your Experience</h1>
            <p className="text-offwhite/50 text-sm mt-1">Select your service and preferred time</p>
          </div>

          <div className="flex overflow-x-auto whitespace-nowrap scrollbar-none snap-x w-full px-4 gap-2 pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setExpandedCategory(null); setSelectedServices([]); setSelectedAddOns([]); }}
                className={`inline-flex px-4 py-2 rounded-full text-sm font-heading whitespace-nowrap transition-all flex-shrink-0 snap-start ${
                  activeCategory === cat ? 'bg-gold text-charcoal' : 'border border-gold/30 text-offwhite/60 hover:border-gold hover:text-gold'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border-2" style={{ background: 'linear-gradient(135deg, rgba(197, 160, 89, 0.08) 0%, rgba(26, 26, 26, 1) 100%)', borderColor: 'rgba(197, 160, 89, 0.4)' }}>
            <div className="px-6 pt-6 pb-2 text-offwhite/40 text-xs uppercase tracking-widest">Choose Your Service</div>
            <div className="px-6 pb-6 space-y-3">
              {displayCategories.map((category) => {
                const isOpen = displayCategories.length === 1 || expandedCategory === category;
                const catServices = groupedServices[category];
                return (
                  <div key={category} className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(197,160,89,0.2)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <button
                      onClick={() => { setExpandedCategory(isOpen ? null : category); }}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/3 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading text-base text-gold">{category}</h3>
                        <span className="text-offwhite/30 text-xs">({catServices.length})</span>
                      </div>
                      <svg className={`w-4 h-4 text-gold transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {catServices.map((service) => {
                          const isSelected = selectedServices.some((s) => s.id === service.id);
                          return (
                            <button
                              key={service.id}
                              onClick={() => {
                                if (service.id === 'bridal-party') { setShowGroupModal(true); return; }
                                toggleService(service);
                              }}
                              className={`rounded-xl p-4 text-left border transition-all flex items-center gap-3 ${
                                isSelected ? 'border-2' : 'border-offwhite/5'
                              }`}
                              style={{
                                backgroundColor: 'rgba(255,255,255,0.02)',
                                borderColor: isSelected ? 'rgba(197, 160, 89, 0.6)' : 'rgba(255,255,255,0.05)',
                              }}
                            >
                              <div className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center ${
                                isSelected ? 'border-gold bg-gold' : 'border-offwhite/30'
                              }`}>
                                {isSelected && (
                                  <svg className="w-3 h-3 text-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="font-heading text-base text-offwhite mb-0.5">{service.name}</div>
                                <div className="text-offwhite/40 text-xs">{service.duration_minutes || service.duration || 0} min</div>
                              </div>
                              <div className="text-gold font-heading text-lg">{service.price ? `$${service.price}` : 'From'}</div>
                            </button>
                          );
                        })}
                        {category === 'Packages' && (
                          <button
                            key="bridal-party"
                            onClick={() => setShowGroupModal(true)}
                            className="rounded-xl p-4 text-left border-2 transition-all flex flex-col gap-2"
                            style={{
                              background: 'linear-gradient(135deg, rgba(197, 160, 89, 0.15) 0%, rgba(197, 160, 89, 0.05) 100%)',
                              borderColor: 'rgba(197, 160, 89, 0.5)',
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 text-[10px] rounded-full bg-gold/30 border border-gold/50 text-gold font-heading uppercase tracking-widest">Group Special</span>
                            </div>
                            <div className="font-heading text-base text-offwhite">Bridal Party Bundle</div>
                            <div className="text-offwhite/50 text-xs leading-relaxed">Group booking for 4+ people — enjoy a 25% discount applied automatically to your total bill at checkout!</div>
                            <div className="text-gold font-heading text-sm">Book Now</div>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedServices.length > 0 && addOns.length > 0 && (
            <div className="rounded-2xl p-6 border" style={{ borderColor: 'rgba(197, 160, 89, 0.3)', backgroundColor: '#111' }}>
              <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-4">Add-Ons (Optional)</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {addOns.map((addOn) => (
                  <label
                    key={addOn.id}
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedAddOns.includes(addOn.id) ? 'border-gold bg-gold/10' : 'border-offwhite/10 hover:border-gold/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAddOns.includes(addOn.id)}
                      onChange={() => toggleAddOn(addOn.id)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center ${
                      selectedAddOns.includes(addOn.id) ? 'border-gold bg-gold' : 'border-offwhite/30'
                    }`}>
                      {selectedAddOns.includes(addOn.id) && (
                        <svg className="w-3 h-3 text-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-offwhite font-heading text-sm">{addOn.name}</div>
                      <div className="text-offwhite/40 text-xs">+{addOn.duration_minutes} min</div>
                    </div>
                    <div className="text-gold font-heading text-sm">+${addOn.price}</div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {selectedServices.length > 0 && (
            <div className="rounded-2xl p-8 border" style={{ borderColor: 'rgba(197, 160, 89, 0.3)', backgroundColor: '#111' }}>
              <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-6">Select Date & Time</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div className="text-offwhite/50 text-sm mb-3">Date</div>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => { setSelectedDate(e.target.value); setSelectedTech(null); }}
                    min={today}
                    className="w-full p-4 text-offwhite border border-offwhite/10 rounded-xl focus:border-gold focus:outline-none"
                    style={{ backgroundColor: '#1a1a1a' }}
                  />
                </div>
                <div>
                  <div className="text-offwhite/50 text-sm mb-3">Preferred Time</div>
                  <select
                    value={selectedTime}
                    onChange={(e) => { setSelectedTime(e.target.value); setSelectedTech(null); }}
                    className="w-full p-4 text-offwhite border border-offwhite/10 rounded-xl focus:border-gold focus:outline-none"
                    style={{ backgroundColor: '#1a1a1a' }}
                  >
                    <option value="">Select a time</option>
                    {timeSlots.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {selectedServices.length > 0 && selectedDate && selectedTime && (
            <div className="rounded-2xl p-8 border" style={{ borderColor: 'rgba(197, 160, 89, 0.3)', backgroundColor: '#111' }}>
              <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-6">Choose Technician</div>

              {loadingTechs && (
                <div className="text-center py-4">
                  <div className="text-offwhite/50 text-sm">Loading available technicians...</div>
                </div>
              )}

              {!loadingTechs && availableTechnicians.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center bg-red-500/10">
                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-offwhite/70 font-heading text-lg mb-2">No technicians available</p>
                  <p className="text-offwhite/40 text-sm">No one is scheduled for {selectedTime} on this date. Please choose another time.</p>
                </div>
              )}

              {!loadingTechs && availableTechnicians.length > 0 && (
                <>
                  <div className="text-center py-2 text-gold text-xs mb-4">{availableTechnicians.length} technician(s) available</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {availableTechnicians.map((tech) => (
                      <button
                        key={tech.staff_id}
                        onClick={() => setSelectedTech(tech)}
                        className={`min-w-0 rounded-xl p-4 text-center border transition-all ${selectedTech?.staff_id === tech.staff_id ? 'border-2' : 'border-offwhite/5'}`}
                        style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: selectedTech?.staff_id === tech.staff_id ? 'rgba(197, 160, 89, 0.6)' : 'rgba(255,255,255,0.05)' }}
                      >
                        <div className="w-12 h-12 rounded-full mx-auto mb-2 bg-gold/20 flex items-center justify-center">
                          <span className="text-gold font-heading text-sm">{tech.staff_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</span>
                        </div>
                        <div className="text-offwhite font-heading text-sm">{tech.staff_name}</div>
                        <div className="text-offwhite/40 text-xs capitalize mt-1">{tech.shift_type}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {availableTechnicians.length === 0 && (
                <div className="text-center py-2 text-offwhite/40 text-sm">
                  No technicians scheduled - booking without assigned technician
                </div>
              )}
            </div>
          )}

          {selectedServices.length > 0 && selectedDate && selectedTime && (
            <div className="rounded-2xl p-8 border-2" style={{ borderColor: 'rgba(197, 160, 89, 0.4)', background: 'linear-gradient(135deg, rgba(197, 160, 89, 0.05) 0%, #111 100%)' }}>
              <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-6">Booking Summary</div>
              <div className="flex items-start justify-between mb-6">
                <div>
                  {selectedServices.map((s) => (
                    <div key={s.id} className="font-heading text-xl text-offwhite mb-1">{s.name} — ${s.price}</div>
                  ))}
                  {selectedAddOnDetails.length > 0 && (
                    <div className="text-offwhite/50 text-sm mb-2">
                      + {selectedAddOnDetails.map((a) => a.name).join(', ')}
                    </div>
                  )}
                  <div className="text-offwhite/50 text-sm">{totalMinutes} min {selectedTech?.staff_name ? `with ${selectedTech.staff_name}` : '(technician optional)'}</div>
                  <div className="text-offwhite/50 text-sm mt-1">
                    {new Date(`${selectedDate}T${selectedTime}`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {selectedTime}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-gold font-heading text-3xl">${totalPrice.toFixed(2)}</div>
                  {selectedServices.length > 0 && (
                    <div className="text-offwhite/40 text-xs mt-1">
                      ({selectedServices.length} service{selectedServices.length > 1 ? 's' : ''})
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={handleBooking}
                disabled={bookLoading}
                className="w-full py-4 bg-gold text-charcoal font-heading tracking-wider text-sm rounded-xl hover:bg-gold/90 transition-colors shadow-lg shadow-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bookLoading ? 'Confirming...' : 'Confirm Booking'}
              </button>
            </div>
          )}

          {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md flex flex-col max-h-[min(90dvh,calc(100dvh-2rem))] bg-[#1a1a1a] rounded-t-2xl sm:rounded-xl overflow-hidden mx-0 sm:mx-4 border border-gold/10 shadow-2xl" style={{ borderColor: 'rgba(197, 160, 89, 0.5)' }}>
            <div className="flex items-center justify-between gap-4 p-4 sm:p-6 border-b border-gold/10">
              <div>
                <span className="px-3 py-1 text-[10px] rounded-full bg-gold/30 border border-gold/50 text-gold font-heading uppercase tracking-widest">Group Special</span>
                <h3 className="font-heading text-2xl text-offwhite mt-3">Bridal Party Bundle</h3>
                <p className="text-offwhite/50 text-sm mt-2">Booking for 4+ people — enjoy a 25% discount at checkout!</p>
              </div>
              <button onClick={() => setShowGroupModal(false)} className="text-offwhite/40 hover:text-offwhite text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-offwhite/60 text-sm mb-2">Number of Guests</label>
                <input
                  type="number"
                  min="4"
                  value={groupSize}
                  onChange={(e) => setGroupSize(e.target.value)}
                  placeholder="Min. 4 guests"
                  className="w-full p-4 text-offwhite border border-offwhite/10 rounded-xl focus:border-gold focus:outline-none"
                  style={{ backgroundColor: '#1a1a1a' }}
                />
                <p className="text-offwhite/30 text-xs mt-1">Minimum 4 guests required for the group discount</p>
              </div>
              <div className="p-4 rounded-xl border" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(197, 160, 89, 0.2)' }}>
                <p className="text-offwhite/60 text-sm">
                  Your group booking will be saved and our team will contact you to confirm services and timing for each guest.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowGroupModal(false); setGroupSize(''); }}
                  className="flex-1 py-3 border border-offwhite/20 text-offwhite/60 rounded-xl hover:text-offwhite transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (groupSize >= 4 && userId) {
                      supabase.from('appointments').insert({
                        customer_id: userId,
                        service_id: null,
                        scheduled_at: null,
                        checked_in_at: null,
                        status: 'confirmed',
                        booking_type: 'online',
                        notes: `Bridal Party Bundle - Group size: ${groupSize} guests (25% discount)`,
                      });
                      setShowGroupModal(false);
                      setBookingSuccess(true);
                    }
                  }}
                  disabled={!groupSize || groupSize < 4}
                  className="flex-1 py-3 bg-gold text-charcoal font-heading rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-50"
                >
                  Confirm Group Booking
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}