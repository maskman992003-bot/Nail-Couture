import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [weekOffset, setWeekOffset] = useState(0);
  const [staff, setStaff] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('schedule');
  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [addShiftForm, setAddShiftForm] = useState({ staff_id: '', shift_date: '', shift_type: 'morning', start_time: '09:00', end_time: '15:00' });
  const [addingShift, setAddingShift] = useState(false);
  const [addingShiftError, setAddingShiftError] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [detailModal, setDetailModal] = useState({ open: false, staffMember: null, date: null, dayAppts: [] });

  const weekDates = getWeekDates(new Date(Date.now() + weekOffset * 7 * 24 * 60 * 60 * 1000));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const staffParam = params.get('staff');
    if (staffParam) setSelectedStaffId(staffParam);
  }, []);

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
        supabase.rpc('get_staff_schedule', { p_start_date: startDate, p_end_date: endDate, p_staff_id: selectedStaffId }),
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
    return shifts.filter(s => s.staff_id === staffId && s.shift_date === date);
  };

  const handleAddShift = async (e) => {
    e.preventDefault();
    setAddingShiftError('');
    if (!addShiftForm.staff_id || !addShiftForm.shift_date) {
      setAddingShiftError('Please select a staff member and date');
      return;
    }
    setAddingShift(true);
    try {
      const { error } = await supabase.rpc('create_shift', {
        p_staff_id: addShiftForm.staff_id,
        p_shift_date: addShiftForm.shift_date,
        p_shift_type: addShiftForm.shift_type,
        p_start_time: addShiftForm.start_time,
        p_end_time: addShiftForm.end_time,
      });
      if (error) throw error;
      setShowAddShiftModal(false);
      setAddShiftForm({ staff_id: '', shift_date: '', shift_type: 'morning', start_time: '09:00', end_time: '15:00' });
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
    setAddShiftForm({ staff_id: staffId, shift_date: dateStr, shift_type: 'morning', start_time: '09:00', end_time: '15:00' });
    setShowAddShiftModal(true);
  };

  const openDetailModal = async (staffMember, date) => {
    setDetailModal({ open: true, staffMember, date, dayAppts: [] });
    try {
      const dateStr = date.toISOString().split('T')[0];
      const { data } = await supabase.rpc('get_technician_appointments', {
        p_staff_id: staffMember.id,
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-3xl text-gold">Staff Schedule</h1>
            <p className="text-offwhite/60 text-sm mt-1">Manage shifts and time-off requests</p>
          </div>
          <div className="flex items-center gap-3">
            {selectedStaffId && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30">
                <span className="text-blue-400 text-xs">
                  Viewing: {staff.find(s => s.id === selectedStaffId)?.full_name || 'Staff'}
                </span>
                <button
                  onClick={() => { setSelectedStaffId(null); const url = new URL(window.location); url.searchParams.delete('staff'); window.history.replaceState({}, '', url); }}
                  className="text-blue-400 hover:text-blue-300 text-xs"
                >&times;</button>
              </div>
            )}
            <select
              value={selectedStaffId || ''}
              onChange={e => { setSelectedStaffId(e.target.value || null); const url = new URL(window.location); if (e.target.value) url.searchParams.set('staff', e.target.value); else url.searchParams.delete('staff'); window.history.replaceState({}, '', url); }}
              className="px-3 py-2 bg-offwhite/10 border border-offwhite/20 text-offwhite text-sm rounded-lg focus:border-gold focus:outline-none"
            >
              <option value="">All Staff</option>
              {staff.map(m => (
                <option key={m.id} value={m.id}>{m.full_name} ({m.role})</option>
              ))}
            </select>
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
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('schedule')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'schedule' ? 'bg-gold text-charcoal' : 'bg-offwhite/10 text-offwhite/60 hover:bg-offwhite/20'}`}>
            Schedule
          </button>
          <button onClick={() => setActiveTab('timeoff')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors relative ${activeTab === 'timeoff' ? 'bg-gold text-charcoal' : 'bg-offwhite/10 text-offwhite/60 hover:bg-offwhite/20'}`}>
            Time-Off Requests
            {pendingTimeOff.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full text-[8px] font-bold text-charcoal" style={{ background: 'linear-gradient(135deg, #c5a059, #f0d78c)' }}>
                {pendingTimeOff.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'schedule' && (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(197,160,89,0.15)' }}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="text-offwhite/40 text-xs border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <th className="px-4 py-3 text-left font-medium w-40">Staff</th>
                    {weekDates.map((d, i) => (
                      <th key={i} className="px-2 py-3 text-center font-medium min-w-[110px]">
                        <div className={`text-xs font-medium ${i === new Date().getDay() ? 'text-gold' : 'text-offwhite/30'}`}>{DAYS[i]}</div>
                        <div className={`text-sm ${i === new Date().getDay() ? 'text-gold' : 'text-offwhite/60'}`}>{d.getDate()}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staff.map((member) => {
                    const memberShifts = weekDates.map(d => {
                      const dateStr = d.toISOString().split('T')[0];
                      return { date: dateStr, shifts: getStaffShift(member.id, dateStr) };
                    });
                    return (
                      <tr key={member.id} className="border-b last:border-0 hover:bg-white/3 transition-colors" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gold/20 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-gold text-xs font-heading">{(member.full_name || '??').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="text-offwhite text-sm font-medium truncate">{member.full_name}</div>
                              <div className="text-offwhite/30 text-xs capitalize">{member.role}</div>
                            </div>
                          </div>
                        </td>
                        {memberShifts.map(({ date, shifts: dayShifts }, dayIdx) => (
                          <td key={dayIdx} className="px-2 py-3 text-center align-top">
                            {dayShifts.length === 0 ? (
                              <button
                                onClick={() => openAddShift(member.id, date)}
                                className="w-full min-h-[60px] flex items-center justify-center rounded-lg hover:bg-gold/10 border border-dashed border-offwhite/10 hover:border-gold/30 text-offwhite/20 hover:text-gold/50 transition-all text-xs"
                              ><span className="text-lg">+</span></button>
                            ) : (
                              <div className="space-y-1">
                                {dayShifts.map(s => {
                                  const total = (s.appointment_count || 0) + (s.confirmed_online_count || 0);
                                  return (
                                    <div key={s.shift_id} className="group relative rounded-lg p-2 bg-gold/10 border border-gold/20 hover:border-gold/40 transition-all">
                                      <div className="text-xs font-medium text-gold capitalize">{s.shift_type}</div>
                                      <div className="text-[10px] text-offwhite/60">{formatTime(s.start_time)}</div>
                                      <div className="text-[10px] text-offwhite/60">to {formatTime(s.end_time)}</div>
                                      {total > 0 ? (
                                        <button
                                          onClick={() => openDetailModal(member, new Date(s.shift_date + 'T00:00:00'))}
                                          className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded-full bg-gold/20 text-gold text-[10px] font-medium hover:bg-gold/30 transition-colors border border-gold/30"
                                        >
                                          {total} appt{total !== 1 ? 's' : ''}
                                        </button>
                                      ) : (
                                        <div className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded-full bg-offwhite/5 text-offwhite/30 text-[10px]">
                                          No appts
                                        </div>
                                      )}
                                      <button
                                        onClick={() => handleDeleteShift(s.shift_id)}
                                        className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded text-offwhite/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                      >&times;</button>
                                    </div>
                                  );
                                })}
                                <button
                                  onClick={() => openAddShift(member.id, date)}
                                  className="w-full text-offwhite/20 hover:text-gold text-xs py-1 transition-colors"
                                >+ add</button>
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {staff.length === 0 && (
                    <tr><td colSpan={8} className="py-12 text-center text-offwhite/40">No staff members found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'timeoff' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setActiveTab('schedule')} className="text-gold text-sm hover:underline">&#8592; Back to Schedule</button>
            </div>
            {timeOffRequests.length === 0 ? (
              <div className="rounded-xl p-12 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(197,160,89,0.15)' }}>
                <div className="text-4xl mb-3">&#128337;</div>
                <h2 className="font-heading text-2xl text-offwhite mb-2">No Time-Off Requests</h2>
                <p className="text-offwhite/50">All caught up — no pending or past requests.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {timeOffRequests.map(r => (
                  <div key={r.request_id} className="rounded-xl p-5 border transition-all" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: r.status === 'pending' ? 'rgba(197,160,89,0.3)' : 'rgba(255,255,255,0.08)' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-offwhite font-heading text-base">{r.staff_name}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            r.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                            r.status === 'approved' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                          </span>
                        </div>
                        <div className="text-offwhite/60 text-sm">
                          {new Date(r.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {r.start_date !== r.end_date && ` — ${new Date(r.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                        </div>
                        {r.reason && <div className="text-offwhite/40 text-xs mt-1 italic">{r.reason}</div>}
                        {r.reviewed_at && (
                          <div className="text-offwhite/30 text-xs mt-1">
                            {r.status === 'approved' ? 'Approved' : 'Rejected'} by {r.reviewer_name} on {new Date(r.reviewed_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      {r.status === 'pending' && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => handleReviewTimeOff(r.request_id, 'approved')} className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-sm hover:bg-green-500/30 transition-colors">Approve</button>
                          <button onClick={() => handleReviewTimeOff(r.request_id, 'rejected')} className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm hover:bg-red-500/30 transition-colors">Reject</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showAddShiftModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4" onClick={() => setShowAddShiftModal(false)}>
          <div className="w-full max-w-md rounded-xl p-6" style={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(197,160,89,0.2)' }} onClick={e => e.stopPropagation()}>
            <h2 className="font-heading text-2xl text-gold mb-6">Add Shift</h2>
            <form onSubmit={handleAddShift} className="space-y-4">
              <div>
                <label className="text-offwhite/50 text-xs uppercase tracking-wider block mb-2">Staff Member</label>
                <select
                  value={addShiftForm.staff_id}
                  onChange={e => setAddShiftForm({ ...addShiftForm, staff_id: e.target.value })}
                  className="w-full p-3 bg-offwhite/10 border border-offwhite/20 text-offwhite focus:border-gold focus:outline-none rounded-lg"
                >
                  <option value="">Select staff...</option>
                  {staff.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name} ({m.role})</option>
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
                      className={`p-3 rounded-lg border text-sm transition-colors ${
                        addShiftForm.shift_type === t.value ? 'border-gold bg-gold/10 text-gold' : 'border-offwhite/20 text-offwhite/60 hover:border-gold/30'
                      }`}
                    >{t.label}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-offwhite/50 text-xs uppercase tracking-wider block mb-2">Start Time</label>
                  <input type="time" value={addShiftForm.start_time}
                    onChange={e => setAddShiftForm({ ...addShiftForm, start_time: e.target.value })}
                    className="w-full p-3 bg-offwhite/10 border border-offwhite/20 text-offwhite focus:border-gold focus:outline-none rounded-lg" />
                </div>
                <div>
                  <label className="text-offwhite/50 text-xs uppercase tracking-wider block mb-2">End Time</label>
                  <input type="time" value={addShiftForm.end_time}
                    onChange={e => setAddShiftForm({ ...addShiftForm, end_time: e.target.value })}
                    className="w-full p-3 bg-offwhite/10 border border-offwhite/20 text-offwhite focus:border-gold focus:outline-none rounded-lg" />
                </div>
              </div>
              {addingShiftError && <p className="text-red-400 text-sm">{addingShiftError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddShiftModal(false)} className="flex-1 py-3 bg-offwhite/10 text-offwhite rounded-lg hover:bg-offwhite/20 transition-colors">Cancel</button>
                <button type="submit" disabled={addingShift} className="flex-1 py-3 bg-gold text-charcoal rounded-lg hover:bg-gold/90 transition-colors font-medium disabled:opacity-50">
                  {addingShift ? 'Adding...' : 'Add Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4" onClick={() => setDetailModal({ open: false, staffMember: null, date: null, dayAppts: [] })}>
          <div className="w-full max-w-md rounded-2xl border-2 p-6 max-h-[80vh] overflow-y-auto" style={{ backgroundColor: '#111', borderColor: 'rgba(197,160,89,0.3)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-heading text-xl text-gold">{detailModal.staffMember?.full_name}</h3>
                <p className="text-offwhite/50 text-sm">
                  {detailModal.date?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setDetailModal({ open: false, staffMember: null, date: null, dayAppts: [] })}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-offwhite/40 hover:text-offwhite hover:bg-white/5 transition-colors text-xl">&#215;</button>
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
                        {a.status === 'waiting' ? 'Waiting' : a.status === 'assigned_pending' ? 'Confirmed' : a.status === 'serving' ? 'In Service' : a.status === 'completed' ? 'Completed' : a.status}
                      </span>
                    </div>
                    <div className="ml-4 space-y-1">
                      <div className="text-offwhite/50 text-xs">{a.service_name}</div>
                      <div className="text-offwhite/30 text-xs">{new Date(a.appointment_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                      <div className="text-gold font-heading text-sm">${a.final_price}</div>
                    </div>
                    <div className="mt-2 ml-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.source === 'online' ? 'bg-gold/20 text-gold' : 'bg-yellow-400/20 text-yellow-400'}`}>
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