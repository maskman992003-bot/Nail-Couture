import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
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
import AppModal, { modalBtnDanger, modalBtnSecondary } from './AppModal';
import DayDetailPanel from './schedule/DayDetailPanel';
import TimeOffTab from './schedule/TimeOffTab';
import ScheduleTabToggle from './schedule/ScheduleTabToggle';
import ScheduleTeamPicker from './schedule/ScheduleTeamPicker';
import ScheduleCalendar from './schedule/ScheduleCalendar';
import WeekGrid from './schedule/WeekGrid';
import CalendarViewToggle, { ScheduleWeekNav } from './schedule/CalendarViewToggle';
import WeeklyPatternBuilder from './schedule/WeeklyPatternBuilder';
import BulkApplyPanel from './schedule/BulkApplyPanel';
import CustomShiftTimeModal from './schedule/CustomShiftTimeModal';
import useFocusTrap from '../hooks/useFocusTrap';
import { getStaffPlannerPath } from '../utils/routes';
import {
  ROLE_LABELS,
  emptyWeekPattern,
  patternFromRole,
  toDateStr,
  getMonthRange,
  getMonthLabel,
  getMonthGrid,
  expandPatternToShifts,
  countPatternShifts,
  getInitials,
  shiftConfig,
  getWeekDates,
  formatWeekRange,
  buildTimeOffDateMap,
  parseDateStr,
} from '../utils/scheduleUtils';

