import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function getWeekDates(date) {
  const d = new Date(date);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    dates.push(dt);
  }
  return dates;
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(time) {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

function getDayName(dayIdx) {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayIdx];
}

const STATUS_COLORS = {
  waiting: 'bg-yellow-400',
  assigned_pending: 'bg-blue-400',
  serving: 'bg-green-400',
  completed: 'bg-offwhite/40',
  cancelled: 'bg-red-400'
};

const STATUS_LABELS = {
  waiting: 'Waiting',
  assigned_pending: 'Assigned',
  serving: 'Serving',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

export default function TechnicianSchedule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduleData, setScheduleData] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [techId, setTechId] = useState(null);

  // Detail popup state
  const [detailModal, setDetailModal] = useState({
    open: false,
    date: null,
    dayAppts: []
  });

  const weekDates = getWeekDates(currentDate);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'technician') {
      fetchTechIdAndData(user.phone);
    } else {
      setLoading(false);
    }
  }, [user, currentDate]);

  async function fetchTechIdAndData(phone) {
    try {
      setLoading(true);
      const { data: tech, error: tErr } = await supabase
        .from('technicians')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

      if (tErr) throw tErr;
      if (!tech) {
        setLoading(false);
        return;
      }

      setTechId(tech.id);
      await loadScheduleAndAppointments(tech.id);
    } catch (err) {
      console.error('Error fetching technician details:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadScheduleAndAppointments(tId) {
    const startIso = weekDates[0].toISOString().split('T')[0];
    const endIso = weekDates[6].toISOString().split('T')[0];

    // 1. Fetch Schedule blocks
    const { data: sched, error: sErr } = await supabase
      .from('technician_schedules')
      .select('*')
      .eq('technician_id', tId)
      .gte('date', startIso)
      .lte('date', endIso);

    if (sErr) console.error(sErr);
    setScheduleData(sched || []);

    // 2. Fetch Appointments via RPC or regular query filtered by tech_id
    const { data: appts, error: aErr } = await supabase
      .from('appointments')
      .select(`
        id,
        customer_name,
        service_name,
        appointment_time,
        status,
        final_price,
        source
      `)
      .eq('technician_id', tId)
      .gte('appointment_time', `${startIso}T00:00:00`)
      .lte('appointment_time', `${endIso}T23:59:59`);

    if (aErr) console.error(aErr);
    setAppointments(appts || []);
  }

  const handlePrevWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(currentDate.getDate() - 7);
    setCurrentDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() + 7);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const openDayDetails = (dateObj, dayAppts) => {
    setDetailModal({
      open: true,
      date: dateObj,
      dayAppts: dayAppts
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center text-gold">
        <div className="text-xl tracking-widest animate-pulse">LOADING SCHEDULE...</div>
      </div>
    );
  }

  if (user?.role !== 'technician') {
    return (
      <div className="min-h-screen bg-[#0B0B0C] text-white pl-0 md:pl-20 lg:pl-64">
        <Sidebar />
        <div className="p-8 text-center">
          <h1 className="text-2xl text-gold font-heading mb-4">Access Restricted</h1>
          <p className="text-offwhite/60">This page is reserved for technician personnel schedules.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
      <Sidebar />

      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl mx-auto">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gold/10 pb-6 mb-6">
          <div>
            <h1 className="font-heading text-3xl text-gold tracking-wide">My Schedule</h1>
            <p className="text-xs text-offwhite/40 mt-1">Weekly overview of availability and assigned client packages</p>
          </div>
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-start">
            <button 
              onClick={handleToday}
              className="px-3 py-1.5 bg-offwhite/5 border border-offwhite/10 text-offwhite hover:border-gold/30 rounded-lg text-xs font-medium transition-all"
            >
              Today
            </button>
            <div className="flex items-center bg-offwhite/5 border border-offwhite/10 rounded-lg p-0.5">
              <button onClick={handlePrevWeek} className="p-1.5 text-offwhite/60 hover:text-gold transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="px-3 text-xs font-medium tracking-wider text-offwhite/80 min-w-[140px] text-center">
                {formatDate(weekDates[0])} – {formatDate(weekDates[6])}
              </span>
              <button onClick={handleNextWeek} className="p-1.5 text-offwhite/60 hover:text-gold transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid container */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {weekDates.map((dateObj, idx) => {
            const dateIso = dateObj.toISOString().split('T')[0];
            const isToday = new Date().toISOString().split('T')[0] === dateIso;
            
            // Find schedule block
            const daySched = scheduleData.find(s => s.date === dateIso);
            const isWorking = daySched && daySched.is_working;

            // Filter appointments for this date
            const dayAppts = appointments.filter(a => {
              return a.appointment_time.split('T')[0] === dateIso;
            });

            return (
              <div 
                key={idx}
                onClick={() => openDayDetails(dateObj, dayAppts)}
                className={`flex flex-col min-h-[140px] md:min-h-[220px] bg-offwhite/5 border rounded-xl p-3 cursor-pointer hover:border-gold/30 transition-all group ${
                  isToday ? 'border-gold bg-gold/[0.02]' : 'border-gold/10'
                }`}
              >
                {/* Day title info */}
                <div className="flex items-center justify-between border-b border-offwhite/5 pb-2 mb-2">
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-bold tracking-widest ${isToday ? 'text-gold' : 'text-offwhite/40'}`}>
                      {DAYS[idx]}
                    </span>
                    <span className={`text-sm font-heading ${isToday ? 'text-gold' : 'text-offwhite'}`}>
                      {dateObj.getDate()}
                    </span>
                  </div>
                  
                  {/* Working Status Badge */}
                  <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    isWorking 
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {isWorking ? 'ON' : 'OFF'}
                  </span>
                </div>

                {/* Shift Hours description */}
                {isWorking && (daySched.start_time || daySched.end_time) ? (
                  <div className="text-[10px] text-offwhite/60 mb-2 font-medium">
                    {formatTime(daySched.start_time)} - {formatTime(daySched.end_time)}
                  </div>
                ) : null}

                {/* Micro Appointment Stack */}
                <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
                  {dayAppts.slice(0, 3).map((appt, aIdx) => (
                    <div 
                      key={aIdx} 
                      className="text-[10px] p-1.5 rounded bg-white/5 border border-white/5 flex flex-col gap-0.5 truncate group-hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium text-offwhite truncate">{appt.customer_name}</span>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_COLORS[appt.status] || 'bg-gray-400'}`} />
                      </div>
                      <span className="text-gold/80 truncate">{appt.service_name}</span>
                    </div>
                  ))}
                  
                  {dayAppts.length > 3 && (
                    <div className="text-[9px] text-gold/60 text-center font-medium mt-auto pt-1">
                      + {dayAppts.length - 3} more packages
                    </div>
                  )}

                  {dayAppts.length === 0 && isWorking && (
                    <div className="text-[10px] text-offwhite/20 italic my-auto text-center">
                      No assignments
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Responsive Floating Detail Modal Window */}
      {detailModal.open && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm" 
          onClick={() => setDetailModal({ open: false, date: null, dayAppts: [] })}
        >
          <div 
            className="w-full max-w-lg h-[85vh] sm:h-auto sm:max-h-[90vh] flex flex-col bg-[#1a1a1a] rounded-t-2xl sm:rounded-xl overflow-hidden mx-0 sm:mx-4 border border-gold/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gold/10 shrink-0">
              <div>
                <h3 className="font-heading text-lg text-gold mb-0">
                  {getDayName(detailModal.date?.getDay())} Bookings
                </h3>
                <p className="text-xs text-offwhite/40 mt-0.5">
                  {detailModal.date?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <button 
                onClick={() => setDetailModal({ open: false, date: null, dayAppts: [] })}
                className="text-offwhite/40 hover:text-offwhite text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
              >
                &times;
              </button>
            </div>

            {/* Modal Scrollable Content Section */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {detailModal.dayAppts.length === 0 ? (
                <div className="text-center py-12 text-offwhite/30 italic text-sm">
                  No appointments scheduled or assigned for this calendar date.
                </div>
              ) : (
                detailModal.dayAppts.map((a, idx) => (
                  <div 
                    key={idx}
                    className="p-4 rounded-xl bg-offwhite/5 border border-gold/10 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-heading text-base text-offwhite">{a.customer_name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                        a.status === 'waiting' ? 'bg-yellow-400/20 text-yellow-400' :
                        a.status === 'assigned_pending' ? 'bg-blue-400/20 text-blue-400' :
                        a.status === 'serving' ? 'bg-green-400/20 text-green-400' :
                        a.status === 'completed' ? 'bg-offwhite/10 text-offwhite/60' :
                        'bg-red-400/20 text-red-400'
                      }`}>
                        {STATUS_LABELS[a.status] || a.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-1 text-xs border-t border-white/5">
                      <div>
                        <div className="text-offwhite/40 text-[10px] uppercase tracking-wider">Service Requested</div>
                        <div className="text-offwhite font-medium mt-0.5">{a.service_name}</div>
                      </div>
                      <div>
                        <div className="text-offwhite/40 text-[10px] uppercase tracking-wider">Appointment Time</div>
                        <div className="text-offwhite font-medium mt-0.5">
                          {new Date(a.appointment_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </div>
                      <div>
                        <div className="text-offwhite/40 text-[10px] uppercase tracking-wider">Booking Method</div>
                        <div className="mt-0.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                            a.source === 'online' ? 'bg-gold/10 text-gold border border-gold/20' : 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20'
                          }`}>
                            {a.source === 'online' ? 'Online App' : 'Walk-in'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-offwhite/40 text-[10px] uppercase tracking-wider">Total Revenue</div>
                        <div className="text-gold font-heading text-sm mt-0.5">${parseFloat(a.final_price || 0).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}