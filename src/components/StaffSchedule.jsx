import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const SHIFT_TYPES = [
  { value: 'morning', label: 'Morning', defaultStart: '09:00', defaultEnd: '15:00' },
  { value: 'afternoon', label: 'Afternoon', defaultStart: '14:00', defaultEnd: '19:00' },
  { value: 'evening', label: 'Evening', defaultStart: '18:00', defaultEnd: '22:00' },
  { value: 'custom', label: 'Custom', defaultStart: '09:00', defaultEnd: '17:00' },
];

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

export default function StaffSchedule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { role, id } = useParams();
  const [weekOffset, setWeekOffset] = useState(0);
  const [staff, setStaff] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('schedule');
  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [addShiftForm, setAddShiftForm] = useState({ employee_id: '', shift_date: '', shift_type: 'morning', start_time: '09:00', end_time: '15:00' });
  const [addingShift, setAddingShift] = useState(false);
  const [addingShiftError, setAddingShiftError] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [detailModal, setDetailModal] = useState({ open: false, staffMember: null, date: null, dayAppts: [] });
  const [copiedDay, setCopiedDay] = useState(null);
  const [selectedDays, setSelectedDays] = useState([]);

  const location = useLocation();
  const weekDates = getWeekDates(new Date(Date.now() + weekOffset * 7 * 24 * 60 * 60 * 1000));

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const staffParam = params.get('staff');

    if (id) {
      setSelectedStaffId(id);
      if (staffParam !== id) {
        params.set('staff', id);
        const newSearch = params.toString();
        const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}`;
        window.history.replaceState({}, '', newUrl);
      }
    } else if (staffParam) {
      setSelectedStaffId(staffParam);
    } else {
      setSelectedStaffId(null);
    }
  }, [id, location.search]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!['admin', 'super_admin', 'owner', 'partner'].includes(user.role)) {
      navigate('/portal');
      return;
    }
    fetchData();
  }, [user, navigate, weekOffset, selectedStaffId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const startDate = weekDates[0].toISOString().split('T')[0];
      const endDate = weekDates[6].toISOString().split('T')[0];

      const [staffRes, shiftsRes, torRes] = await Promise.all([
        supabase.from('profiles').select('*').in('role', ['admin', 'cashier', 'technician']).order('full_name'),
        supabase.rpc('get_staff_schedule', { p_start_date: startDate, p_end_date: endDate, p_employee_id: selectedStaffId }),
        supabase.rpc('get_time_off_requests', { p_status: null }),
      ]);
      if (staffRes.data) setStaff(staffRes.data);
      if (shiftsRes.data) setShifts(shiftsRes.data);
      if (torRes.data) setTimeOffRequests(torRes.data);
    } catch (err) {
      console.error('Error fetching schedule data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStaffShift = (staffId, date) => {
    return shifts.filter(s => s.employee_id === staffId && s.shift_date === date);
  };

  const handleAddShift = async (e) => {
    if (e) e.preventDefault();
    setAddingShiftError('');
    if (!addShiftForm.employee_id || !addShiftForm.shift_date) {
      setAddingShiftError('Please select a staff member and date');
      return;
    }
    setAddingShift(true);
    try {
      const { error } = await supabase.rpc('create_shift', {
        p_employee_id: addShiftForm.employee_id,
        p_shift_date: addShiftForm.shift_date,
        p_shift_type: addShiftForm.shift_type,
        p_start_time: addShiftForm.start_time,
        p_end_time: addShiftForm.end_time,
      });
      if (error) throw error;
      setShowAddShiftModal(false);
      setAddShiftForm({ employee_id: '', shift_date: '', shift_type: 'morning', start_time: '09:00', end_time: '15:00' });
      await fetchData();
    } catch (err) {
      setAddingShiftError(err.message || 'Failed to add shift');
    } finally {
      setAddingShift(false);
    }
  };

  const handleDeleteShift = async (shiftId) => {
    try {
      await supabase.rpc('delete_shift', { p_shift_id: shiftId });
      await fetchData();
    } catch (err) {
      console.error('Error deleting shift:', err);
    }
  };

  const handleQuickAddShift = async (staffId, dateStr, shiftType = 'morning') => {
    const shiftConfig = SHIFT_TYPES.find(t => t.value === shiftType) || SHIFT_TYPES[0];
    try {
      await supabase.rpc('create_shift', {
        p_employee_id: staffId,
        p_shift_date: dateStr,
        p_shift_type: shiftType,
        p_start_time: shiftConfig.defaultStart,
        p_end_time: shiftConfig.defaultEnd,
      });
      await fetchData();
    } catch (err) {
      console.error('Error quick adding shift:', err);
    }
  };

  const handleCopyDay = (staffId, dateStr) => {
    const dayShifts = getStaffShift(staffId, dateStr);
    if (dayShifts.length === 0) return;
    setCopiedDay({ staffId, dateStr, shifts: dayShifts });
  };

  const handlePasteToSelected = async () => {
    if (!copiedDay || selectedDays.length === 0) return;
    setAddingShift(true);
    try {
      for (const { staffId, dateStr } of selectedDays) {
        for (const shift of copiedDay.shifts) {
          await supabase.rpc('create_shift', {
            p_employee_id: staffId,
            p_shift_date: dateStr,
            p_shift_type: shift.shift_type,
            p_start_time: shift.start_time,
            p_end_time: shift.end_time,
          });
        }
      }
      setCopiedDay(null);
      setSelectedDays([]);
      await fetchData();
    } catch (err) {
      setAddingShiftError(err.message || 'Failed to paste shifts');
    } finally {
      setAddingShift(false);
    }
  };

  const toggleDaySelection = (staffId, dateStr) => {
    setSelectedDays(prev => {
      if (prev.some(d => d.staffId === staffId && d.dateStr === dateStr)) {
        return prev.filter(d => !(d.staffId === staffId && d.dateStr === dateStr));
      }
      return [...prev, { staffId, dateStr }];
    });
  };

  const handleReviewTimeOff = async (requestId, status) => {
    try {
      await supabase.rpc('review_time_off_request', {
        p_request_id: requestId,
        p_status: status,
        p_reviewed_by: user.id,
      });
      await fetchData();
    } catch (err) {
      console.error('Error reviewing time off:', err);
    }
  };

  const openAddShift = (staffId, dateStr) => {
    setAddShiftForm({ employee_id: staffId, shift_date: dateStr, shift_type: 'morning', start_time: '09:00', end_time: '15:00' });
    setShowAddShiftModal(true);
  };

  const openDetailModal = async (staffMember, date) => {
    setDetailModal({ open: true, staffMember, date, dayAppts: [] });
    const dateStr = date.toISOString().split('T')[0];
    try {
      const { data } = await supabase.rpc('get_technician_appointments', {
        p_employee_id: staffMember.id,
        p_start_date: dateStr,
        p_end_date: dateStr,
      });
      setDetailModal(prev => ({ ...prev, dayAppts: data || [] }));
    } catch { }
  };

  const pendingTimeOff = timeOffRequests.filter(r => r.status === 'pending');

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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-3xl text-gold">Staff Schedule</h1>
            <p className="text-offwhite/50 text-sm mt-1">Manage shifts and time-off</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-2xl p-1.5 border border-white/5">
              <button
                onClick={() => setActiveTab('schedule')}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'schedule' ? 'bg-gold text-charcoal shadow-lg shadow-gold/20' : 'text-offwhite/50 hover:text-offwhite'}`}
              >
                Schedule
              </button>
              <button
                onClick={() => setActiveTab('timeoff')}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all relative ${activeTab === 'timeoff' ? 'bg-gold text-charcoal shadow-lg shadow-gold/20' : 'text-offwhite/50 hover:text-offwhite'}`}
              >
                Time-Off
                {pendingTimeOff.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full text-[8px] font-bold text-charcoal" style={{ background: 'linear-gradient(135deg, #c5a059, #f0d78c)' }}>
                    {pendingTimeOff.length}
                  </span>
                )}
              </button>
            </div>
            <select
              value={selectedStaffId || ''}
              onChange={e => {
                const nextId = e.target.value || null;
                setSelectedStaffId(nextId);
                const url = new URL(window.location);
                url.pathname = `/${role}/staff/schedule`;
                if (nextId) url.searchParams.set('staff', nextId);
                else url.searchParams.delete('staff');
                window.history.replaceState({}, '', url);
              }}
              className="px-4 py-2.5 bg-[#1a1a1a] border border-white/10 text-offwhite text-sm rounded-xl focus:border-gold focus:outline-none"
            >
              <option value="">All Staff</option>
              {staff.map(m => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
            {(selectedStaffId || id) && (
              <button
                onClick={() => {
                  setSelectedStaffId(null);
                  navigate(`/${role}/staff/schedule`);
                }}
                className="px-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-offwhite hover:bg-white/10 transition-colors"
              >
                View full staff schedule
              </button>
            )}
            <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-xl p-1 border border-white/5">
              <button onClick={() => setWeekOffset(w => w - 1)} className="w-10 h-10 flex items-center justify-center rounded-lg text-offwhite/40 hover:text-gold hover:bg-white/5 transition-all">&#8249;</button>
              <div className="px-4 py-2 text-sm text-offwhite/80 min-w-[160px] text-center font-medium">
                {formatDate(weekDates[0])} — {formatDate(weekDates[6])}
              </div>
              <button onClick={() => setWeekOffset(w => w + 1)} className="w-10 h-10 flex items-center justify-center rounded-lg text-offwhite/40 hover:text-gold hover:bg-white/5 transition-all">&#8250;</button>
              {weekOffset !== 0 && (
                <button onClick={() => setWeekOffset(0)} className="ml-1 px-3 py-2 text-xs text-gold hover:bg-white/5 rounded-lg transition-colors">
                  Today
                </button>
              )}
            </div>
          </div>
        </div>

        {activeTab === 'schedule' && copiedDay && (
          <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-gold/10 border border-gold/30">
            <div className="text-gold text-sm">
              Copied {copiedDay.shifts.length} shift(s) from {new Date(copiedDay.dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            <div className="flex-1" />
            {selectedDays.length > 0 && (
              <button
                onClick={handlePasteToSelected}
                disabled={addingShift}
                className="px-4 py-2 bg-gold text-charcoal text-sm font-medium rounded-lg hover:bg-gold/90 transition-colors"
              >
                Paste to {selectedDays.length} day(s)
              </button>
            )}
            <button
              onClick={() => { setCopiedDay(null); setSelectedDays([]); }}
              className="px-3 py-2 text-offwhite/60 text-sm hover:text-offwhite"
            >
              Cancel
            </button>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="grid grid-cols-7 gap-1 mb-3">
            {weekDates.map((d, i) => {
              const isToday = i === new Date().getDay();
              return (
                <div key={i} className="text-center py-2">
                  <div className={`text-[10px] font-medium uppercase tracking-wider ${isToday ? 'text-gold' : 'text-offwhite/40'}`}>{DAYS[i]}</div>
                  <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-sm font-medium ${isToday ? 'bg-gold text-charcoal' : 'text-offwhite/50'}`}>
                    {d.getDate()}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-2">
            {(selectedStaffId ? staff.filter(s => s.id === selectedStaffId) : staff).map((member) => {
              const memberShifts = weekDates.map(d => {
                const dateStr = d.toISOString().split('T')[0];
                return { date: d, dateStr, shifts: getStaffShift(member.id, dateStr) };
              });
              return (
                <div key={member.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-3 px-4 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-gold text-xs font-medium">{(member.full_name || '??').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-offwhite text-sm font-medium">{member.full_name}</div>
                    </div>
                    {selectedStaffId && (
                      <button
                        onClick={() => { setSelectedStaffId(null); const url = new URL(window.location); url.searchParams.delete('staff'); window.history.replaceState({}, '', url); }}
                        className="text-offwhite/40 hover:text-offwhite text-lg"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-7 divide-x" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    {memberShifts.map(({ dateStr, shifts: dayShifts }, dayIdx) => {
                      const isToday = dayIdx === new Date().getDay();
                      const isSelected = selectedDays.some(d => d.staffId === member.id && d.dateStr === dateStr);
                      const hasShifts = dayShifts.length > 0;
                      return (
                        <div
                          key={dayIdx}
                          className={`p-2 min-h-[90px] relative ${isToday ? 'bg-gold/5' : ''} ${isSelected ? 'ring-2 ring-gold ring-inset' : ''}`}
                        >
                          {copiedDay && (
                            <button
                              onClick={() => toggleDaySelection(member.id, dateStr)}
                              className={`absolute top-1 left-1 w-5 h-5 rounded border flex items-center justify-center text-[10px] transition-all z-10 ${
                                isSelected ? 'bg-gold border-gold text-charcoal' : 'border-white/30 text-white/30 hover:border-gold'
                              }`}
                            >
                              {isSelected ? '✓' : '+'}
                            </button>
                          )}
                          {hasShifts ? (
                            <div className="space-y-1">
                              {dayShifts.map(s => {
                                const shiftTotal = (s.appointment_count || 0) + (s.confirmed_online_count || 0);
                                return (
                                  <div
                                    key={s.shift_id}
                                    className="group relative rounded-lg p-1.5 bg-gold/10 border border-gold/20 hover:border-gold/40 transition-all cursor-pointer"
                                    onClick={() => openDetailModal(member, new Date(s.shift_date + 'T00:00:00'))}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-medium text-gold capitalize">{s.shift_type}</span>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteShift(s.shift_id); }}
                                        className="w-4 h-4 flex items-center justify-center rounded text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs"
                                      >
                                        ×
                                      </button>
                                    </div>
                                    <div className="text-[9px] text-offwhite/40">{formatTime(s.start_time)}-{formatTime(s.end_time)}</div>
                                    <div className={`text-[9px] mt-1 ${shiftTotal > 0 ? 'text-gold' : 'text-white/30'}`}>
                                      {shiftTotal} appt
                                    </div>
                                  </div>
                                );
                              })}
                              <div className="flex gap-1">
                                {dayShifts.length > 0 && !copiedDay && (
                                  <button
                                    onClick={() => handleCopyDay(member.id, dateStr)}
                                    className="flex-1 text-[9px] text-gold/60 hover:text-gold py-0.5 transition-colors"
                                  >
                                    copy
                                  </button>
                                )}
                                <button
                                  onClick={() => openAddShift(member.id, dateStr)}
                                  className={`text-[9px] text-white/30 hover:text-gold py-0.5 transition-colors ${dayShifts.length > 0 && !copiedDay ? 'flex-1' : 'w-full'}`}
                                >
                                  + more
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => openAddShift(member.id, dateStr)}
                              className="w-full h-full flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 hover:border-gold/50 hover:bg-gold/5 transition-all group"
                            >
                              <span className="text-lg text-white/20 group-hover:text-gold transition-colors">+</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {staff.length === 0 && (
              <div className="text-center py-8 rounded-xl" style={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-offwhite/40">No staff members found</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeoff' && (
          <div className="space-y-4">
            <button
              onClick={() => setActiveTab('schedule')}
              className="flex items-center gap-2 text-gold text-sm hover:text-gold/80 transition-colors mb-4"
            >
              <span>←</span> Back to Schedule
            </button>
            {timeOffRequests.length === 0 ? (
              <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gold/10 flex items-center justify-center">
                  <span className="text-3xl">📅</span>
                </div>
                <h2 className="font-heading text-xl text-offwhite mb-2">No Time-Off Requests</h2>
                <p className="text-offwhite/50 text-sm">All caught up — no pending or past requests.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {timeOffRequests.map(r => (
                  <div
                    key={r.request_id}
                    className="rounded-2xl p-5 transition-all"
                    style={{
                      backgroundColor: '#1a1a1a',
                      border: r.status === 'pending' ? '1px solid rgba(197,160,89,0.3)' : '1px solid rgba(255,255,255,0.06)'
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center">
                            <span className="text-gold text-xs font-heading">{(r.staff_name || '??').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</span>
                          </div>
                          <div>
                            <div className="text-offwhite font-medium">{r.staff_name}</div>
                            <div className="text-offwhite/50 text-xs">
                              {new Date(r.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              {r.start_date !== r.end_date && ` — ${new Date(r.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                            </div>
                          </div>
                        </div>
                        {r.reason && <div className="text-offwhite/40 text-sm mt-2 ml-13">{r.reason}</div>}
                        {r.reviewed_at && (
                          <div className="text-offwhite/30 text-xs mt-2 ml-13">
                            {r.status === 'approved' ? '✓ Approved' : '✗ Rejected'} by {r.reviewer_name} on {new Date(r.reviewed_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1.5 text-xs font-medium rounded-full ${
                          r.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          r.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                        {r.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReviewTimeOff(r.request_id, 'approved')}
                              className="px-4 py-2 bg-green-500/20 text-green-400 rounded-xl text-sm font-medium hover:bg-green-500/30 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReviewTimeOff(r.request_id, 'rejected')}
                              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showAddShiftModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowAddShiftModal(false)}>
          <form 
            className="w-full max-w-sm h-[85vh] sm:h-auto sm:max-h-[90vh] flex flex-col bg-[#1a1a1a] rounded-t-2xl sm:rounded-xl overflow-hidden mx-0 sm:mx-4 border border-gold/10 shadow-2xl" 
            style={{ border: '1px solid rgba(197,160,89,0.2)' }} 
            onClick={e => e.stopPropagation()}
            onSubmit={handleAddShift}
          >
            <div className="flex items-center justify-between gap-4 p-4 sm:p-6 border-b border-gold/10">
              <div>
                <h2 className="font-heading text-xl text-gold mb-0">Add Shift</h2>
                <p className="text-offwhite/40 text-xs mt-1">Select shift details below</p>
              </div>
              <button type="button" onClick={() => setShowAddShiftModal(false)} className="text-offwhite/40 hover:text-offwhite text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div>
                <label className="text-offwhite/50 text-xs uppercase tracking-wider block mb-2">Staff Member</label>
                <select
                  value={addShiftForm.employee_id}
                  onChange={e => setAddShiftForm({ ...addShiftForm, employee_id: e.target.value })}
                  className="w-full p-3 bg-[#0B0B0C] border border-white/10 text-offwhite text-sm rounded-xl focus:border-gold focus:outline-none"
                >
                  <option value="">Select staff member...</option>
                  {staff.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-offwhite/50 text-xs uppercase tracking-wider block mb-2">Shift Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {SHIFT_TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setAddShiftForm({ ...addShiftForm, shift_type: t.value, start_time: t.defaultStart, end_time: t.defaultEnd })}
                      className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                        addShiftForm.shift_type === t.value
                          ? 'border-gold bg-gold/10 text-gold'
                          : 'border-white/10 text-offwhite/60 hover:border-gold/30'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-offwhite/50 text-xs uppercase tracking-wider block mb-2">Start</label>
                  <input type="time" value={addShiftForm.start_time}
                    onChange={e => setAddShiftForm({ ...addShiftForm, start_time: e.target.value })}
                    className="w-full p-3 bg-[#0B0B0C] border border-white/10 text-offwhite text-sm rounded-xl focus:border-gold focus:outline-none" />
                </div>
                <div>
                  <label className="text-offwhite/50 text-xs uppercase tracking-wider block mb-2">End</label>
                  <input type="time" value={addShiftForm.end_time}
                    onChange={e => setAddShiftForm({ ...addShiftForm, end_time: e.target.value })}
                    className="w-full p-3 bg-[#0B0B0C] border border-white/10 text-offwhite text-sm rounded-xl focus:border-gold focus:outline-none" />
                </div>
              </div>
              {addingShiftError && <p className="text-red-400 text-xs text-center">{addingShiftError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddShiftModal(false)} className="flex-1 py-3 bg-[#0B0B0C] text-offwhite text-sm rounded-xl hover:bg-white/10 transition-colors font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={addingShift} className="flex-1 py-3 bg-gold text-charcoal text-sm rounded-xl hover:bg-gold/90 transition-colors font-medium shadow-lg shadow-gold/20 disabled:opacity-50">
                  {addingShift ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {detailModal.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm" onClick={() => setDetailModal({ open: false, staffMember: null, date: null, dayAppts: [] })}>
          <div className="w-full max-w-md h-[85vh] sm:h-auto sm:max-h-[90vh] flex flex-col bg-[#1a1a1a] rounded-t-2xl sm:rounded-xl overflow-hidden mx-0 sm:mx-4 border border-gold/10 shadow-2xl" style={{ border: '1px solid rgba(197,160,89,0.3)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 p-4 sm:p-6 border-b border-gold/10">
              <div>
                <h3 className="font-heading text-xl text-gold">{detailModal.staffMember?.full_name}</h3>
                <p className="text-offwhite/50 text-sm">
                  {detailModal.date?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setDetailModal({ open: false, staffMember: null, date: null, dayAppts: [] })}
                className="w-10 h-10 flex items-center justify-center rounded-full text-offwhite/40 hover:text-offwhite hover:bg-white/10 transition-all text-lg"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {detailModal.dayAppts.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                    <span className="text-2xl">📅</span>
                  </div>
                  <p className="text-offwhite/50">No appointments for this day</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {detailModal.dayAppts.map((a) => (
                    <div
                      key={a.appointment_id}
                      className="rounded-xl p-4 transition-all"
                      style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center">
                            <span className="text-gold text-xs font-heading">{(a.customer_name || '??').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</span>
                          </div>
                          <div>
                            <div className="text-offwhite font-medium">{a.customer_name}</div>
                            <div className="text-offwhite/40 text-xs">{a.service_name}</div>
                          </div>
                        </div>
                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-medium ${
                          a.status === 'waiting' ? 'bg-yellow-400/20 text-yellow-400' :
                          a.status === 'assigned_pending' ? 'bg-blue-400/20 text-blue-400' :
                          a.status === 'serving' ? 'bg-green-400/20 text-green-400' :
                          a.status === 'completed' ? 'bg-white/10 text-offwhite/60' :
                          'bg-red-400/20 text-red-400'
                        }`}>
                          {a.status === 'waiting' ? 'Waiting' : a.status === 'assigned_pending' ? 'Confirmed' : a.status === 'serving' ? 'In Service' : a.status === 'completed' ? 'Completed' : a.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-offwhite/50 text-xs">
                            <span>🕐</span>
                            {new Date(a.appointment_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </div>
                          <span className={`text-[10px] px-2 py-1 rounded-full ${a.source === 'online' ? 'bg-gold/20 text-gold' : 'bg-yellow-400/20 text-yellow-400'}`}>
                            {a.source === 'online' ? 'Online' : 'Walk-in'}
                          </span>
                        </div>
                        <div className="text-gold font-heading text-lg">${a.final_price}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}