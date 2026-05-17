import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import { CATEGORIES, CATEGORY_ORDER, SERVICES } from '../data/servicesData';

export default function CustomerBooking() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [technicians, setTechnicians] = useState([]);
  const [selectedTech, setSelectedTech] = useState(null);
  const [bookLoading, setBookLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupSize, setGroupSize] = useState('');

  const currentUser = localStorage.getItem('salon_user_data');
  const userData = currentUser ? JSON.parse(currentUser) : null;
  const firstName = userData?.full_name ? userData.full_name.split(' ')[0] : 'there';

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.is_staff) {
      const route = (user.role === 'super_admin' || user.role === 'owner' || user.role === 'partner') ? '/superadmin' : `/${user.role}`;
      navigate(route);
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    const currentUser = localStorage.getItem('salon_user_data');
    const userId = currentUser ? JSON.parse(currentUser).id : null;
    if (!userId) { setLoading(false); navigate('/login'); return; }
    try {
      const { data: servicesData } = await supabase.from('services').select('*').order('category').order('name');
      const { data: techData } = await supabase.from('profiles').select('*').eq('role', 'technician').order('full_name');
      setServices(servicesData || []);
      setTechnicians(techData || []);
    } catch { }
    setLoading(false);
  };

  const groupedServices = [...services, ...SERVICES].reduce((acc, service) => {
    const cat = service.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(service);
    return acc;
  }, {});

  const sortedCategories = Object.keys(groupedServices).sort((a, b) => {
    const aIdx = CATEGORY_ORDER.indexOf(a);
    const bIdx = CATEGORY_ORDER.indexOf(b);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

  const displayCategories = activeCategory === 'All'
    ? sortedCategories
    : sortedCategories.filter((c) => c === activeCategory);

  const addOns = services.filter((s) => s.is_addon);
  const selectedAddOnDetails = addOns.filter((a) => selectedAddOns.includes(a.id));

  const totalPrice = (selectedService?.price || 0) + selectedAddOnDetails.reduce((sum, a) => sum + (a.price || 0), 0);
  const totalMinutes = (selectedService?.duration_minutes || 0) + selectedAddOnDetails.reduce((sum, a) => sum + (a.duration_minutes || 0), 0);

  const toggleAddOn = (addOnId) => {
    setSelectedAddOns((prev) =>
      prev.includes(addOnId) ? prev.filter((id) => id !== addOnId) : [...prev, addOnId]
    );
  };

  const handleBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return;
    setBookLoading(true);
    const currentUser = localStorage.getItem('salon_user_data');
    const userId = currentUser ? JSON.parse(currentUser).id : null;
    if (!userId) { setBookLoading(false); navigate('/login'); return; }
    const checkInTime = new Date(`${selectedDate}T${selectedTime}:00`);
    const { error } = await supabase.from('online_bookings').insert({
      profile_id: userId,
      service_id: selectedService.id,
      technician_id: selectedTech?.id || null,
      scheduled_time: checkInTime.toISOString(),
      status: 'pending',
      price: totalPrice,
    });
    if (!error) setBookingSuccess(true);
    setBookLoading(false);
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
            <h3 className="font-heading text-2xl text-offwhite mb-6">Booking Pending</h3>
            <p className="text-offwhite/60 mb-4">Your appointment request has been submitted successfully and is awaiting confirmation. We'll notify you shortly once it's confirmed.</p>
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
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setExpandedCategory(null); setSelectedService(null); setSelectedAddOns([]); }}
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
                          const isMain = service.is_addon;
                          return (
                            <button
                              key={service.id}
                              onClick={() => {
                                if (service.id === 'bridal-party') { setShowGroupModal(true); return; }
                                if (!isMain) { setSelectedService(service); setSelectedAddOns([]); }
                              }}
                              className={`rounded-xl p-4 text-left border transition-all flex items-center gap-3 ${
                                selectedService?.id === service.id ? 'border-2' : 'border-offwhite/5'
                              } ${isMain ? 'opacity-60' : ''}`}
                              style={{
                                backgroundColor: 'rgba(255,255,255,0.02)',
                                borderColor: selectedService?.id === service.id ? 'rgba(197, 160, 89, 0.6)' : 'rgba(255,255,255,0.05)',
                              }}
                            >
                              {!isMain && (
                                <div className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center ${
                                  selectedService?.id === service.id ? 'border-gold bg-gold' : 'border-offwhite/30'
                                }`}>
                                  {selectedService?.id === service.id && (
                                    <svg className="w-3 h-3 text-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                              )}
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

          {selectedService && addOns.length > 0 && (
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

          {selectedService && (
            <div className="rounded-2xl p-8 border" style={{ borderColor: 'rgba(197, 160, 89, 0.3)', backgroundColor: '#111' }}>
              <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-6">Select Date & Time</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div className="text-offwhite/50 text-sm mb-3">Date</div>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={today}
                    className="w-full p-4 text-offwhite border border-offwhite/10 rounded-xl focus:border-gold focus:outline-none"
                    style={{ backgroundColor: '#1a1a1a' }}
                  />
                </div>
                <div>
                  <div className="text-offwhite/50 text-sm mb-3">Preferred Time</div>
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
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

          {selectedService && selectedDate && selectedTime && (
            <div className="rounded-2xl p-8 border" style={{ borderColor: 'rgba(197, 160, 89, 0.3)', backgroundColor: '#111' }}>
              <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-6">Choose Technician (Optional)</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setSelectedTech(null)}
                  className={`rounded-xl p-4 text-center border transition-all ${!selectedTech ? 'border-2' : 'border-offwhite/5'}`}
                  style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: !selectedTech ? 'rgba(197, 160, 89, 0.6)' : 'rgba(255,255,255,0.05)' }}
                >
                  <div className="w-12 h-12 rounded-full mx-auto mb-2 bg-offwhite/10 flex items-center justify-center">
                    <span className="text-offwhite/60 font-heading">Any</span>
                  </div>
                  <div className="text-offwhite font-heading text-sm">No Preference</div>
                </button>
                 {technicians.map((tech) => (
                   <button
                     key={tech.id}
                     onClick={() => setSelectedTech(tech)}
                     className={`min-w-0 rounded-xl p-4 text-center border transition-all ${selectedTech?.id === tech.id ? 'border-2' : 'border-offwhite/5'}`}
                     style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: selectedTech?.id === tech.id ? 'rgba(197, 160, 89, 0.6)' : 'rgba(255,255,255,0.05)' }}
                   >
                    <div className="w-12 h-12 rounded-full mx-auto mb-2 bg-gold/20 flex items-center justify-center">
                      <span className="text-gold font-heading text-sm">{tech.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</span>
                    </div>
                    <div className="text-offwhite font-heading text-sm">{tech.full_name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedService && selectedDate && selectedTime && (
            <div className="rounded-2xl p-8 border-2" style={{ borderColor: 'rgba(197, 160, 89, 0.4)', background: 'linear-gradient(135deg, rgba(197, 160, 89, 0.05) 0%, #111 100%)' }}>
              <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-6">Booking Summary</div>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="font-heading text-2xl text-offwhite mb-1">{selectedService.name}</div>
                  {selectedAddOnDetails.length > 0 && (
                    <div className="text-offwhite/50 text-sm mb-2">
                      + {selectedAddOnDetails.map((a) => a.name).join(', ')}
                    </div>
                  )}
                  <div className="text-offwhite/50 text-sm">{totalMinutes} min with {selectedTech?.full_name || 'Any Technician'}</div>
                  <div className="text-offwhite/50 text-sm mt-1">
                    {new Date(`${selectedDate}T${selectedTime}`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {selectedTime}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-gold font-heading text-3xl">${totalPrice}</div>
                  {selectedAddOnDetails.length > 0 && (
                    <div className="text-offwhite/40 text-xs mt-1">
                      ({selectedService.price} + {selectedAddOnDetails.length} add-on{selectedAddOnDetails.length > 1 ? 's' : ''})
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={handleBooking}
                disabled={bookLoading}
                className="w-full py-4 bg-gold text-charcoal font-heading tracking-wider text-sm rounded-xl hover:bg-gold/90 transition-colors shadow-lg shadow-gold/20 disabled:opacity-50"
              >
                {bookLoading ? 'Submitting...' : 'Submit Booking Request'}
              </button>
            </div>
          )}

          {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border-2 p-6" style={{ backgroundColor: '#111', borderColor: 'rgba(197, 160, 89, 0.5)' }}>
            <div className="text-center mb-6">
              <span className="px-3 py-1 text-[10px] rounded-full bg-gold/30 border border-gold/50 text-gold font-heading uppercase tracking-widest">Group Special</span>
              <h3 className="font-heading text-2xl text-offwhite mt-3">Bridal Party Bundle</h3>
              <p className="text-offwhite/50 text-sm mt-2">Booking for 4+ people — enjoy a 25% discount at checkout!</p>
            </div>
            <div className="space-y-4">
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
                    if (groupSize >= 4) {
                      const currentUser = localStorage.getItem('salon_user_data');
                      const userId = currentUser ? JSON.parse(currentUser).id : null;
                      if (userId) {
                        supabase.from('online_bookings').insert({
                          profile_id: userId,
                          service_id: null,
                          scheduled_time: null,
                          status: 'pending',
                          price: 0,
                          notes: `Bridal Party Bundle - Group size: ${groupSize} guests (25% discount)`,
                        });
                      }
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