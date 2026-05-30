import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import { CATEGORIES, CATEGORY_ORDER } from '../data/servicesData';

export default function EditBooking({ bookingId }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableTechnicians, setAvailableTechnicians] = useState([]);
  const [loadingTechs, setLoadingTechs] = useState(false);
  const [selectedTech, setSelectedTech] = useState(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedCategory, setExpandedCategory] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.is_staff) { navigate('/portal'); return; }
    fetchServices();
    loadBooking();
  }, [user, navigate]);

  const loadBooking = async () => {
    const userId = user?.id;
    if (!userId) { navigate('/login'); return; }

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', bookingId)
      .eq('customer_id', userId)
      .eq('booking_type', 'online')
      .single();

    if (error || !data) { setLoading(false); navigate('/customer/history'); return; }

    setBooking(data);
    setSelectedDate(data.scheduled_at ? data.scheduled_at.split('T')[0] : '');
    setSelectedTime(data.scheduled_at ? new Date(data.scheduled_at).toTimeString().slice(0, 5) : '');
    setNotes(data.notes || '');

    const svcNames = (data.add_ons || '').split(',').map((n) => n.trim()).filter(Boolean)
    if (svcNames.length > 0) {
      const { data: svcData } = await supabase
        .from('services')
        .select('*')
        .in('name', svcNames);
      if (svcData) setSelectedServices(svcData);
    } else if (data.service_id) {
      const { data: svcData } = await supabase
        .from('services')
        .select('*')
        .eq('id', data.service_id)
        .single();
      if (svcData) setSelectedServices([svcData]);
    }

    setSelectedAddOns([]);

    if (data.technician_id) {
      const { data: techData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', data.technician_id)
        .single();
      if (techData) setSelectedTech({ staff_id: techData.id, staff_name: techData.full_name });
    }

    setLoading(false);
  };

  const fetchServices = async () => {
    try {
      const { data } = await supabase.from('services').select('*').order('category').order('name');
      setServices(data || []);
    } catch { }
  };

  useEffect(() => {
    if (selectedDate && selectedTime) {
      fetchAvailableTechnicians();
    } else {
      setAvailableTechnicians([]);
      setSelectedTech(null);
    }
  }, [selectedDate, selectedTime]);

  const fetchAvailableTechnicians = async () => {
    setLoadingTechs(true);
    try {
      const { data } = await supabase.rpc('get_available_technicians', {
        p_date: selectedDate,
        p_time: selectedTime,
      });
      setAvailableTechnicians(data || []);
      if (data?.length === 0) setSelectedTech(null);
    } catch { setAvailableTechnicians([]); }
    setLoadingTechs(false);
  };

  const groupedServices = services.reduce((acc, service) => {
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

  const handleSave = async () => {
    if (selectedServices.length === 0 || !selectedDate || !selectedTime) {
      setError('Please fill in service, date, and time.');
      return;
    }
    setSaving(true);
    setError('');
    const newScheduled = new Date(`${selectedDate}T${selectedTime}:00`);
    const allNames = [...selectedServices.map((s) => s.name), ...selectedAddOns.map((id) => {
      const addOn = services.find((s) => s.id === id);
      return addOn?.name;
    }).filter(Boolean)].join(', ');
    try {
      const { error } = await supabase.from('appointments').update({
        service_id: selectedServices[0]?.id || null,
        add_ons: allNames || null,
        final_price: totalPrice,
        technician_id: selectedTech?.staff_id || null,
        scheduled_at: newScheduled.toISOString(),
        notes: notes || null,
      }).eq('id', bookingId);
      if (error) throw error;

      const userId = user?.id;
      const userName = user?.full_name || 'Customer';
      await supabase.from('notifications').insert({
        recipient_id: userId,
        reference_id: bookingId,
        title: 'Appointment Updated',
        body: `Hi ${userName?.split(' ')[0] || 'there'}, your appointment for ${selectedServices.map((s) => s.name).join(', ')} has been updated to ${newScheduled.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${selectedTime}.`,
        is_read: false,
      }).catch(() => {});

      navigate('/customer/history');
    } catch (err) {
      setError(err.message || 'Failed to update booking');
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Link to="/customer/history" className="text-offwhite/40 hover:text-gold text-sm">My Bookings</Link>
            <span className="text-offwhite/30">/</span>
            <span className="text-gold font-heading text-sm">Edit Booking</span>
          </div>
          <h1 className="font-heading text-4xl text-gold">Edit Booking</h1>
          <p className="text-offwhite/50 text-sm mt-1">Update your appointment details</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="rounded-2xl border-2 mb-6" style={{ background: 'linear-gradient(135deg, rgba(197, 160, 89, 0.08) 0%, rgba(26, 26, 26, 1) 100%)', borderColor: 'rgba(197, 160, 89, 0.4)' }}>
          <div className="px-6 pt-6 pb-2 text-offwhite/40 text-xs uppercase tracking-widest">Select Service</div>
          <div className="px-6 pb-6 space-y-3">
            {displayCategories.map((category) => {
              const isOpen = displayCategories.length === 1 || expandedCategory === category;
              const catServices = groupedServices[category];
              return (
                <div key={category} className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(197,160,89,0.2)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <button
                    onClick={() => setExpandedCategory(isOpen ? null : category)}
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
                            onClick={() => toggleService(service)}
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedServices.length > 0 && addOns.length > 0 && (
          <div className="rounded-2xl p-6 border mb-6" style={{ borderColor: 'rgba(197, 160, 89, 0.3)', backgroundColor: '#111' }}>
            <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-4">Add-Ons (Optional)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {addOns.map((addOn) => (
                <label
                  key={addOn.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedAddOns.includes(addOn.id) ? 'border-gold bg-gold/10' : 'border-offwhite/10 hover:border-gold/40'
                  }`}
                >
                  <input type="checkbox" checked={selectedAddOns.includes(addOn.id)} onChange={() => toggleAddOn(addOn.id)} className="sr-only" />
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
          <>
            <div className="rounded-2xl p-8 border mb-6" style={{ borderColor: 'rgba(197, 160, 89, 0.3)', backgroundColor: '#111' }}>
              <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-6">Date & Time</div>
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
                  <div className="text-offwhite/50 text-sm mb-3">Time</div>
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

            {selectedDate && selectedTime && (
              <div className="rounded-2xl p-8 border mb-6" style={{ borderColor: 'rgba(197, 160, 89, 0.3)', backgroundColor: '#111' }}>
                <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-6">Technician</div>
                {loadingTechs && <div className="text-center py-4 text-offwhite/50 text-sm">Loading...</div>}
                {!loadingTechs && availableTechnicians.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-offwhite/60 text-sm">No technicians available at this time. Please choose another time.</p>
                  </div>
                )}
                {!loadingTechs && availableTechnicians.length > 0 && (
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
                )}
              </div>
            )}

            <div className="rounded-2xl p-8 border mb-6" style={{ borderColor: 'rgba(197, 160, 89, 0.3)', backgroundColor: '#111' }}>
              <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-4">Notes (Optional)</div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any special requests or notes..."
                className="w-full p-4 text-offwhite border border-offwhite/10 rounded-xl focus:border-gold focus:outline-none resize-none"
                style={{ backgroundColor: '#1a1a1a' }}
              />
            </div>

            <div className="rounded-2xl p-8 border-2" style={{ borderColor: 'rgba(197, 160, 89, 0.4)', background: 'linear-gradient(135deg, rgba(197, 160, 89, 0.05) 0%, #111 100%)' }}>
              <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-6">Updated Summary</div>
              <div className="flex items-start justify-between mb-6">
                <div>
                  {selectedServices.map((s) => (
                    <div key={s.id} className="font-heading text-xl text-offwhite mb-1">{s.name} — ${s.price}</div>
                  ))}
                  {selectedAddOnDetails.length > 0 && (
                    <div className="text-offwhite/50 text-sm mb-2">+ {selectedAddOnDetails.map((a) => a.name).join(', ')}</div>
                  )}
                  <div className="text-offwhite/50 text-sm">{totalMinutes} min with {selectedTech?.staff_name || 'Any Technician'}</div>
                  <div className="text-offwhite/50 text-sm mt-1">
                    {selectedDate && selectedTime
                      ? `${new Date(`${selectedDate}T${selectedTime}`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at ${selectedTime}`
                      : 'No date/time selected'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-gold font-heading text-3xl">${totalPrice}</div>
                </div>
              </div>
              <div className="flex gap-3">
                <Link
                  to="/customer/history"
                  className="flex-1 py-4 border border-offwhite/20 text-offwhite/60 rounded-xl hover:bg-offwhite/5 transition-colors text-center font-heading text-sm"
                >
                  Cancel
                </Link>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-4 bg-gold text-charcoal font-heading tracking-wider text-sm rounded-xl hover:bg-gold/90 transition-colors shadow-lg shadow-gold/20 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}