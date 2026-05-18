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
  completed: 'bg-offwhite/30',
  cancelled: 'bg-red-400',
};

const STATUS_LABELS = {
  waiting: 'Waiting',
  assigned_pending: 'Confirmed',
  serving: 'In Service',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function TechnicianSchedule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [weekOffset, setWeekOffset] = useState(0);
  const [shifts, setShifts] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('schedule');
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [timeOffForm, setTimeOffForm] = useState({ start_date: '', end_date: '', reason: '' });
  const [submittingTimeOff, setSubmittingTimeOff] = useState(false);
  const [timeOffError, setTimeOffError] = useState('');
  const [timeOffSuccess, setTimeOffSuccess] = useState(false);
  const [detailModal, setDetailModal] = useState({ open: false, date: null, dayAppts: [] });

  const weekDates = getWeekDates(new Date(Date.now() + weekOffset * 7 * 24 * 60 * 60 * 1000));

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!['technician', 'cashier'].includes(user.role)) {
      navigate(user.role === 'super_admin' || user.role === 'owner' || user.role === 'partner' ? '/superadmin' : '/admin');
      return;
    }
    fetchData();
  }, [user, navigate, weekOffset]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const startDate = weekDates[0].toISOString().split('T')[0];
      const endDate = weekDates[6].toISOString().split('T')[0];

      const [shiftsRes, apptsRes] = await Promise.all([
        supabase.rpc('get_staff_schedule', { p_start_date: startDate, p_end_date: endDate, p_staff_id: user.id }),
        supabase.rpc('get_technician_appointments', { p_staff_id: user.id, p_start_date: startDate, p_end_date: endDate }),
      ]);

      if (shiftsRes.data) setShifts(shiftsRes.data);
      if (apptsRes.data) setAppointments(apptsRes.data || []);
    } catch (err) {
      console.error('Error fetching schedule data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMyShiftForDate = (dateStr) => {
    return shifts.filter(s => s.shift_date === dateStr);
  };

  const getAppointmentsForDate = (dateStr) => {
    return appointments.filter(a => {
      const apptDate = new Date(a.appointment_time).toISOString().split('T')[0];
      return apptDate === dateStr;
    });
  };

  const openDetailModal = (date, dayAppts) => {
    setDetailModal({ open: true, date, dayAppts });
  };

  const handleSubmitTimeOff = async (e) => {
    e.preventDefault();
    setTimeOffError('');
    setTimeOffSuccess(false);
    if (!timeOffForm.start_date || !timeOffForm.end_date) {
      setTimeOffError('Please select start and end dates');
      return;
    }
    setSubmittingTimeOff(true);
    try {
      await supabase.rpc('create_time_off_request', {
        p_staff_id: user.id,
        p_start_date: timeOffForm.start_date,
        p_end_date: timeOffForm.end_date,
        p_reason: timeOffForm.reason || null,
      });
      setTimeOffSuccess(true);
      setShowTimeOffModal(false);
      setTimeOffForm({ start_date: '', end_date: '', reason: '' });
    } catch (err) {
      setTimeOffError(err.message || 'Failed to submit request');
    } finally {
      setSubmittingTimeOff(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading schedule...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-3xl text-gold">My Schedule</h1>
            <p className="text-offwhite/60 text-sm mt-1">Your shifts and appointments this week</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(w => w - 1)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-offwhite/10 hover:bg-offwhite/20 transition-colors text-offwhite/60">&#8249;</button>
            <div className="px-3 py-2 text-sm text-offwhite/80 rounded-lg bg-offwhite/5 border border-offwhite/10 min-w-[180px] text-center">
              {formatDate(weekDates[0])} &ndash; {formatDate(weekDates[6])}
            </div>
            <button onClick={() => setWeekOffset(w => w + 1)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-offwhite/10 hover:bg-offwhite/20 transition-colors text-offwhite/60">&#8250;</button>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} className="px-3 py-2 text-xs text-gold border border-gold/30 rounded-lg hover:bg-gold/10 transition-colors">Today</button>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('schedule')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'schedule' ? 'bg-gold text-charcoal' : 'bg-offwhite/10 text-offwhite/60 hover:bg-offwhite/20'}`}>
            My Schedule
          </button>
          <button onClick={() => setActiveTab('timeoff')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'timeoff' ? 'bg-gold text-charcoal' : 'bg-offwhite/10 text-offwhite/60 hover:bg-offwhite/20'}`}>
            Request Time Off
          </button>
        </div>

        {activeTab === 'schedule' && (
          <div className="space-y-3">
            {weekDates.map((d, dayIdx) => {
              const dateStr = d.toISOString().split('T')[0];
              const dayShifts = getMyShiftForDate(dateStr);
              const dayAppts = getAppointmentsForDate(dateStr);
              const isToday = d.toDateString() === new Date().toDateString();
              const isPast = d < new Date(new Date().setHours(0, 0, 0, 0));

              return (
                <div key={dayIdx} className={`rounded-xl p-5 border transition-all ${isToday ? 'border-gold/40 bg-gold/5' : 'border-offwhite/10 bg-offwhite/[0.02]'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-heading ${isToday ? 'bg-gold text-charcoal' : 'bg-offwhite/10 text-offwhite/60'}`}>
                        <div>
                          <div className={`text-xs ${isToday ? 'text-charcoal' : 'text-offwhite/40'}`}>{DAYS[dayIdx]}</div>
                          <div className={`text-lg ${isToday ? 'text-charcoal font-bold' : 'text-offwhite'}`}>{d.getDate()}</div>
                        </div>
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${isToday ? 'text-gold' : 'text-offwhite'}`}>{getDayName(dayIdx)}</div>
                        {isToday && <div className="text-xs text-gold/70">Today</div>}
                        {isPast && <div className="text-xs text-offwhite/30">Past</div>}
                      </div>
                    </div>
                    {dayShifts.length > 0 && (
                      <div className="text-right">
                        {dayShifts.map(s => (
                          <div key={s.shift_id} className="text-offwhite/60 text-xs">
                            {formatTime(s.start_time)} &ndash; {formatTime(s.end_time)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {dayShifts.length === 0 ? (
                    <div className="text-offwhite/30 text-sm text-center py-3 border border-dashed border-offwhite/10 rounded-lg">
                      {isPast ? 'No shift recorded' : 'No shift scheduled'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dayShifts.map(s => {
                        const total = (s.appointment_count || 0) + (s.confirmed_online_count || 0);
                        return (
                          <div key={s.shift_id} className="rounded-lg p-3 bg-gold/10 border border-gold/20">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-gold text-sm font-medium capitalize">{s.shift_type}</span>
                                <span className="text-offwhite/40 text-xs ml-2">{formatTime(s.start_time)} &ndash; {formatTime(s.end_time)}</span>
                              </div>
                              {total > 0 ? (
                                <button
                                  onClick={() => openDetailModal(d, dayAppts)}
                                  className="px-3 py-1 rounded-full text-xs font-medium bg-gold/20 text-gold hover:bg-gold/30 transition-colors border border-gold/30"
                                >
                                  {total} appointment{total !== 1 ? 's' : ''}
                                </button>
                              ) : (
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-offwhite/10 text-offwhite/40">
                                  No appointments
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {dayAppts.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-offwhite/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-offwhite/40 text-xs uppercase tracking-wider">
                          {dayAppts.length} appointment{dayAppts.length !== 1 ? 's' : ''} this day
                        </div>
                        <button
                          onClick={() => openDetailModal(d, dayAppts)}
                          className="text-gold text-xs hover:underline"
                        >
                          View details
                        </button>
                      </div>
                      {dayAppts.slice(0, 3).map(a => (
                        <div key={a.appointment_id} className="flex items-center justify-between p-2 bg-offwhite/5 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${a.source === 'online' ? 'bg-gold' : 'bg-yellow-400'}`} />
                            <div>
                              <div className="text-offwhite text-sm">{a.customer_name}</div>
                              <div className="text-offwhite/40 text-xs">{a.service_name}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-gold text-sm font-heading">${a.final_price}</div>
                            <div className="text-offwhite/30 text-xs capitalize">{a.status.replace('_', ' ')}</div>
                          </div>
                        </div>
                      ))}
                      {dayAppts.length > 3 && (
                        <button
                          onClick={() => openDetailModal(d, dayAppts)}
                          className="w-full text-center text-gold text-xs py-2 hover:underline"
                        >
                          +{dayAppts.length - 3} more
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {weekDates.every(d => getMyShiftForDate(d.toISOString().split('T')[0]).length === 0) && (
              <div className="rounded-xl p-12 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(197,160,89,0.15)' }}>
                <div className="text-4xl mb-3">&#128337;</div>
                <h2 className="font-heading text-2xl text-offwhite mb-2">No Shifts This Week</h2>
                <p className="text-offwhite/50">No shifts are scheduled for you this week. Contact your manager to get scheduled.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeoff' && (
          <div className="max-w-lg">
            <div className="rounded-xl p-6 border" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(197,160,89,0.15)' }}>
              <h2 className="font-heading text-xl text-gold mb-1">Request Time Off</h2>
              <p className="text-offwhite/50 text-sm mb-6">Submit a time-off request and your manager will review it. You will be notified once it is approved or rejected.</p>

              {timeOffSuccess && (
                <div className="mb-4 p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-sm">
                  Time-off request submitted successfully!
                </div>
              )}

              <form onSubmit={handleSubmitTimeOff} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-offwhite/50 text-xs uppercase tracking-wider block mb-2">Start Date</label>
                    <input
                      type="date"
                      value={timeOffForm.start_date}
                      onChange={e => setTimeOffForm({ ...timeOffForm, start_date: e.target.value })}
                      className="w-full p-3 bg-offwhite/10 border border-offwhite/20 text-offwhite focus:border-gold focus:outline-none rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-offwhite/50 text-xs uppercase tracking-wider block mb-2">End Date</label>
                    <input
                      type="date"
                      value={timeOffForm.end_date}
                      onChange={e => setTimeOffForm({ ...timeOffForm, end_date: e.target.value })}
                      className="w-full p-3 bg-offwhite/10 border border-offwhite/20 text-offwhite focus:border-gold focus:outline-none rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-offwhite/50 text-xs uppercase tracking-wider block mb-2">Reason (optional)</label>
                  <textarea
                    value={timeOffForm.reason}
                    onChange={e => setTimeOffForm({ ...timeOffForm, reason: e.target.value })}
                    placeholder="e.g. Vacation, Personal appointment, Emergency..."
                    rows={3}
                    className="w-full p-3 bg-offwhite/10 border border-offwhite/20 text-offwhite focus:border-gold focus:outline-none rounded-lg resize-none"
                  />
                </div>
                {timeOffError && <p className="text-red-400 text-sm">{timeOffError}</p>}
                <button
                  type="submit"
                  disabled={submittingTimeOff}
                  className="w-full py-3 bg-gold text-charcoal rounded-lg hover:bg-gold/90 transition-colors font-medium disabled:opacity-50"
                >
                  {submittingTimeOff ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {detailModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4" onClick={() => setDetailModal({ open: false, date: null, dayAppts: [] })}>
          <div className="w-full max-w-md rounded-2xl border-2 p-6 max-h-[80vh] overflow-y-auto" style={{ backgroundColor: '#111', borderColor: 'rgba(197,160,89,0.3)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-xl text-gold">
                {detailModal.date?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <button
                onClick={() => setDetailModal({ open: false, date: null, dayAppts: [] })}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-offwhite/40 hover:text-offwhite hover:bg-white/5 transition-colors text-xl"
              >&#215;</button>
            </div>

            {detailModal.dayAppts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-offwhite/50">No appointments for this day.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {detailModal.dayAppts.map((a) => (
                  <div key={a.appointment_id} className="rounded-xl p-4 border" style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${a.source === 'online' ? 'bg-gold' : 'bg-yellow-400'}`} />
                        <div className="text-offwhite font-heading text-sm">{a.customer_name}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                        a.status === 'waiting' ? 'bg-yellow-400/20 text-yellow-400' :
                        a.status === 'assigned_pending' ? 'bg-blue-400/20 text-blue-400' :
                        a.status === 'serving' ? 'bg-green-400/20 text-green-400' :
                        a.status === 'completed' ? 'bg-offwhite/10 text-offwhite/60' :
                        'bg-red-400/20 text-red-400'
                      }`}>
                        {STATUS_LABELS[a.status] || a.status}
                      </span>
                    </div>
                    <div className="ml-4 space-y-1">
                      <div className="text-offwhite/50 text-xs">{a.service_name}</div>
                      <div className="text-offwhite/30 text-xs">
                        {new Date(a.appointment_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </div>
                      <div className="text-gold font-heading text-sm">${a.final_price}</div>
                    </div>
                    <div className="mt-2 ml-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        a.source === 'online' ? 'bg-gold/20 text-gold' : 'bg-yellow-400/20 text-yellow-400'
                      }`}>
                        {a.source === 'online' ? 'Online Booking' : 'Walk-in'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}