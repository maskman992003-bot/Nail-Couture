import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { STAFF_SHIFTS } from '@nail-couture/shared/constants/featureFlags.js';
import {
  fetchSchedulableStaff,
  fetchStaffShifts,
  fetchTimeOffRequests,
  reviewTimeOffRequest,
} from '@nail-couture/shared/utils/staffSchedule.js';
import {
  ROLE_LABELS,
  buildTimeOffDateMap,
  countPatternShifts,
  emptyWeekPattern,
  expandPatternToShifts,
  formatWeekRange,
  getInitials,
  getMonthGrid,
  getMonthLabel,
  getMonthRange,
  getWeekDates,
  parseDateStr,
  patternFromRole,
  shiftConfig,
  toDateStr,
} from '@nail-couture/shared/utils/scheduleUtils.js';
import { useAuth } from '../../contexts/AuthContext';
import { AppModal, ModalButton } from '../../components/AppModal';
import { StaffScreenLayout } from '../../components/staff/StaffScreenLayout';
import { BulkApplyPanel } from '../../components/staff/schedule/BulkApplyPanel';
import { CalendarViewToggle, type CalendarViewMode } from '../../components/staff/schedule/CalendarViewToggle';
import { CustomShiftTimeModal } from '../../components/staff/schedule/CustomShiftTimeModal';
import { DayDetailPanel } from '../../components/staff/schedule/DayDetailPanel';
import { ScheduleCalendar } from '../../components/staff/schedule/ScheduleCalendar';
import { ScheduleTabToggle } from '../../components/staff/schedule/ScheduleTabToggle';
import { ScheduleTeamPicker, type StaffMember } from '../../components/staff/schedule/ScheduleTeamPicker';
import { ScheduleWeekNav } from '../../components/staff/schedule/ScheduleWeekNav';
import { TimeOffTab, type TimeOffRequest } from '../../components/staff/schedule/TimeOffTab';
import { WeekGrid } from '../../components/staff/schedule/WeekGrid';
import { WeeklyPatternBuilder } from '../../components/staff/schedule/WeeklyPatternBuilder';
import type { ShiftRecord } from '../../components/staff/schedule/ShiftChip';
import type { AppointmentRecord } from '../../components/staff/schedule/WeekGrid';
import { useThemeStyles } from '../../theme/useThemeStyles';

type ShiftRow = ShiftRecord & { employee_id: string; shift_date: string };