export default function StaffSchedule() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'timeoff' ? 'timeoff' : 'schedule';

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [staff, setStaff] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [weekPattern, setWeekPattern] = useState(emptyWeekPattern());
  const [templateOpen, setTemplateOpen] = useState(false);
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
  const [dayDetailLoading, setDayDetailLoading] = useState(false);
  const [dayDetailApptError, setDayDetailApptError] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [calendarView, setCalendarView] = useState('month');
  const [weekAnchorDate, setWeekAnchorDate] = useState(now);

  const monthRange = useMemo(() => getMonthRange(viewYear, viewMonth), [viewYear, viewMonth]);
  const monthGrid = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const weekDates = useMemo(() => getWeekDates(weekAnchorDate), [weekAnchorDate]);
  const selectedMember = staff.find((s) => s.id === selectedStaffId);
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

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
      const shiftsData = await fetchStaffShifts(null, start, end);
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
  }, [monthRange]);

  const refreshShiftsSilently = useCallback(async () => {
    const { start, end } = monthRange;
    try {
      const shiftsData = await fetchStaffShifts(null, start, end);
      setShifts(shiftsData);
    } catch (err) {
      console.error('Error refreshing shifts:', err);
    }
  }, [monthRange]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, fetchData]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'timeoff') setActiveTab('timeoff');
    else if (tab !== 'timeoff') setActiveTab('schedule');
  }, [searchParams]);

  const setTab = (tab) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === 'timeoff') next.set('tab', 'timeoff');
    else next.delete('tab');
    setSearchParams(next, { replace: true });
  };

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

  const shiftCountsByMember = useMemo(() => {
    const counts = {};
    for (const s of shifts) {
      counts[s.employee_id] = (counts[s.employee_id] || 0) + 1;
    }
    return counts;
  }, [shifts]);

  const ghostShiftsByDate = useMemo(() => {
    if (!templateOpen || !weekPattern.some(Boolean)) return {};
    const rows = expandPatternToShifts(weekPattern, monthRange.start, monthRange.end);
    const map = {};
    for (const row of rows) {
      if (!map[row.dateStr]) map[row.dateStr] = [];
      map[row.dateStr].push(row);
    }
    return map;
  }, [templateOpen, weekPattern, monthRange.start, monthRange.end]);

  const selectedStaffTimeOff = useMemo(
    () => buildTimeOffDateMap(timeOffRequests, {
      staffId: selectedStaffId,
      statuses: ['approved', 'pending'],
    }),
    [timeOffRequests, selectedStaffId],
  );

  const monthShiftCount = shifts.filter((s) => s.employee_id === selectedStaffId).length;
  const pendingTimeOff = timeOffRequests.filter((r) => r.status === 'pending');
  const previewCount = countPatternShifts(weekPattern, monthRange.start, monthRange.end);

  const selectStaff = (memberId) => {
    setSelectedStaffId(memberId);
    setSelectedDay(null);
    if (!user?.role) return;
    const basePath = getStaffPlannerPath(user.role);
    const params = new URLSearchParams(location.search);
    if (memberId) params.set('staff', memberId);
    else params.delete('staff');
    const search = params.toString();
    navigate(`${basePath}${search ? `?${search}` : ''}`, { replace: true });
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
    setWeekAnchorDate(t);
  };

  const syncMonthToDate = (date) => {
    if (date.getFullYear() !== viewYear || date.getMonth() !== viewMonth) {
      setViewYear(date.getFullYear());
      setViewMonth(date.getMonth());
    }
  };

  const goPrevWeek = () => {
    const d = new Date(weekAnchorDate);
    d.setDate(d.getDate() - 7);
    setWeekAnchorDate(d);
    syncMonthToDate(d);
  };

  const goNextWeek = () => {
    const d = new Date(weekAnchorDate);
    d.setDate(d.getDate() + 7);
    setWeekAnchorDate(d);
    syncMonthToDate(d);
  };

  const handleViewScheduleFromTimeOff = (staffId, startDate) => {
    selectStaff(staffId);
    setTab('schedule');
    setCalendarView('month');
    if (startDate) {
      const d = parseDateStr(startDate);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setWeekAnchorDate(d);
    }
  };

  const resolveTargetIds = () => {
    if (bulkTarget === 'selected') return selectedStaffId ? [selectedStaffId] : [];
    if (bulkTarget === 'role' && selectedMember) {
      return staff.filter((s) => s.role === selectedMember.role).map((s) => s.id);
    }
    if (bulkTarget === 'all') return staff.map((s) => s.id);
    return [];
  };

  const needsApplyConfirm = () => bulkTarget === 'all' || (replaceExisting && bulkTarget !== 'selected');

  const requestApplyPattern = () => {
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
    if (needsApplyConfirm()) {
      setShowApplyConfirm(true);
      return;
    }
    executeApplyPattern();
  };

  const executeApplyPattern = async () => {
    setShowApplyConfirm(false);
    setApplyError('');
    setApplyMessage('');
    const targetIds = resolveTargetIds();
    if (targetIds.length === 0) return;

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

  const clearMonthForTargets = () => {
    const targetIds = resolveTargetIds();
    if (targetIds.length === 0) return;
    setShowClearConfirm(true);
  };

  const executeClearMonth = async () => {
    const targetIds = resolveTargetIds();
    if (targetIds.length === 0) return;
    setShowClearConfirm(false);
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
    const previous = shifts;
    setShifts((current) => current.filter((s) => s.id !== shiftId));
    try {
      const { error } = await supabase.rpc('delete_shift', { p_shift_id: shiftId });
      if (error) throw error;
    } catch (err) {
      console.error('Error deleting shift:', err);
      setShifts(previous);
    }
  };

  const openDay = async (dateStr) => {
    if (!selectedMember) return;
    setSelectedDay(dateStr);
    setDayDetailAppts([]);
    setDayDetailApptError('');
    setDayDetailLoading(true);
    setDayCustomStart('09:00');
    setDayCustomEnd('17:00');
    try {
      const { data, error } = await supabase.rpc('get_technician_appointments', {
        p_employee_id: selectedMember.id,
        p_start_date: dateStr,
        p_end_date: dateStr,
      });
      if (error) throw error;
      setDayDetailAppts(data || []);
    } catch (err) {
      console.error('Error loading day appointments:', err);
      setDayDetailApptError('Could not load appointments for this day');
    } finally {
      setDayDetailLoading(false);
    }
  };

  const addShiftToDay = async (dateStr, shiftType = 'morning', startTime, endTime) => {
    if (!selectedStaffId) return;
    const cfg = shiftConfig(shiftType);
    const tempId = `temp-${Date.now()}`;
    const optimisticShift = {
      id: tempId,
      employee_id: selectedStaffId,
      shift_date: dateStr,
      shift_type: shiftType,
      start_time: startTime || cfg.defaultStart,
      end_time: endTime || cfg.defaultEnd,
    };

    setShifts((current) => [...current, optimisticShift]);
    try {
      const { error } = await supabase.rpc('create_shift', {
        p_employee_id: selectedStaffId,
        p_shift_date: dateStr,
        p_shift_type: shiftType,
        p_start_time: startTime || cfg.defaultStart,
        p_end_time: endTime || cfg.defaultEnd,
      });
      if (error) throw error;
      await refreshShiftsSilently();
    } catch (err) {
      console.error('Error adding shift:', err);
      setShifts((current) => current.filter((s) => s.id !== tempId));
    }
  };

  const handleReviewTimeOff = async (requestId, status, reviewNote = null) => {
    await reviewTimeOffRequest(requestId, status, user.id, reviewNote);
    await fetchData();
  };

  const closeDayDetail = () => {
    setSelectedDay(null);
    setShowDayCustomModal(false);
  };

  const selectedDayShifts = selectedDay
    ? (shiftsByDate[selectedDay] || []).filter((s) => s.employee_id === selectedStaffId)
    : [];

  const dayDetailPanelProps = {
    mode: 'edit',
    selectedDay,
    shifts: selectedDayShifts,
    appointments: dayDetailAppts,
    appointmentsLoading: dayDetailLoading,
    appointmentsError: dayDetailApptError,
    onClose: closeDayDetail,
    onDeleteShift: deleteShift,
    onAddShift: addShiftToDay,
    onOpenCustomModal: () => setShowDayCustomModal(true),
  };

  const clearTargetCount = resolveTargetIds().length;
  const applyTargetCount = resolveTargetIds().length;
  const mobileDayPanelRef = useFocusTrap(Boolean(activeTab === 'schedule' && selectedDay && selectedMember), closeDayDetail);

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
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-gold/10 pb-4 sm:pb-6 mb-4 sm:mb-6">
          <div className="min-w-0">
            <h1 className="font-heading text-2xl sm:text-3xl text-gold tracking-wide">Staff Schedule</h1>
            <p className="text-xs text-secondary mt-1">
              View saved shifts on the calendar — use Bulk template when you need to fill a whole month
            </p>
            {fetchError && (
              <p className="text-xs text-red-400 mt-2">{fetchError}</p>
            )}
          </div>
          <ScheduleTabToggle
            activeTab={activeTab}
            onChange={setTab}
            tabs={[
              { id: 'schedule', label: 'Calendar' },
              { id: 'timeoff', label: 'Time-Off', badge: pendingTimeOff.length },
            ]}
          />
        </div>

        {activeTab === 'schedule' && (
          <div className="space-y-4 lg:space-y-0 lg:flex lg:flex-row lg:gap-6">
            <ScheduleTeamPicker
              variant="mobile"
              filteredStaff={filteredStaff}
              selectedStaffId={selectedStaffId}
              roleFilter={roleFilter}
              shiftCountsByMember={shiftCountsByMember}
              onSelectStaff={selectStaff}
              onRoleFilterChange={setRoleFilter}
            />

            <ScheduleTeamPicker
              variant="sidebar"
              filteredStaff={filteredStaff}
              selectedStaffId={selectedStaffId}
              roleFilter={roleFilter}
              shiftCountsByMember={shiftCountsByMember}
              onSelectStaff={selectStaff}
              onRoleFilterChange={setRoleFilter}
            />

            <div className="flex flex-col xl:flex-row gap-4 xl:gap-6 flex-1 min-w-0">
              <div className="flex-1 min-w-0 space-y-4 sm:space-y-5">
                {!selectedMember ? (
                  <div className="rounded-2xl border border-dashed border-light p-8 sm:p-16 text-center">
                    <p className="text-secondary text-sm">Select a team member to view their schedule</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 rounded-2xl border border-gold/20 bg-gold/[0.04] px-4 sm:px-5 py-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-11 h-11 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold font-heading shrink-0">
                          {getInitials(selectedMember.full_name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-heading text-base sm:text-lg text-primary truncate">{selectedMember.full_name}</div>
                          <div className="text-xs text-secondary">
                            {ROLE_LABELS[selectedMember.role]} · {monthShiftCount} shifts in {getMonthLabel(viewYear, viewMonth)}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <CalendarViewToggle
                          view={calendarView}
                          onChange={(view) => {
                            setCalendarView(view);
                            if (view === 'week') setWeekAnchorDate(new Date(viewYear, viewMonth, selectedDay ? parseDateStr(selectedDay).getDate() : now.getDate()));
                          }}
                        />
                        {calendarView === 'month' ? (
                          <>
                            <button
                              type="button"
                              onClick={goPrevMonth}
                              className="p-2 rounded-lg border border-light text-secondary hover:text-gold hover:border-gold/30 transition-all shrink-0"
                              aria-label="Previous month"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            <span className="font-heading text-sm sm:text-base text-primary min-w-[120px] text-center">
                              {getMonthLabel(viewYear, viewMonth)}
                            </span>
                            <button
                              type="button"
                              onClick={goNextMonth}
                              className="p-2 rounded-lg border border-light text-secondary hover:text-gold hover:border-gold/30 transition-all shrink-0"
                              aria-label="Next month"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                            {!isCurrentMonth && (
                              <button
                                type="button"
                                onClick={goToday}
                                className="text-xs px-3 py-1.5 rounded-lg text-gold border border-gold/20 hover:bg-gold/10 transition-colors shrink-0"
                              >
                                Today
                              </button>
                            )}
                          </>
                        ) : (
                          <ScheduleWeekNav
                            label={formatWeekRange(weekDates)}
                            onPrev={goPrevWeek}
                            onNext={goNextWeek}
                            onToday={goToday}
                            showToday={!weekDates.some((d) => toDateStr(d) === toDateStr(now))}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => setTemplateOpen((v) => !v)}
                          aria-expanded={templateOpen}
                          aria-controls="bulk-template-drawer"
                          className={`ml-auto sm:ml-0 text-xs px-3 py-2 rounded-lg border transition-colors ${
                            templateOpen
                              ? 'bg-gold/15 text-gold border-gold/40'
                              : 'border-gold/30 text-gold hover:bg-gold/10'
                          }`}
                        >
                          Bulk template {templateOpen ? '▴' : '▾'}
                        </button>
                      </div>
                    </div>

                    {templateOpen && (
                      <div
                        id="bulk-template-drawer"
                        className="rounded-2xl border border-dashed border-gold/30 bg-gold/[0.03] p-4 sm:p-5 space-y-4"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-gold/80 border border-gold/30 px-2 py-0.5 rounded-full">
                            Draft
                          </span>
                          <h3 className="text-sm font-medium text-primary">Bulk template</h3>
                        </div>
                        <WeeklyPatternBuilder
                          pattern={weekPattern}
                          onChange={savePattern}
                          onLoadRoleDefault={() => savePattern(patternFromRole(selectedMember.role))}
                          roleLabel={ROLE_LABELS[selectedMember.role]}
                        />
                        <BulkApplyPanel
                          viewYear={viewYear}
                          viewMonth={viewMonth}
                          isCurrentMonth={isCurrentMonth}
                          previewCount={previewCount}
                          bulkTarget={bulkTarget}
                          replaceExisting={replaceExisting}
                          selectedMember={selectedMember}
                          applying={applying}
                          applyMessage={applyMessage}
                          applyError={applyError}
                          monthShiftCount={monthShiftCount}
                          onPrevMonth={goPrevMonth}
                          onNextMonth={goNextMonth}
                          onToday={goToday}
                          onBulkTargetChange={setBulkTarget}
                          onReplaceExistingChange={setReplaceExisting}
                          onApply={requestApplyPattern}
                          onClear={clearMonthForTargets}
                        />
                      </div>
                    )}

                    {calendarView === 'month' ? (
                      <ScheduleCalendar
                        monthGrid={monthGrid}
                        shiftsByDate={shiftsByDate}
                        selectedStaffId={selectedStaffId}
                        selectedDay={selectedDay}
                        onDayClick={openDay}
                        ghostShiftsByDate={ghostShiftsByDate}
                        timeOffByDate={selectedStaffTimeOff}
                        emptyMessage={`No shifts in ${getMonthLabel(viewYear, viewMonth)} — open Bulk template or click a day to add one`}
                      />
                    ) : (
                      <div className="rounded-2xl border border-light bg-secondary p-3 sm:p-5">
                        <h3 className="text-sm font-medium text-primary mb-3 sm:mb-4">Week overview</h3>
                        <WeekGrid
                          weekDates={weekDates}
                          mode="manager"
                          shiftsByDate={shiftsByDate}
                          selectedStaffId={selectedStaffId}
                          timeOffByDate={selectedStaffTimeOff}
                          selectedDay={selectedDay}
                          onDayClick={(_dateObj, dateIso) => openDay(dateIso)}
                          todayStr={toDateStr(now)}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              {selectedDay && selectedMember && (
                <aside className="hidden xl:block xl:w-72 shrink-0">
                  <div className="rounded-2xl border border-light bg-secondary overflow-hidden sticky top-6 flex flex-col max-h-[calc(100vh-6rem)]">
                    <DayDetailPanel {...dayDetailPanelProps} />
                  </div>
                </aside>
              )}
            </div>
          </div>
        )}

        {activeTab === 'schedule' && selectedDay && selectedMember && (
          <div
            className="xl:hidden fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={closeDayDetail}
            role="presentation"
          >
            <div
              ref={mobileDayPanelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="staff-day-detail-title"
              className="w-full max-w-md max-h-[90vh] flex flex-col bg-card rounded-t-2xl sm:rounded-xl border border-card overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <span id="staff-day-detail-title" className="sr-only">Day schedule details</span>
              <DayDetailPanel {...dayDetailPanelProps} />
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
          <TimeOffTab
            variant="manager"
            requests={timeOffRequests}
            onReview={handleReviewTimeOff}
            onViewSchedule={handleViewScheduleFromTimeOff}
          />
        )}

        <AppModal
          open={showClearConfirm}
          onClose={() => setShowClearConfirm(false)}
          title="Clear month shifts?"
          maxWidth="max-w-md"
          zIndex="z-[110]"
          panelClassName="border-red-500/30"
          footer={
            <>
              <button type="button" onClick={() => setShowClearConfirm(false)} className={modalBtnSecondary}>
                Cancel
              </button>
              <button type="button" onClick={executeClearMonth} disabled={applying} className={modalBtnDanger}>
                {applying ? 'Clearing…' : 'Clear shifts'}
              </button>
            </>
          }
        >
          <p className="text-secondary text-sm">
            Clear all shifts in {getMonthLabel(viewYear, viewMonth)} for {clearTargetCount} team member{clearTargetCount !== 1 ? 's' : ''}?
            This cannot be undone.
          </p>
        </AppModal>

        <AppModal
          open={showApplyConfirm}
          onClose={() => setShowApplyConfirm(false)}
          title="Apply bulk schedule?"
          maxWidth="max-w-md"
          zIndex="z-[110]"
          panelClassName="border-gold/30"
          footer={
            <>
              <button type="button" onClick={() => setShowApplyConfirm(false)} className={modalBtnSecondary}>
                Cancel
              </button>
              <button type="button" onClick={executeApplyPattern} disabled={applying} className={modalBtnDanger}>
                {applying ? 'Applying…' : 'Confirm apply'}
              </button>
            </>
          }
        >
          <p className="text-secondary text-sm">
            This will {replaceExisting ? 'replace existing shifts and ' : ''}apply the template to{' '}
            {applyTargetCount} team member{applyTargetCount !== 1 ? 's' : ''} for {getMonthLabel(viewYear, viewMonth)}.
            Review the calendar preview before confirming.
          </p>
        </AppModal>
      </div>
    </div>
  );
}
