import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { TIME_OFF_REQUESTS } from '@nail-couture/shared/constants/featureFlags.js';
import {
  fetchStaffShifts,
  fetchTechnicianAppointments,
  fetchTimeOffRequests,
  submitTimeOffRequest,
} from '@nail-couture/shared/utils/staffSchedule.js';
import {
  buildTimeOffDateMap,
  formatWeekRange,
  getWeekDates,
  toDateStr,
} from '@nail-couture/shared/utils/scheduleUtils.js';
import { useAuth } from '../../contexts/AuthContext';
import { AppModal } from '../../components/AppModal';
import { StaffScreenLayout } from '../../components/staff/StaffScreenLayout';
import { DayDetailPanel } from '../../components/staff/schedule/DayDetailPanel';
import { ScheduleTabToggle } from '../../components/staff/schedule/ScheduleTabToggle';
import { ScheduleWeekNav } from '../../components/staff/schedule/ScheduleWeekNav';
import { TimeOffTab, type RequestForm, type TimeOffRequest } from '../../components/staff/schedule/TimeOffTab';
import { WeekGrid } from '../../components/staff/schedule/WeekGrid';
import type { ShiftRecord } from '../../components/staff/schedule/ShiftChip';
import { useThemeStyles } from '../../theme/useThemeStyles';

export function EmployeeScheduleView() {
  const { user } = useAuth();
  const styles = useThemeStyles();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [appointments, setAppointments] = useState<
    { id: string; customer_name?: string; service_name?: string; appointment_time?: string; status?: string }[]
  >([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'schedule' | 'timeoff'>('schedule');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailDate, setDetailDate] = useState<Date | null>(null);
  const [detailShifts, setDetailShifts] = useState<ShiftRecord[]>([]);
  const [detailAppts, setDetailAppts] = useState<
    { id: string; customer_name?: string; service_name?: string; appointment_time?: string; status?: string }[]
  >([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState<RequestForm>({ startDate: '', endDate: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  const weekStart = toDateStr(weekDates[0]);
  const weekEnd = toDateStr(weekDates[6]);
  const todayStr = toDateStr(new Date());

  const shiftsByDate = useMemo(() => {
    const map: Record<string, ShiftRecord[]> = {};
    for (const shift of shifts) {
      const key = (shift as ShiftRecord & { shift_date?: string }).shift_date;
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(shift);
    }
    return map;
  }, [shifts]);

  const timeOffByDate = useMemo(
    () =>
      buildTimeOffDateMap(timeOffRequests, {
        staffId: user?.id,
        statuses: ['approved', 'pending'],
      }) as Record<string, string>,
    [timeOffRequests, user?.id],
  );

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [shiftRows, apptRows, torRows] = await Promise.all([
        fetchStaffShifts(user.id, weekStart, weekEnd),
        fetchTechnicianAppointments(user.id, weekStart, weekEnd),
        TIME_OFF_REQUESTS ? fetchTimeOffRequests({ staffId: user.id }) : Promise.resolve([]),
      ]);
      setShifts(shiftRows as ShiftRecord[]);
      setAppointments(apptRows);
      setTimeOffRequests(torRows as TimeOffRequest[]);
    } catch (err) {
      console.error('Error loading schedule:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, weekStart, weekEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const openDayDetails = (_dateObj: Date, dateIso: string) => {
    const dayShifts = shiftsByDate[dateIso] || [];
    const dayAppts = appointments.filter((a) => a.appointment_time?.split('T')[0] === dateIso);
    setDetailDate(_dateObj);
    setDetailShifts(dayShifts);
    setDetailAppts(dayAppts);
    setDetailOpen(true);
  };

  const handleSubmitTimeOff = async () => {
    if (!user?.id) return;
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
      await submitTimeOffRequest(
        user.id,
        requestForm.startDate,
        requestForm.endDate,
        requestForm.reason,
      );
      setFormSuccess('Time-off request submitted for manager review');
      setRequestForm({ startDate: '', endDate: '', reason: '' });
      setShowRequestForm(false);
      await fetchData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <StaffScreenLayout title="My Schedule">
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
      title="My Schedule"
      subtitle="Your assigned shifts and appointments for the week"
      headerRight={
        TIME_OFF_REQUESTS ? (
          <ScheduleTabToggle
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab as 'schedule' | 'timeoff')}
            tabs={[
              { id: 'schedule', label: 'Shifts' },
              { id: 'timeoff', label: 'Time Off' },
            ]}
          />
        ) : undefined
      }
    >
      {activeTab === 'schedule' ? (
        <>
          <View style={{ marginBottom: 16 }}>
            <ScheduleWeekNav
              label={formatWeekRange(weekDates)}
              onPrev={handlePrevWeek}
              onNext={handleNextWeek}
              onToday={() => setCurrentDate(new Date())}
            />
          </View>
          <WeekGrid
            weekDates={weekDates}
            mode="employee"
            shiftsByDate={shiftsByDate}
            timeOffByDate={timeOffByDate}
            appointments={appointments}
            onDayClick={openDayDetails}
            todayStr={todayStr}
          />
        </>
      ) : null}

      {activeTab === 'timeoff' && TIME_OFF_REQUESTS ? (
        <TimeOffTab
          variant="employee"
          requests={timeOffRequests}
          showRequestForm={showRequestForm}
          onToggleForm={() => {
            setShowRequestForm((v) => !v);
            setFormError('');
            setFormSuccess('');
          }}
          requestForm={requestForm}
          onFormChange={setRequestForm}
          onSubmit={handleSubmitTimeOff}
          submitting={submitting}
          formError={formError}
          formSuccess={formSuccess}
        />
      ) : null}

      <AppModal open={detailOpen} onClose={() => setDetailOpen(false)} scrollBody>
        <DayDetailPanel
          mode="read"
          selectedDay={detailDate}
          shifts={detailShifts}
          appointments={detailAppts}
          onClose={() => setDetailOpen(false)}
        />
      </AppModal>
    </StaffScreenLayout>
  );
}
