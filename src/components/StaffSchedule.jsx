import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { STAFF_SHIFTS } from '../constants/featureFlags';
import {
  fetchSchedulableStaff,
  fetchStaffShifts,
  fetchTimeOffRequests,
  reviewTimeOffRequest,
} from '../utils/staffSchedule';
import Sidebar from './Sidebar';
import {
  SHIFT_TYPES,
  DAY_LABELS,
  DAY_LABELS_FULL,
  ROLE_LABELS,
  SHIFT_COLORS,
  SHIFT_DOT,
  ROLE_TEMPLATES,
  PATTERN_PRESETS,
  emptyWeekPattern,
  patternFromRole,
  toDateStr,
  getMonthRange,
  getMonthLabel,
  getMonthGrid,
  formatTime,
  expandPatternToShifts,
  countPatternShifts,
  getInitials,
  isToday,
  normalizeSlot,
  getSlotShiftType,
  createSlot,
  slotColorKey,
  shiftConfig,
} from '../utils/scheduleUtils';

function ChevronLeft() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function CustomShiftTimeModal({ open, title, startTime, endTime, onSave, onClose, saveLabel = 'Save' }) {
  const [start, setStart] = useState(startTime);
  const [end, setEnd] = useState(endTime);

  useEffect(() => {
    if (open) {
      setStart(startTime);
      setEnd(endTime);
    }
  }, [open, startTime, endTime]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-card rounded-t-2xl sm:rounded-xl border border-gold/30 overflow-hidden mx-0 sm:mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-light">
          <h3 className="font-heading text-gold">{title || 'Custom shift times'}</h3>
          <button type="button" onClick={onClose} className="text-secondary hover:text-primary text-xl leading-none">&times;</button>
        </div>
        <div className="p-5 space-y-4">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-secondary">From</span>
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full mt-1.5 text-sm bg-input border border-gold/30 rounded-lg px-3 py-2.5 text-gold focus:border-gold focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-secondary">To</span>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full mt-1.5 text-sm bg-input border border-gold/30 rounded-lg px-3 py-2.5 text-gold focus:border-gold focus:outline-none"
            />
          </label>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-light text-secondary hover:text-primary text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(start, end)}
            className="flex-1 py-2.5 rounded-lg bg-gold text-charcoal text-sm font-medium hover:bg-gold/90 transition-colors"
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PatternDayCell({ dayIdx, value, onChange }) {
  const [showTimeModal, setShowTimeModal] = useState(false);
  const active = Boolean(value);
  const shiftType = getSlotShiftType(value);
  const normalized = normalizeSlot(value);
  const typeCfg = shiftType ? SHIFT_TYPES.find((t) => t.value === shiftType) : null;
  const colorKey = slotColorKey(value);

  const handleTypeChange = (nextType) => {
    if (!nextType) {
      onChange(null);
      return;
    }
    if (nextType === 'custom') {
      onChange(createSlot('custom'));
      setShowTimeModal(true);
      return;
    }
    onChange(createSlot(nextType));
  };

  const handleCustomTimeSave = (startTime, endTime) => {
    onChange({
      shift_type: 'custom',
      start_time: startTime,
      end_time: endTime,
    });
    setShowTimeModal(false);
  };

  return (
    <div className="flex flex-col items-stretch gap-2 min-w-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-secondary text-center">{DAY_LABELS[dayIdx]}</span>
      <button
        type="button"
        onClick={() => onChange(active ? null : createSlot('morning'))}
        className={`w-full rounded-xl border px-1.5 py-2 sm:px-2 sm:py-3 transition-all ${
          active
            ? SHIFT_COLORS[colorKey] || SHIFT_COLORS.custom
            : 'border-light bg-secondary text-muted hover:border-white/20 hover:text-secondary'
        }`}
      >
        <div className="text-xs font-semibold">{active ? typeCfg?.short : 'Off'}</div>
        {active && normalized && (
          <div className="text-[10px] opacity-70 mt-0.5 leading-tight hidden min-[480px]:block">
            {formatTime(normalized.start_time)}
            {normalized.end_time && (
              <>
                <span className="opacity-50 mx-0.5">–</span>
                {formatTime(normalized.end_time)}
              </>
            )}
          </div>
        )}
      </button>
      {active && (
        <>
          <select
            value={shiftType || ''}
            onChange={(e) => handleTypeChange(e.target.value || null)}
            className="w-full text-[10px] bg-input border border-light rounded-lg px-1.5 py-1 text-primary focus:border-gold focus:outline-none"
          >
            {SHIFT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
            <option value="">Off</option>
          </select>
        </>
      )}
      <CustomShiftTimeModal
        open={showTimeModal}
        title={`${DAY_LABELS[dayIdx]} · Custom shift`}
        startTime={normalized?.start_time || '09:00'}
        endTime={normalized?.end_time || '17:00'}
        onSave={handleCustomTimeSave}
        onClose={() => setShowTimeModal(false)}
      />
    </div>
  );
}

function DayDetailBody({
  selectedDay,
  selectedStaffId,
  shiftsByDate,
  dayDetailAppts,
  onClose,
  onDeleteShift,
  onAddShift,
  onOpenCustomModal,
  formatTime,
  SHIFT_COLORS,
  SHIFT_TYPES,
  DAY_LABELS_FULL,
}) {
  const dayShifts = (shiftsByDate[selectedDay] || []).filter((s) => s.employee_id === selectedStaffId);

  return (
    <>
      <div className="p-4 border-b border-light flex items-start justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <h3 className="font-heading text-gold truncate">{DAY_LABELS_FULL[new Date(selectedDay + 'T12:00:00').getDay()]}</h3>
          <p className="text-xs text-secondary">
            {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-secondary hover:text-primary text-xl leading-none shrink-0">&times;</button>
      </div>

      <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
        {dayShifts.length === 0 ? (
          <p className="text-sm text-secondary text-center py-4">No shifts scheduled</p>
        ) : (
          dayShifts.map((s) => (
            <div key={s.id} className={`rounded-xl border p-3 ${SHIFT_COLORS[s.shift_type] || SHIFT_COLORS.custom}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold capitalize">{s.shift_type}</span>
                <button type="button" onClick={() => onDeleteShift(s.id)} className="text-current/50 hover:text-red-400 text-lg leading-none shrink-0">&times;</button>
              </div>
              <p className="text-xs opacity-70 mt-1">{formatTime(s.start_time)} – {formatTime(s.end_time)}</p>
            </div>
          ))
        )}

        <div className="pt-2 border-t border-light">
          <p className="text-[10px] uppercase tracking-widest text-secondary mb-2">Quick add</p>
          <div className="grid grid-cols-2 min-[480px]:grid-cols-3 gap-1.5 mb-3">
            {SHIFT_TYPES.filter((t) => t.value !== 'custom').map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => onAddShift(selectedDay, t.value)}
                className="px-2 py-2.5 rounded-lg text-[10px] sm:text-xs font-medium border border-light text-secondary hover:border-gold/30 hover:text-gold transition-all"
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onOpenCustomModal}
            className="w-full py-2.5 rounded-lg text-xs font-medium bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 transition-colors"
          >
            Custom shift
          </button>
        </div>

        {dayDetailAppts.length > 0 && (
          <div className="pt-3 border-t border-light">
            <p className="text-[10px] uppercase tracking-widest text-secondary mb-2">{dayDetailAppts.length} appointment{dayDetailAppts.length !== 1 ? 's' : ''}</p>
            <div className="space-y-2">
              {dayDetailAppts.map((a) => (
                <div key={a.appointment_id} className="rounded-lg bg-white/[0.03] border border-light p-2.5">
                  <div className="text-sm text-primary font-medium truncate">{a.customer_name}</div>
                  <div className="text-[10px] text-secondary truncate">{a.service_name}</div>
                  <div className="text-[10px] text-gold mt-1">
                    {new Date(a.appointment_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function StaffMemberButton({ member, isActive, count, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(member.id)}
      className={`flex items-center gap-3 text-left transition-all shrink-0 ${
        isActive ? 'bg-gold/10 border-gold/30 text-gold' : 'bg-secondary border-light text-primary hover:border-white/20'
      } border rounded-xl px-3 py-2.5 lg:w-full lg:rounded-none lg:border-0 lg:border-l-2 lg:px-4 lg:py-3 ${
        isActive ? 'lg:border-l-gold' : 'lg:border-l-transparent lg:hover:bg-white/[0.03]'
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-heading ${
        isActive ? 'bg-gold text-charcoal' : 'bg-gold/10 text-gold border border-gold/20'
      }`}>
        {getInitials(member.full_name)}
      </div>
      <div className="min-w-0 flex-1 lg:block">
        <div className={`text-sm font-medium truncate ${isActive ? 'text-gold' : 'text-primary'}`}>{member.full_name}</div>
        <div className="text-[10px] text-secondary uppercase tracking-wide">{ROLE_LABELS[member.role] || member.role}</div>
      </div>
      <span className="text-[10px] text-muted tabular-nums">{count}</span>
    </button>
  );
}

export default function StaffSchedule() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { role, id } = useParams();
  const location = useLocation();

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [staff, setStaff] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('schedule');
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [weekPattern, setWeekPattern] = useState(emptyWeekPattern());
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [applyError, setApplyError] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayDetailAppts, setDayDetailAppts] = useState([]);
  const [bulkTarget, setBulkTarget] = useState('selected');
  const [dayCustomStart, setDayCustomStart] = useState('09:00');
  const [dayCustomEnd, setDayCustomEnd] = useState('17:00');
  const [showDayCustomModal, setShowDayCustomModal] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const monthRange = useMemo(() => getMonthRange(viewYear, viewMonth), [viewYear, viewMonth]);
  const monthGrid = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const selectedMember = staff.find((s) => s.id === selectedStaffId);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const staffParam = params.get('staff');
    const nextId = id || staffParam || null;
    setSelectedStaffId(nextId);
  }, [id, location.search]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!STAFF_SHIFTS) {
      navigate('/portal');
      return;
    }
    if (!['admin', 'super_admin', 'owner', 'partner'].includes(user.role)) {
      navigate('/portal');
    }
  }, [user, navigate]);

  const savePattern = (pattern) => {
    setWeekPattern(pattern);
    if (selectedMember) {
      localStorage.setItem(`schedule-pattern-${selectedMember.id}`, JSON.stringify(pattern));
    }
  };

  useEffect(() => {
    if (selectedMember) {
      const saved = localStorage.getItem(`schedule-pattern-${selectedMember.id}`);
      if (saved) {
        try {
          setWeekPattern(JSON.parse(saved));
          return;
        } catch { /* fall through */ }
      }
      setWeekPattern(patternFromRole(selectedMember.role));
    }
  }, [selectedMember?.id, selectedMember?.role]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    const { start, end } = monthRange;

    try {
      const staffData = await fetchSchedulableStaff();
      setStaff(staffData);
    } catch (err) {
      console.error('Error fetching staff:', err);
      setFetchError('Could not load team members');
      setStaff([]);
    }

    try {
      const shiftsData = await fetchStaffShifts(selectedStaffId, start, end);
      setShifts(shiftsData);
    } catch (err) {
      console.error('Error fetching shifts:', err);
      setFetchError((prev) => prev || 'Could not load shifts');
      setShifts([]);
    }

    try {
      const torData = await fetchTimeOffRequests();
      setTimeOffRequests(torData);
    } catch (err) {
      console.error('Error fetching time-off requests:', err);
      setTimeOffRequests([]);
    }

    setLoading(false);
  }, [monthRange, selectedStaffId]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, fetchData]);

  useEffect(() => {
    if (!loading && staff.length > 0 && !selectedStaffId) {
      selectStaff(staff[0].id);
    }
  }, [loading, staff, selectedStaffId]);

  const filteredStaff = useMemo(() => {
    if (roleFilter === 'all') return staff;
    return staff.filter((s) => s.role === roleFilter);
  }, [staff, roleFilter]);

  const shiftsByDate = useMemo(() => {
    const map = {};
    for (const s of shifts) {
      const key = s.shift_date;
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return map;
  }, [shifts]);

  const monthShiftCount = shifts.length;
  const pendingTimeOff = timeOffRequests.filter((r) => r.status === 'pending');
  const previewCount = countPatternShifts(weekPattern, monthRange.start, monthRange.end);

  const selectStaff = (memberId) => {
    setSelectedStaffId(memberId);
    setSelectedDay(null);
    const url = new URL(window.location);
    url.pathname = `/${role}/staff/schedule`;
    if (memberId) url.searchParams.set('staff', memberId);
    else url.searchParams.delete('staff');
    window.history.replaceState({}, '', url);
  };

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };

  const goNextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const goToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
  };

  const resolveTargetIds = () => {
    if (bulkTarget === 'selected') return selectedStaffId ? [selectedStaffId] : [];
    if (bulkTarget === 'role' && selectedMember) {
      return staff.filter((s) => s.role === selectedMember.role).map((s) => s.id);
    }
    if (bulkTarget === 'all') return staff.map((s) => s.id);
    return [];
  };

  const applyPattern = async () => {
    setApplyError('');
    setApplyMessage('');
    const targetIds = resolveTargetIds();
    if (targetIds.length === 0) {
      setApplyError('Select at least one team member');
      return;
    }
    if (!weekPattern.some(Boolean)) {
      setApplyError('Set at least one working day in the weekly pattern');
      return;
    }

    const rows = expandPatternToShifts(weekPattern, monthRange.start, monthRange.end);
    setApplying(true);
    let created = 0;
    let skipped = 0;

    try {
      for (const empId of targetIds) {
        const existingForEmp = shifts.filter(
          (s) => s.employee_id === empId && s.shift_date >= monthRange.start && s.shift_date <= monthRange.end
        );
        const existingByDate = {};
        for (const s of existingForEmp) {
          if (!existingByDate[s.shift_date]) existingByDate[s.shift_date] = [];
          existingByDate[s.shift_date].push(s);
        }

        if (replaceExisting) {
          for (const s of existingForEmp) {
            await supabase.rpc('delete_shift', { p_shift_id: s.id });
          }
        }

        for (const row of rows) {
          if (!replaceExisting && existingByDate[row.dateStr]?.length) {
            skipped++;
            continue;
          }
          const { error } = await supabase.rpc('create_shift', {
            p_employee_id: empId,
            p_shift_date: row.dateStr,
            p_shift_type: row.shift_type,
            p_start_time: row.start_time,
            p_end_time: row.end_time,
          });
          if (!error) created++;
        }
      }
      setApplyMessage(`Applied ${created} shift${created !== 1 ? 's' : ''}${skipped ? ` · ${skipped} skipped (already scheduled)` : ''}`);
      await fetchData();
    } catch (err) {
      setApplyError(err.message || 'Failed to apply schedule');
    } finally {
      setApplying(false);
    }
  };

  const clearMonthForTargets = async () => {
    const targetIds = resolveTargetIds();
    if (targetIds.length === 0) return;
    if (!window.confirm(`Clear all shifts in ${getMonthLabel(viewYear, viewMonth)} for ${targetIds.length} team member(s)?`)) return;

    setApplying(true);
    try {
      const toDelete = shifts.filter(
        (s) => targetIds.includes(s.employee_id) && s.shift_date >= monthRange.start && s.shift_date <= monthRange.end
      );
      for (const s of toDelete) {
        await supabase.rpc('delete_shift', { p_shift_id: s.id });
      }
      setApplyMessage(`Cleared ${toDelete.length} shift${toDelete.length !== 1 ? 's' : ''}`);
      await fetchData();
    } catch (err) {
      setApplyError(err.message || 'Failed to clear shifts');
    } finally {
      setApplying(false);
    }
  };

  const deleteShift = async (shiftId) => {
    await supabase.rpc('delete_shift', { p_shift_id: shiftId });
    await fetchData();
  };

  const openDay = async (dateStr) => {
    if (!selectedMember) return;
    setSelectedDay(dateStr);
    setDayDetailAppts([]);
    setDayCustomStart('09:00');
    setDayCustomEnd('17:00');
    try {
      const { data } = await supabase.rpc('get_technician_appointments', {
        p_employee_id: selectedMember.id,
        p_start_date: dateStr,
        p_end_date: dateStr,
      });
      setDayDetailAppts(data || []);
    } catch { /* ignore */ }
  };

  const addShiftToDay = async (dateStr, shiftType = 'morning', startTime, endTime) => {
    if (!selectedStaffId) return;
    const cfg = shiftConfig(shiftType);
    await supabase.rpc('create_shift', {
      p_employee_id: selectedStaffId,
      p_shift_date: dateStr,
      p_shift_type: shiftType,
      p_start_time: startTime || cfg.defaultStart,
      p_end_time: endTime || cfg.defaultEnd,
    });
    await fetchData();
    openDay(dateStr);
  };

  const handleReviewTimeOff = async (requestId, status) => {
    await reviewTimeOffRequest(requestId, status, user.id);
    await fetchData();
  };

  if (loading && staff.length === 0) {
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
      <style>{`.staff-schedule select, .staff-schedule option { background: var(--input-bg); color: var(--text-primary); } .staff-schedule input[type="time"] { color-scheme: ${theme}; }`}</style>

      <div className="staff-schedule p-3 sm:p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-gold/10 pb-4 sm:pb-6 mb-4 sm:mb-6">
          <div className="min-w-0">
            <h1 className="font-heading text-2xl sm:text-3xl text-gold tracking-wide">Staff Schedule</h1>
            <p className="text-xs text-secondary mt-1">
              Build a weekly pattern once, then apply it to the whole month
            </p>
            {fetchError && (
              <p className="text-xs text-red-400 mt-2">{fetchError}</p>
            )}
          </div>
          <div className="flex items-center gap-2 bg-secondary rounded-xl p-1 border border-light w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'schedule' ? 'bg-gold text-charcoal shadow-lg shadow-gold/20' : 'text-secondary hover:text-primary'}`}
            >
              Planner
            </button>
            <button
              onClick={() => setActiveTab('timeoff')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${activeTab === 'timeoff' ? 'bg-gold text-charcoal shadow-lg shadow-gold/20' : 'text-secondary hover:text-primary'}`}
            >
              Time-Off
              {pendingTimeOff.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold bg-gold text-charcoal">
                  {pendingTimeOff.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {activeTab === 'schedule' && (
          <div className="space-y-4 lg:space-y-0 lg:flex lg:flex-row lg:gap-6">
            {/* Mobile / tablet team picker */}
            <div className="lg:hidden space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {['all', 'technician', 'cashier', 'admin'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoleFilter(r)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium uppercase tracking-wide transition-all ${
                      roleFilter === r ? 'bg-gold/15 text-gold border border-gold/30' : 'text-secondary hover:text-primary border border-transparent'
                    }`}
                  >
                    {r === 'all' ? 'All' : ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
              <div className="-mx-3 sm:-mx-4 px-3 sm:px-4 overflow-x-auto">
                <div className="flex gap-2 pb-1 min-w-min">
                  {filteredStaff.map((member) => {
                    const count = shifts.filter((s) => s.employee_id === member.id).length;
                    return (
                      <StaffMemberButton
                        key={member.id}
                        member={member}
                        isActive={member.id === selectedStaffId}
                        count={count}
                        onSelect={selectStaff}
                      />
                    );
                  })}
                  {filteredStaff.length === 0 && (
                    <p className="text-sm text-secondary py-2">No team members</p>
                  )}
                </div>
              </div>
            </div>

            {/* Desktop team sidebar */}
            <aside className="hidden lg:block lg:w-56 xl:w-64 shrink-0">
              <div className="rounded-2xl border border-light bg-secondary overflow-hidden">
                <div className="p-4 border-b border-light">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-secondary">Team</h2>
                </div>
                <div className="flex flex-wrap gap-1.5 p-3 border-b border-light">
                  {['all', 'technician', 'cashier', 'admin'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRoleFilter(r)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-medium uppercase tracking-wide transition-all ${
                        roleFilter === r ? 'bg-gold/15 text-gold border border-gold/30' : 'text-secondary hover:text-primary border border-transparent'
                      }`}
                    >
                      {r === 'all' ? 'All' : ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
                <div className="max-h-[420px] overflow-y-auto divide-y divide-white/5">
                  {filteredStaff.map((member) => {
                    const count = shifts.filter((s) => s.employee_id === member.id).length;
                    return (
                      <StaffMemberButton
                        key={member.id}
                        member={member}
                        isActive={member.id === selectedStaffId}
                        count={count}
                        onSelect={selectStaff}
                      />
                    );
                  })}
                  {filteredStaff.length === 0 && (
                    <p className="p-4 text-sm text-secondary text-center">No team members</p>
                  )}
                </div>
              </div>
            </aside>

            <div className="flex flex-col xl:flex-row gap-4 xl:gap-6 flex-1 min-w-0">
            {/* Main planner */}
            <div className="flex-1 min-w-0 space-y-4 sm:space-y-5">
              {!selectedMember ? (
                <div className="rounded-2xl border border-dashed border-light p-8 sm:p-16 text-center">
                  <p className="text-secondary text-sm">Select a team member to build their schedule</p>
                </div>
              ) : (
                <>
                  {/* Selected staff banner */}
                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 rounded-2xl border border-gold/20 bg-gold/[0.04] px-4 sm:px-5 py-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold font-heading shrink-0">
                        {getInitials(selectedMember.full_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-heading text-base sm:text-lg text-primary truncate">{selectedMember.full_name}</div>
                        <div className="text-xs text-secondary">{ROLE_LABELS[selectedMember.role]} · {monthShiftCount} shifts this month</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => savePattern(patternFromRole(selectedMember.role))}
                      className="w-full sm:w-auto text-xs px-3 py-2 rounded-lg border border-light text-secondary hover:text-gold hover:border-gold/30 transition-colors"
                    >
                      Load {ROLE_LABELS[selectedMember.role]} default
                    </button>
                  </div>

                  {/* Quick presets */}
                  <div className="flex flex-wrap gap-2">
                    {PATTERN_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => savePattern([...preset.pattern])}
                        className="px-3 py-1.5 rounded-full text-xs border border-light text-secondary hover:border-gold/30 hover:text-gold transition-all"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Weekly pattern */}
                  <div className="rounded-2xl border border-light bg-secondary p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-4 gap-2">
                      <h3 className="text-sm font-medium text-primary">Weekly pattern</h3>
                      <button
                        type="button"
                        onClick={() => savePattern(emptyWeekPattern())}
                        className="text-xs text-secondary hover:text-red-400 transition-colors shrink-0"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2 sm:gap-3">
                      {DAY_LABELS.map((_, dayIdx) => (
                        <PatternDayCell
                          key={dayIdx}
                          dayIdx={dayIdx}
                          value={weekPattern[dayIdx]}
                          onChange={(val) => {
                            const next = [...weekPattern];
                            next[dayIdx] = val;
                            savePattern(next);
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Apply controls */}
                  <div className="rounded-2xl border border-light bg-secondary p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <button onClick={goPrevMonth} className="p-2 rounded-lg border border-light text-secondary hover:text-gold hover:border-gold/30 transition-all shrink-0" aria-label="Previous month">
                          <ChevronLeft />
                        </button>
                        <span className="font-heading text-base sm:text-lg text-primary text-center min-w-[140px] sm:min-w-[160px]">{getMonthLabel(viewYear, viewMonth)}</span>
                        <button onClick={goNextMonth} className="p-2 rounded-lg border border-light text-secondary hover:text-gold hover:border-gold/30 transition-all shrink-0" aria-label="Next month">
                          <ChevronRight />
                        </button>
                        {(viewYear !== now.getFullYear() || viewMonth !== now.getMonth()) && (
                          <button onClick={goToday} className="text-xs px-3 py-1.5 rounded-lg text-gold border border-gold/20 hover:bg-gold/10 transition-colors shrink-0">
                            Today
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-secondary text-center sm:text-left">
                        Pattern fills <span className="text-gold font-medium">{previewCount}</span> days in this month
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-secondary block mb-1.5">Apply to</label>
                        <select
                          value={bulkTarget}
                          onChange={(e) => setBulkTarget(e.target.value)}
                          className="w-full px-3 py-2.5 bg-input border border-light rounded-xl text-sm text-primary focus:border-gold focus:outline-none"
                        >
                          <option value="selected">Only {selectedMember.full_name}</option>
                          <option value="role">All {ROLE_LABELS[selectedMember.role] || selectedMember.role}s</option>
                          <option value="all">Entire team</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-xl border border-light w-full">
                          <input
                            type="checkbox"
                            checked={replaceExisting}
                            onChange={(e) => setReplaceExisting(e.target.checked)}
                            className="rounded border-white/20 bg-transparent text-gold focus:ring-gold/30"
                          />
                          <span className="text-sm text-primary">Replace existing shifts in range</span>
                        </label>
                      </div>
                    </div>

                    {(applyMessage || applyError) && (
                      <p className={`text-sm ${applyError ? 'text-red-400' : 'text-green-400'}`}>{applyError || applyMessage}</p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={applyPattern}
                        disabled={applying || previewCount === 0}
                        className="w-full sm:flex-1 px-6 py-3 bg-gold text-charcoal rounded-xl text-sm font-medium hover:bg-gold/90 transition-colors shadow-lg shadow-gold/10 disabled:opacity-50"
                      >
                        {applying ? 'Applying…' : `Apply to ${getMonthLabel(viewYear, viewMonth)}`}
                      </button>
                      <button
                        type="button"
                        onClick={clearMonthForTargets}
                        disabled={applying || monthShiftCount === 0}
                        className="w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-medium border border-red-500/30 text-red-400/80 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                      >
                        Clear month
                      </button>
                    </div>
                  </div>

                  {/* Month calendar */}
                  <div className="rounded-2xl border border-light bg-secondary p-3 sm:p-5">
                    <h3 className="text-sm font-medium text-primary mb-3 sm:mb-4">Month overview</h3>
                    <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1 sm:mb-2">
                      {DAY_LABELS.map((d) => (
                        <div key={d} className="text-center text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted py-1">{d.slice(0, 1)}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                      {monthGrid.map((date, idx) => {
                        if (!date) return <div key={`pad-${idx}`} className="min-h-[2.25rem] sm:min-h-0 sm:aspect-square" />;
                        const dateStr = toDateStr(date);
                        const dayShifts = (shiftsByDate[dateStr] || []).filter((s) => s.employee_id === selectedStaffId);
                        const today = isToday(dateStr);
                        const hasShift = dayShifts.length > 0;

                        return (
                          <button
                            key={dateStr}
                            type="button"
                            onClick={() => openDay(dateStr)}
                            className={`min-h-[2.25rem] sm:aspect-square rounded-md sm:rounded-xl border p-0.5 sm:p-1 flex flex-col items-center justify-center sm:justify-start transition-all ${
                              today ? 'border-gold/40 bg-gold/[0.06]' :
                              selectedDay === dateStr ? 'border-gold ring-1 ring-gold/30 bg-gold/[0.04]' :
                              hasShift ? 'border-light bg-white/[0.02] hover:border-gold/30 active:border-gold/30' :
                              'border-light hover:border-white/15 active:border-white/15'
                            }`}
                          >
                            <span className={`text-[10px] sm:text-xs font-medium ${today ? 'text-gold' : 'text-secondary'}`}>{date.getDate()}</span>
                            <div className="hidden sm:flex flex-wrap gap-0.5 justify-center mt-1">
                              {dayShifts.slice(0, 3).map((s) => (
                                <span key={s.id} className={`w-1.5 h-1.5 rounded-full ${SHIFT_DOT[s.shift_type] || SHIFT_DOT.custom}`} />
                              ))}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-light">
                      {SHIFT_TYPES.map((t) => (
                        <div key={t.value} className="flex items-center gap-1.5 text-[10px] text-secondary">
                          <span className={`w-2 h-2 rounded-full ${SHIFT_DOT[t.value]}`} />
                          {t.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Day detail — desktop sidebar */}
            {selectedDay && selectedMember && (
              <aside className="hidden xl:block xl:w-72 shrink-0">
                <div className="rounded-2xl border border-light bg-secondary overflow-hidden sticky top-6 flex flex-col max-h-[calc(100vh-6rem)]">
                  <DayDetailBody
                    selectedDay={selectedDay}
                    selectedStaffId={selectedStaffId}
                    shiftsByDate={shiftsByDate}
                    dayDetailAppts={dayDetailAppts}
                    onClose={() => { setSelectedDay(null); setShowDayCustomModal(false); }}
                    onDeleteShift={deleteShift}
                    onAddShift={addShiftToDay}
                    onOpenCustomModal={() => setShowDayCustomModal(true)}
                    formatTime={formatTime}
                    SHIFT_COLORS={SHIFT_COLORS}
                    SHIFT_TYPES={SHIFT_TYPES}
                    DAY_LABELS_FULL={DAY_LABELS_FULL}
                  />
                </div>
              </aside>
            )}
            </div>
          </div>
        )}

        {/* Day detail — mobile / tablet modal */}
        {activeTab === 'schedule' && selectedDay && selectedMember && (
          <div
            className="xl:hidden fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => { setSelectedDay(null); setShowDayCustomModal(false); }}
          >
            <div
              className="w-full max-w-md max-h-[90vh] flex flex-col bg-card rounded-t-2xl sm:rounded-xl border border-card overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <DayDetailBody
                selectedDay={selectedDay}
                selectedStaffId={selectedStaffId}
                shiftsByDate={shiftsByDate}
                dayDetailAppts={dayDetailAppts}
                onClose={() => { setSelectedDay(null); setShowDayCustomModal(false); }}
                onDeleteShift={deleteShift}
                onAddShift={addShiftToDay}
                onOpenCustomModal={() => setShowDayCustomModal(true)}
                formatTime={formatTime}
                SHIFT_COLORS={SHIFT_COLORS}
                SHIFT_TYPES={SHIFT_TYPES}
                DAY_LABELS_FULL={DAY_LABELS_FULL}
              />
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
            <CustomShiftTimeModal
              open={showDayCustomModal}
              title="Add custom shift"
              startTime={dayCustomStart}
              endTime={dayCustomEnd}
              saveLabel="Add shift"
              onSave={(start, end) => {
                setDayCustomStart(start);
                setDayCustomEnd(end);
                addShiftToDay(selectedDay, 'custom', start, end);
                setShowDayCustomModal(false);
              }}
              onClose={() => setShowDayCustomModal(false)}
            />
        )}

        {activeTab === 'timeoff' && (
          <div className="space-y-3 max-w-3xl">
            {timeOffRequests.length === 0 ? (
              <div className="rounded-2xl p-12 text-center bg-secondary border border-light">
                <h2 className="font-heading text-xl text-primary mb-2">No Time-Off Requests</h2>
                <p className="text-secondary text-sm">All caught up.</p>
              </div>
            ) : (
              timeOffRequests.map((r) => (
                <div
                  key={r.id}
                  className={`rounded-2xl p-5 bg-secondary ${r.status === 'pending' ? 'border border-gold/30' : 'border border-light'}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                        <span className="text-gold text-xs font-heading">{getInitials(r.staff_name)}</span>
                      </div>
                      <div>
                        <div className="text-primary font-medium">{r.staff_name}</div>
                        <div className="text-secondary text-xs">
                          {new Date(r.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {r.start_date !== r.end_date && ` – ${new Date(r.end_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                        </div>
                        {r.reason && <p className="text-sm text-secondary mt-1">{r.reason}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-2">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        r.status === 'pending' ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20' :
                        r.status === 'approved' ? 'bg-green-500/15 text-green-400 border border-green-500/20' :
                        'bg-red-500/15 text-red-400 border border-red-500/20'
                      }`}>
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </span>
                      {r.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleReviewTimeOff(r.id, 'approved')} className="px-4 py-2 bg-green-500/15 text-green-400 border border-green-500/20 rounded-xl text-sm hover:bg-green-500/25">Approve</button>
                          <button onClick={() => handleReviewTimeOff(r.id, 'rejected')} className="px-4 py-2 bg-red-500/15 text-red-400 border border-red-500/20 rounded-xl text-sm hover:bg-red-500/25">Reject</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
