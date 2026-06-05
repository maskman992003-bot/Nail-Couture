import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Sidebar from './Sidebar';
import { TIME_OFF_REQUESTS } from '../constants/featureFlags';
import {
  fetchStaffShifts,
  fetchTechnicianAppointments,
  fetchTimeOffRequests,
  submitTimeOffRequest,
} from '../utils/staffSchedule';
import {
  DAY_LABELS,
  DAY_LABELS_FULL,
  SHIFT_COLORS,
  formatTime,
  toDateStr,
} from '../utils/scheduleUtils';

const STATUS_COLORS = {
  waiting: 'bg-yellow-400',
  assigned_pending: 'bg-blue-400',
  serving: 'bg-green-400',
  completed: 'bg-offwhite/40',
  cancelled: 'bg-red-400',
};

const STATUS_LABELS = {
  waiting: 'Waiting',
  assigned_pending: 'Assigned',
  serving: 'Serving',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

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

function formatWeekRange(dates) {
  const start = dates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const end = dates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${start} – ${end}`;
}

export default function TechnicianSchedule() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('schedule');
  const [detailModal, setDetailModal] = useState({ open: false, date: null, dayShifts: [], dayAppts: [] });
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  const weekStart = toDateStr(weekDates[0]);
  const weekEnd = toDateStr(weekDates[6]);
  const todayStr = toDateStr(new Date());

  const shiftsByDate = useMemo(() => {
    const map = {};
    for (const shift of shifts) {
      const key = shift.shift_date;
      if (!map[key]) map[key] = [];
      map[key].push(shift);
    }
    return map;
  }, [shifts]);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [shiftRows, apptRows, torRows] = await Promise.all([
        fetchStaffShifts(user.id, weekStart, weekEnd),
        fetchTechnicianAppointments(user.id, weekStart, weekEnd),
        TIME_OFF_REQUESTS ? fetchTimeOffRequests({ staffId: user.id }) : Promise.resolve([]),
      ]);
      setShifts(shiftRows);
      setAppointments(apptRows);
      setTimeOffRequests(torRows);
    } catch (err) {
      console.error('Error loading schedule:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, weekStart, weekEnd]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!['technician', 'cashier'].includes(user.role)) {
      navigate('/portal');
      return;
    }
    fetchData();
  }, [user, navigate, fetchData]);

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

  const openDayDetails = (dateObj) => {
    const dateIso = toDateStr(dateObj);
    const dayShifts = shiftsByDate[dateIso] || [];
    const dayAppts = appointments.filter((a) => {
      const apptDate = a.appointment_time?.split('T')[0];
      return apptDate === dateIso;
    });
    setDetailModal({ open: true, date: dateObj, dayShifts, dayAppts });
  };

  const handleSubmitTimeOff = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!requestForm.startDate || !requestForm.endDate) {
      setFormError('Please select start and end dates');
      return;
    }
    if (requestForm.endDate < requestForm.startDate) {
      setFormError('End date must be on or after start date');
      return;
    }

    setSubmitting(true);
    try {
      await submitTimeOffRequest(user.id, requestForm.startDate, requestForm.endDate, requestForm.reason);
      setFormSuccess('Time-off request submitted for manager review');
      setRequestForm({ startDate: '', endDate: '', reason: '' });
      setShowRequestForm(false);
      await fetchData();
    } catch (err) {
      setFormError(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-primary text-primary pl-0 md:pl-20 lg:pl-64">
        <Sidebar />
        <div className="flex items-center justify-center py-24">
          <div className="text-gold animate-pulse tracking-widest text-sm">LOADING SCHEDULE...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-primary text-primary pl-0 md:pl-20 lg:pl-64">
      <Sidebar />

      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-gold/10 pb-6 mb-6">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl text-gold tracking-wide">My Schedule</h1>
            <p className="text-xs text-secondary mt-1">
              Your assigned shifts and appointments for the week
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-3">
            {TIME_OFF_REQUESTS && (
              <div className="flex items-center gap-2 bg-secondary rounded-xl p-1 border border-light w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('schedule')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'schedule' ? 'bg-gold text-charcoal shadow-lg shadow-gold/20' : 'text-secondary hover:text-primary'
                  }`}
                >
                  Shifts
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('timeoff')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'timeoff' ? 'bg-gold text-charcoal shadow-lg shadow-gold/20' : 'text-secondary hover:text-primary'
                  }`}
                >
                  Time Off
                </button>
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-start">
                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1.5 bg-secondary border border-light text-secondary hover:border-gold/30 hover:text-gold rounded-lg text-xs font-medium transition-all"
                >
                  Today
                </button>
                <div className="flex items-center bg-secondary border border-light rounded-lg p-0.5">
                  <button type="button" onClick={handlePrevWeek} className="p-1.5 text-secondary hover:text-gold transition-colors" aria-label="Previous week">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="px-3 text-xs font-medium tracking-wider text-primary min-w-[140px] text-center">
                    {formatWeekRange(weekDates)}
                  </span>
                  <button type="button" onClick={handleNextWeek} className="p-1.5 text-secondary hover:text-gold transition-colors" aria-label="Next week">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {activeTab === 'schedule' && (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {weekDates.map((dateObj, idx) => {
              const dateIso = toDateStr(dateObj);
              const isToday = dateIso === todayStr;
              const dayShifts = shiftsByDate[dateIso] || [];
              const isWorking = dayShifts.length > 0;
              const dayAppts = appointments.filter((a) => a.appointment_time?.split('T')[0] === dateIso);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => openDayDetails(dateObj)}
                  className={`flex flex-col min-h-[140px] md:min-h-[220px] bg-secondary border rounded-xl p-3 text-left transition-all hover:border-gold/30 ${
                    isToday ? 'border-gold/40 bg-gold/[0.04]' : 'border-light'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-light pb-2 mb-2">
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-bold tracking-widest ${isToday ? 'text-gold' : 'text-secondary'}`}>
                        {DAY_LABELS[idx]}
                      </span>
                      <span className={`text-sm font-heading ${isToday ? 'text-gold' : 'text-primary'}`}>
                        {dateObj.getDate()}
                      </span>
                    </div>
                    <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      isWorking
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {isWorking ? 'ON' : 'OFF'}
                    </span>
                  </div>

                  {dayShifts.length > 0 && (
                    <div className="space-y-1.5 mb-2">
                      {dayShifts.map((shift) => (
                        <div
                          key={shift.id}
                          className={`rounded-lg border px-2 py-1.5 text-[10px] ${SHIFT_COLORS[shift.shift_type] || SHIFT_COLORS.custom}`}
                        >
                          <div className="font-semibold capitalize">{shift.shift_type}</div>
                          <div className="opacity-70">{formatTime(shift.start_time)} – {formatTime(shift.end_time)}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
                    {dayAppts.slice(0, 3).map((appt) => (
                      <div key={appt.id} className="text-[10px] p-1.5 rounded bg-white/[0.03] border border-light flex flex-col gap-0.5 truncate">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-medium text-primary truncate">{appt.customer_name}</span>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_COLORS[appt.status] || 'bg-gray-400'}`} />
                        </div>
                        <span className="text-gold/80 truncate">{appt.service_name}</span>
                      </div>
                    ))}
                    {dayAppts.length > 3 && (
                      <div className="text-[9px] text-gold/60 text-center font-medium mt-auto pt-1">
                        + {dayAppts.length - 3} more
                      </div>
                    )}
                    {dayAppts.length === 0 && isWorking && (
                      <div className="text-[10px] text-muted italic my-auto text-center">No assignments</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'timeoff' && TIME_OFF_REQUESTS && (
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-secondary">Submit requests for manager approval</p>
              <button
                type="button"
                onClick={() => { setShowRequestForm((v) => !v); setFormError(''); setFormSuccess(''); }}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gold text-charcoal hover:bg-gold/90 transition-colors"
              >
                {showRequestForm ? 'Cancel' : 'Request Time Off'}
              </button>
            </div>

            {formSuccess && <p className="text-sm text-green-400">{formSuccess}</p>}

            {showRequestForm && (
              <form onSubmit={handleSubmitTimeOff} className="rounded-2xl border border-light bg-secondary p-5 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-wider text-secondary">Start date</span>
                    <input
                      type="date"
                      value={requestForm.startDate}
                      onChange={(e) => setRequestForm((f) => ({ ...f, startDate: e.target.value }))}
                      className="w-full mt-1.5 text-sm bg-input border border-light rounded-lg px-3 py-2.5 text-primary focus:border-gold focus:outline-none"
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-wider text-secondary">End date</span>
                    <input
                      type="date"
                      value={requestForm.endDate}
                      onChange={(e) => setRequestForm((f) => ({ ...f, endDate: e.target.value }))}
                      className="w-full mt-1.5 text-sm bg-input border border-light rounded-lg px-3 py-2.5 text-primary focus:border-gold focus:outline-none"
                      required
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wider text-secondary">Reason (optional)</span>
                  <textarea
                    value={requestForm.reason}
                    onChange={(e) => setRequestForm((f) => ({ ...f, reason: e.target.value }))}
                    rows={3}
                    className="w-full mt-1.5 text-sm bg-input border border-light rounded-lg px-3 py-2.5 text-primary focus:border-gold focus:outline-none resize-none"
                    placeholder="Vacation, appointment, personal day..."
                  />
                </label>
                {formError && <p className="text-sm text-red-400">{formError}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-medium bg-gold text-charcoal hover:bg-gold/90 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </form>
            )}

            {timeOffRequests.length === 0 ? (
              <div className="rounded-2xl border border-light bg-secondary p-12 text-center">
                <h2 className="font-heading text-xl text-primary mb-2">No Requests Yet</h2>
                <p className="text-secondary text-sm">You have not submitted any time-off requests.</p>
              </div>
            ) : (
              timeOffRequests.map((request) => (
                <div
                  key={request.id}
                  className={`rounded-2xl p-5 bg-secondary ${
                    request.status === 'pending' ? 'border border-gold/30' : 'border border-light'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="text-primary font-medium">
                        {new Date(request.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {request.start_date !== request.end_date && (
                          <> – {new Date(request.end_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                        )}
                      </div>
                      {request.reason && <p className="text-sm text-secondary mt-1">{request.reason}</p>}
                      {request.reviewed_at && (
                        <p className="text-[10px] text-muted mt-2">
                          Reviewed {new Date(request.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full self-start ${
                      request.status === 'pending' ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20' :
                      request.status === 'approved' ? 'bg-green-500/15 text-green-400 border border-green-500/20' :
                      'bg-red-500/15 text-red-400 border border-red-500/20'
                    }`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {detailModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setDetailModal({ open: false, date: null, dayShifts: [], dayAppts: [] })}
        >
          <div
            className="w-full max-w-lg flex flex-col max-h-[min(90dvh,calc(100dvh-2rem))] bg-card rounded-t-2xl sm:rounded-xl overflow-hidden mx-0 sm:mx-4 border border-light shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-light shrink-0">
              <div>
                <h3 className="font-heading text-lg text-gold">
                  {DAY_LABELS_FULL[detailModal.date?.getDay()]} Details
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  {detailModal.date?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailModal({ open: false, date: null, dayShifts: [], dayAppts: [] })}
                className="text-secondary hover:text-primary text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-secondary mb-2">Shifts</p>
                {detailModal.dayShifts.length === 0 ? (
                  <p className="text-sm text-secondary italic">No shift scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {detailModal.dayShifts.map((shift) => (
                      <div key={shift.id} className={`rounded-xl border p-3 ${SHIFT_COLORS[shift.shift_type] || SHIFT_COLORS.custom}`}>
                        <div className="text-sm font-semibold capitalize">{shift.shift_type}</div>
                        <div className="text-xs opacity-70 mt-1">{formatTime(shift.start_time)} – {formatTime(shift.end_time)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-widest text-secondary mb-2">
                  Appointments ({detailModal.dayAppts.length})
                </p>
                {detailModal.dayAppts.length === 0 ? (
                  <p className="text-sm text-secondary italic">No appointments on this day</p>
                ) : (
                  <div className="space-y-3">
                    {detailModal.dayAppts.map((appt) => (
                      <div key={appt.id} className="p-4 rounded-xl bg-secondary border border-light flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-heading text-base text-primary">{appt.customer_name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                            appt.status === 'waiting' ? 'bg-yellow-400/20 text-yellow-400' :
                            appt.status === 'serving' ? 'bg-green-400/20 text-green-400' :
                            appt.status === 'completed' ? 'bg-white/10 text-secondary' :
                            'bg-red-400/20 text-red-400'
                          }`}>
                            {STATUS_LABELS[appt.status] || appt.status}
                          </span>
                        </div>
                        <div className="text-xs text-secondary">{appt.service_name}</div>
                        <div className="text-xs text-gold">
                          {new Date(appt.appointment_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`.technician-schedule input[type="date"] { color-scheme: ${theme}; }`}</style>
    </div>
  );
}