export function ManagerScheduleView() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const now = new Date();

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'schedule' | 'timeoff'>('schedule');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [weekPattern, setWeekPattern] = useState<(string | { shift_type: string; start_time: string; end_time: string } | null)[]>(
    emptyWeekPattern(),
  );
  const [templateOpen, setTemplateOpen] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [applyError, setApplyError] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayDetailAppts, setDayDetailAppts] = useState<AppointmentRecord[]>([]);
  const [bulkTarget, setBulkTarget] = useState('selected');
  const [dayCustomStart, setDayCustomStart] = useState('09:00');
  const [dayCustomEnd, setDayCustomEnd] = useState('17:00');
  const [showDayCustomModal, setShowDayCustomModal] = useState(false);
  const [dayDetailLoading, setDayDetailLoading] = useState(false);
  const [dayDetailApptError, setDayDetailApptError] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [calendarView, setCalendarView] = useState<CalendarViewMode>('month');
  const [weekAnchorDate, setWeekAnchorDate] = useState(now);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);

  const monthRange = useMemo(() => getMonthRange(viewYear, viewMonth), [viewYear, viewMonth]);
  const monthGrid = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const weekDates = useMemo(() => getWeekDates(weekAnchorDate), [weekAnchorDate]);
  const selectedMember = staff.find((s) => s.id === selectedStaffId);
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  const savePattern = useCallback(
    async (pattern: typeof weekPattern) => {
      setWeekPattern(pattern);
      if (selectedMember) {
        await AsyncStorage.setItem(`schedule-pattern-${selectedMember.id}`, JSON.stringify(pattern));
      }
    },
    [selectedMember],
  );

  useEffect(() => {
    if (!selectedMember) return;
    AsyncStorage.getItem(`schedule-pattern-${selectedMember.id}`).then((saved) => {
      if (saved) {
        try {
          setWeekPattern(JSON.parse(saved));
          return;
        } catch {
          /* fall through */
        }
      }
      setWeekPattern(patternFromRole(selectedMember.role));
    });
  }, [selectedMember?.id, selectedMember?.role]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    const { start, end } = monthRange;

    try {
      const staffData = await fetchSchedulableStaff();
      setStaff(staffData as StaffMember[]);
    } catch (err) {
      console.error('Error fetching staff:', err);
      setFetchError('Could not load team members');
      setStaff([]);
    }

    try {
      const shiftsData = await fetchStaffShifts(null, start, end);
      setShifts(shiftsData as ShiftRow[]);
    } catch (err) {
      console.error('Error fetching shifts:', err);
      setFetchError((prev) => prev || 'Could not load shifts');
      setShifts([]);
    }

    try {
      const torData = await fetchTimeOffRequests();
      setTimeOffRequests(torData as TimeOffRequest[]);
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
      setShifts(shiftsData as ShiftRow[]);
    } catch (err) {
      console.error('Error refreshing shifts:', err);
    }
  }, [monthRange]);

  useEffect(() => {
    if (STAFF_SHIFTS) fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!loading && staff.length > 0 && !selectedStaffId) {
      setSelectedStaffId(staff[0].id);
    }
  }, [loading, staff, selectedStaffId]);

  const filteredStaff = useMemo(() => {
    if (roleFilter === 'all') return staff;
    return staff.filter((s) => s.role === roleFilter);
  }, [staff, roleFilter]);

  const shiftsByDate = useMemo(() => {
    const map: Record<string, ShiftRow[]> = {};
    for (const s of shifts) {
      const key = s.shift_date;
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return map;
  }, [shifts]);

  const shiftCountsByMember = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of shifts) {
      counts[s.employee_id] = (counts[s.employee_id] || 0) + 1;
    }
    return counts;
  }, [shifts]);

  const ghostShiftsByDate = useMemo(() => {
    if (!templateOpen || !weekPattern.some(Boolean)) return {};
    const rows = expandPatternToShifts(weekPattern, monthRange.start, monthRange.end);
    const map: Record<string, ShiftRow[]> = {};
    for (const row of rows) {
      if (!map[row.dateStr]) map[row.dateStr] = [];
      map[row.dateStr].push({
        id: `ghost-${row.dateStr}`,
        employee_id: selectedStaffId || '',
        shift_date: row.dateStr,
        shift_type: row.shift_type,
        start_time: row.start_time,
        end_time: row.end_time,
      });
    }
    return map;
  }, [templateOpen, weekPattern, monthRange.start, monthRange.end, selectedStaffId]);

  const selectedStaffTimeOff = useMemo(() => {
    if (!selectedStaffId) return {} as Record<string, string>;
    return buildTimeOffDateMap(
      timeOffRequests,
      { staffId: selectedStaffId, statuses: ['approved', 'pending'] } as never,
    ) as Record<string, string>;
  }, [timeOffRequests, selectedStaffId]);

  const monthShiftCount = shifts.filter((s) => s.employee_id === selectedStaffId).length;
  const pendingTimeOff = timeOffRequests.filter((r) => r.status === 'pending');
  const previewCount = countPatternShifts(weekPattern, monthRange.start, monthRange.end);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  };

  const goToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setWeekAnchorDate(t);
  };

  const syncMonthToDate = (date: Date) => {
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

  const handleViewScheduleFromTimeOff = (staffId: string, startDate: string) => {
    setSelectedStaffId(staffId);
    setActiveTab('schedule');
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
      const supabase = getSupabase();
      for (const empId of targetIds) {
        const existingForEmp = shifts.filter(
          (s) => s.employee_id === empId && s.shift_date >= monthRange.start && s.shift_date <= monthRange.end,
        );
        const existingByDate: Record<string, ShiftRow[]> = {};
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
      setApplyMessage(
        `Applied ${created} shift${created !== 1 ? 's' : ''}${skipped ? ` · ${skipped} skipped (already scheduled)` : ''}`,
      );
      await fetchData();
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : 'Failed to apply schedule');
    } finally {
      setApplying(false);
    }
  };

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

  const executeClearMonth = async () => {
    const targetIds = resolveTargetIds();
    if (targetIds.length === 0) return;
    setShowClearConfirm(false);
    setApplying(true);
    try {
      const supabase = getSupabase();
      const toDelete = shifts.filter(
        (s) =>
          targetIds.includes(s.employee_id) &&
          s.shift_date >= monthRange.start &&
          s.shift_date <= monthRange.end,
      );
      for (const s of toDelete) {
        await supabase.rpc('delete_shift', { p_shift_id: s.id });
      }
      setApplyMessage(`Cleared ${toDelete.length} shift${toDelete.length !== 1 ? 's' : ''}`);
      await fetchData();
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : 'Failed to clear shifts');
    } finally {
      setApplying(false);
    }
  };

  const deleteShift = async (shiftId: string) => {
    const previous = shifts;
    setShifts((current) => current.filter((s) => s.id !== shiftId));
    try {
      const { error } = await getSupabase().rpc('delete_shift', { p_shift_id: shiftId });
      if (error) throw error;
    } catch (err) {
      console.error('Error deleting shift:', err);
      setShifts(previous);
    }
  };

  const openDay = async (dateStr: string) => {
    if (!selectedMember) return;
    setSelectedDay(dateStr);
    setDayDetailAppts([]);
    setDayDetailApptError('');
    setDayDetailLoading(true);
    setDayCustomStart('09:00');
    setDayCustomEnd('17:00');
    setDayDetailOpen(true);
    try {
      const { data, error } = await getSupabase().rpc('get_technician_appointments', {
        p_employee_id: selectedMember.id,
        p_start_date: dateStr,
        p_end_date: dateStr,
      });
      if (error) throw error;
      setDayDetailAppts((data as AppointmentRecord[]) || []);
    } catch (err) {
      console.error('Error loading day appointments:', err);
      setDayDetailApptError('Could not load appointments for this day');
    } finally {
      setDayDetailLoading(false);
    }
  };

  const addShiftToDay = async (
    dateStr: string,
    shiftType = 'morning',
    startTime?: string,
    endTime?: string,
  ) => {
    if (!selectedStaffId) return;
    const cfg = shiftConfig(shiftType);
    const tempId = `temp-${Date.now()}`;
    const optimisticShift: ShiftRow = {
      id: tempId,
      employee_id: selectedStaffId,
      shift_date: dateStr,
      shift_type: shiftType,
      start_time: startTime || cfg.defaultStart,
      end_time: endTime || cfg.defaultEnd,
    };

    setShifts((current) => [...current, optimisticShift]);
    try {
      const { error } = await getSupabase().rpc('create_shift', {
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

  const handleReviewTimeOff = async (requestId: string, status: 'approved' | 'rejected') => {
    if (!user?.id) return;
    await reviewTimeOffRequest(requestId, status, user.id);
    await fetchData();
  };

  const selectedDayShifts = selectedDay
    ? (shiftsByDate[selectedDay] || []).filter((s) => s.employee_id === selectedStaffId)
    : [];

  const clearTargetCount = resolveTargetIds().length;
  const applyTargetCount = resolveTargetIds().length;

  if (!STAFF_SHIFTS) {
    return (
      <StaffScreenLayout title="Staff Schedule">
        <Text style={styles.textSecondary}>Staff scheduling is not enabled.</Text>
      </StaffScreenLayout>
    );
  }

  if (loading && staff.length === 0) {
    return (
      <StaffScreenLayout title="Staff Schedule">
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <ActivityIndicator color={styles.tokens.goldStrong} />
          <Text style={[styles.textGold, { marginTop: 12, letterSpacing: 2, fontSize: 12 }]}>
            LOADING SCHEDULE...
          </Text>
        </View>
      </StaffScreenLayout>
    );
  }

  return (
    <StaffScreenLayout
      title="Staff Schedule"
      subtitle="View saved shifts on the calendar — use Bulk template when you need to fill a whole month"
      headerRight={
        <ScheduleTabToggle
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as 'schedule' | 'timeoff')}
          tabs={[
            { id: 'schedule', label: 'Calendar' },
            { id: 'timeoff', label: 'Time-Off', badge: pendingTimeOff.length },
          ]}
        />
      }
    >
      {fetchError ? <Text style={{ color: '#f87171', fontSize: 12, marginBottom: 12 }}>{fetchError}</Text> : null}

      {activeTab === 'schedule' ? (
        <View>
          <ScheduleTeamPicker
            filteredStaff={filteredStaff}
            selectedStaffId={selectedStaffId}
            roleFilter={roleFilter}
            shiftCountsByMember={shiftCountsByMember}
            onSelectStaff={(id) => {
              setSelectedStaffId(id);
              setSelectedDay(null);
            }}
            onRoleFilterChange={setRoleFilter}
          />

          {!selectedMember ? (
            <View
              style={[
                styles.card,
                { padding: 32, alignItems: 'center', borderStyle: 'dashed' },
              ]}
            >
              <Text style={styles.textSecondary}>Select a team member to view their schedule</Text>
            </View>
          ) : (
            <>
              <View
                style={[
                  styles.card,
                  {
                    padding: 16,
                    marginBottom: 16,
                    gap: 12,
                    borderColor: `${styles.tokens.goldStrong}33`,
                    backgroundColor: `${styles.tokens.goldStrong}0A`,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      backgroundColor: `${styles.tokens.goldStrong}22`,
                      borderWidth: 1,
                      borderColor: `${styles.tokens.goldStrong}44`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={[styles.textGold, { fontWeight: '600' }]}>
                      {getInitials(selectedMember.full_name)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.textPrimary, { fontSize: 16, fontWeight: '600' }]} numberOfLines={1}>
                      {selectedMember.full_name}
                    </Text>
                    <Text style={styles.textSecondary}>
                      {ROLE_LABELS[selectedMember.role as keyof typeof ROLE_LABELS]} · {monthShiftCount} shifts in{' '}
                      {getMonthLabel(viewYear, viewMonth)}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                  <CalendarViewToggle
                    view={calendarView}
                    onChange={(view) => {
                      setCalendarView(view);
                      if (view === 'week') {
                        setWeekAnchorDate(
                          new Date(
                            viewYear,
                            viewMonth,
                            selectedDay ? parseDateStr(selectedDay).getDate() : now.getDate(),
                          ),
                        );
                      }
                    }}
                  />
                  {calendarView === 'month' ? (
                    <>
                      <Pressable onPress={goPrevMonth} style={{ padding: 8 }}>
                        <Text style={{ color: styles.tokens.textSecondary, fontSize: 18 }}>‹</Text>
                      </Pressable>
                      <Text style={[styles.textPrimary, { fontWeight: '600', minWidth: 120, textAlign: 'center' }]}>
                        {getMonthLabel(viewYear, viewMonth)}
                      </Text>
                      <Pressable onPress={goNextMonth} style={{ padding: 8 }}>
                        <Text style={{ color: styles.tokens.textSecondary, fontSize: 18 }}>›</Text>
                      </Pressable>
                      {!isCurrentMonth ? (
                        <Pressable
                          onPress={goToday}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: `${styles.tokens.goldStrong}33`,
                          }}
                        >
                          <Text style={[styles.textGold, { fontSize: 12 }]}>Today</Text>
                        </Pressable>
                      ) : null}
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
                  <Pressable
                    onPress={() => setTemplateOpen((v) => !v)}
                    style={{
                      marginLeft: 'auto',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: templateOpen ? `${styles.tokens.goldStrong}66` : `${styles.tokens.goldStrong}44`,
                      backgroundColor: templateOpen ? `${styles.tokens.goldStrong}22` : 'transparent',
                    }}
                  >
                    <Text style={[styles.textGold, { fontSize: 12 }]}>
                      Bulk template {templateOpen ? '▴' : '▾'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {templateOpen ? (
                <View
                  style={[
                    styles.card,
                    {
                      padding: 16,
                      marginBottom: 16,
                      borderStyle: 'dashed',
                      borderColor: `${styles.tokens.goldStrong}44`,
                      gap: 16,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View
                      style={{
                        borderWidth: 1,
                        borderColor: `${styles.tokens.goldStrong}44`,
                        borderRadius: 999,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={[styles.textGold, { fontSize: 10, fontWeight: '700', letterSpacing: 1 }]}>
                        DRAFT
                      </Text>
                    </View>
                    <Text style={[styles.textPrimary, { fontWeight: '500' }]}>Bulk template</Text>
                  </View>
                  <WeeklyPatternBuilder
                    pattern={weekPattern}
                    onChange={savePattern}
                    onLoadRoleDefault={() =>
                      savePattern(patternFromRole(selectedMember.role))
                    }
                    roleLabel={ROLE_LABELS[selectedMember.role as keyof typeof ROLE_LABELS]}
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
                    onClear={() => setShowClearConfirm(true)}
                  />
                </View>
              ) : null}

              {calendarView === 'month' ? (
                <ScheduleCalendar
                  monthGrid={monthGrid}
                  shiftsByDate={shiftsByDate}
                  selectedStaffId={selectedStaffId}
                  selectedDay={selectedDay}
                  onDayClick={openDay}
                  ghostShiftsByDate={ghostShiftsByDate}
                  timeOffByDate={selectedStaffTimeOff}
                  emptyMessage={`No shifts in ${getMonthLabel(viewYear, viewMonth)} — open Bulk template or tap a day to add one`}
                />
              ) : (
                <View style={[styles.card, { padding: 16 }]}>
                  <Text style={[styles.textPrimary, { fontWeight: '500', marginBottom: 12 }]}>Week overview</Text>
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
                </View>
              )}
            </>
          )}
        </View>
      ) : null}

      {activeTab === 'timeoff' ? (
        <TimeOffTab
          variant="manager"
          requests={timeOffRequests}
          onReview={handleReviewTimeOff}
          onViewSchedule={handleViewScheduleFromTimeOff}
        />
      ) : null}

      <AppModal open={dayDetailOpen} onClose={() => setDayDetailOpen(false)} scrollBody>
        <DayDetailPanel
          mode="edit"
          selectedDay={selectedDay}
          shifts={selectedDayShifts}
          appointments={dayDetailAppts}
          appointmentsLoading={dayDetailLoading}
          appointmentsError={dayDetailApptError}
          onClose={() => setDayDetailOpen(false)}
          onDeleteShift={deleteShift}
          onAddShift={addShiftToDay}
          onOpenCustomModal={() => setShowDayCustomModal(true)}
        />
      </AppModal>

      <CustomShiftTimeModal
        open={showDayCustomModal}
        title="Add custom shift"
        startTime={dayCustomStart}
        endTime={dayCustomEnd}
        saveLabel="Add shift"
        onSave={(start, end) => {
          setDayCustomStart(start);
          setDayCustomEnd(end);
          if (selectedDay) addShiftToDay(selectedDay, 'custom', start, end);
          setShowDayCustomModal(false);
        }}
        onClose={() => setShowDayCustomModal(false)}
      />

      <AppModal
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="Clear month shifts?"
        footer={
          <>
            <ModalButton label="Cancel" onPress={() => setShowClearConfirm(false)} />
            <ModalButton label={applying ? 'Clearing…' : 'Clear shifts'} variant="danger" onPress={executeClearMonth} disabled={applying} />
          </>
        }
      >
        <Text style={styles.textSecondary}>
          Clear all shifts in {getMonthLabel(viewYear, viewMonth)} for {clearTargetCount} team member
          {clearTargetCount !== 1 ? 's' : ''}? This cannot be undone.
        </Text>
      </AppModal>

      <AppModal
        open={showApplyConfirm}
        onClose={() => setShowApplyConfirm(false)}
        title="Apply bulk schedule?"
        footer={
          <>
            <ModalButton label="Cancel" onPress={() => setShowApplyConfirm(false)} />
            <ModalButton
              label={applying ? 'Applying…' : 'Confirm apply'}
              variant="primary"
              onPress={executeApplyPattern}
              disabled={applying}
            />
          </>
        }
      >
        <Text style={styles.textSecondary}>
          This will {replaceExisting ? 'replace existing shifts and ' : ''}apply the template to {applyTargetCount}{' '}
          team member{applyTargetCount !== 1 ? 's' : ''} for {getMonthLabel(viewYear, viewMonth)}. Review the calendar
          preview before confirming.
        </Text>
      </AppModal>
    </StaffScreenLayout>
  );
}
