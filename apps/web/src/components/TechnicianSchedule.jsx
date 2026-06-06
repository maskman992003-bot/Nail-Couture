import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Sidebar from './Sidebar';
import DayDetailPanel from './schedule/DayDetailPanel';
import TimeOffTab from './schedule/TimeOffTab';
import ScheduleTabToggle from './schedule/ScheduleTabToggle';
import WeekGrid from './schedule/WeekGrid';
import { ScheduleWeekNav } from './schedule/CalendarViewToggle';
import { TIME_OFF_REQUESTS } from '@nail-couture/shared/constants/featureFlags';
import {
  fetchStaffShifts,
  fetchTechnicianAppointments,
  fetchTimeOffRequests,
  submitTimeOffRequest,
} from '@nail-couture/shared/utils/staffSchedule';
import {
  toDateStr,
  getWeekDates,
  formatWeekRange,
  buildTimeOffDateMap,
} from '@nail-couture/shared/utils/scheduleUtils';

export default function TechnicianSchedule() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'timeoff' && TIME_OFF_REQUESTS ? 'timeoff' : 'schedule';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
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

  const timeOffByDate = useMemo(
    () => buildTimeOffDateMap(timeOffRequests, { staffId: user?.id, statuses: ['approved', 'pending'] }),
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

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'timeoff' && TIME_OFF_REQUESTS) setActiveTab('timeoff');
    else if (tab !== 'timeoff') setActiveTab('schedule');
  }, [searchParams]);

  const setTab = (tab) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === 'timeoff') next.set('tab', 'timeoff');
    else next.delete('tab');
    setSearchParams(next, { replace: true });
  };

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

  const closeDetailModal = () => {
    setDetailModal({ open: false, date: null, dayShifts: [], dayAppts: [] });
  };

  const openDayDetails = (_dateObj, dateIso) => {
    const dayShifts = shiftsByDate[dateIso] || [];
    const dayAppts = appointments.filter((a) => a.appointment_time?.split('T')[0] === dateIso);
    setDetailModal({ open: true, date: _dateObj, dayShifts, dayAppts });
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
      <div className="technician-schedule min-h-screen w-full bg-primary text-primary pl-0 md:pl-20 lg:pl-64">
        <Sidebar />
        <div className="flex items-center justify-center py-24">
          <div className="text-gold animate-pulse tracking-widest text-sm">LOADING SCHEDULE...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="technician-schedule min-h-screen w-full bg-primary text-primary pl-0 md:pl-20 lg:pl-64">
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
              <ScheduleTabToggle
                activeTab={activeTab}
                onChange={setTab}
                tabs={[
                  { id: 'schedule', label: 'Shifts' },
                  { id: 'timeoff', label: 'Time Off' },
                ]}
              />
            )}

            {activeTab === 'schedule' && (
              <ScheduleWeekNav
                label={formatWeekRange(weekDates)}
                onPrev={handlePrevWeek}
                onNext={handleNextWeek}
                onToday={() => setCurrentDate(new Date())}
              />
            )}
          </div>
        </div>

        {activeTab === 'schedule' && (
          <WeekGrid
            weekDates={weekDates}
            mode="employee"
            shiftsByDate={shiftsByDate}
            timeOffByDate={timeOffByDate}
            appointments={appointments}
            onDayClick={openDayDetails}
            todayStr={todayStr}
          />
        )}

        {activeTab === 'timeoff' && TIME_OFF_REQUESTS && (
          <TimeOffTab
            variant="employee"
            requests={timeOffRequests}
            showRequestForm={showRequestForm}
            onToggleForm={() => { setShowRequestForm((v) => !v); setFormError(''); setFormSuccess(''); }}
            requestForm={requestForm}
            onFormChange={setRequestForm}
            onSubmit={handleSubmitTimeOff}
            submitting={submitting}
            formError={formError}
            formSuccess={formSuccess}
          />
        )}
      </div>

      <DayDetailPanel
        mode="read"
        asModal
        open={detailModal.open}
        selectedDay={detailModal.date}
        shifts={detailModal.dayShifts}
        appointments={detailModal.dayAppts}
        onClose={closeDetailModal}
      />

      <style>{`.technician-schedule input[type="date"] { color-scheme: ${theme}; }`}</style>
    </div>
  );
}
