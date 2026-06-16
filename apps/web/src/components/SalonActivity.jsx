import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import ThemeSelect from './ThemeSelect';
import clsx from 'clsx';
import { getCustomersPath, getCustomerDetailPath } from '@nail-couture/shared/utils/routes';
import { fetchGlobalVisitHistory } from '@nail-couture/shared/utils/customerStats';
import { fetchGlobalTimeline } from '@nail-couture/shared/utils/staffCustomerTimeline';
import { getDateRangeForPreset } from '@nail-couture/shared/utils/activityDateRange';
import { enrichVisits } from '@nail-couture/shared/utils/visitEnrichment';
import { parseVisitFinalServices } from '@nail-couture/shared/utils/appointmentServiceHistory';
import { canViewGlobalVisitHistory } from '@nail-couture/shared/utils/staffCustomerAccess';
import { formatTimelineDate } from './TimelineEventRow';
import VirtualizedTimelineList from './VirtualizedTimelineList';
import { VisitHistoryDetail } from './StaffCustomerDetail';

const PAGE_SIZE = 50;

const DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: '7_days', label: 'Last 7 days' },
  { id: '30_days', label: 'Last 30 days' },
  { id: 'custom', label: 'Custom' },
];

const EVENT_TYPES = [
  { id: 'visit', label: 'Visits' },
  { id: 'payment', label: 'Payments' },
  { id: 'service_change', label: 'Service changes' },
  { id: 'note', label: 'Notes' },
  { id: 'loyalty', label: 'Loyalty' },
  { id: 'photo', label: 'Photos' },
  { id: 'waiver', label: 'Waivers' },
  { id: 'all', label: 'All events' },
];

const VISIT_STATUS = {
  waiting: { label: 'Waiting', color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50' },
  assigned_pending: { label: 'Assigned', color: 'bg-blue-900/50 text-blue-300 border-blue-700/50' },
  serving: { label: 'In Chair', color: 'bg-green-900/50 text-green-300 border-green-700/50' },
  ready_for_checkout: { label: 'At Checkout', color: 'bg-amber-900/50 text-amber-300 border-amber-700/50' },
  completed: { label: 'Completed', color: 'bg-green-800/40 text-green-300 border-green-700/30' },
  cancelled: { label: 'Cancelled', color: 'bg-red-900/50 text-red-300 border-red-700/50' },
  pending: { label: 'Pending', color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-900/50 text-blue-300 border-blue-700/50' },
  in_progress: { label: 'In Progress', color: 'bg-green-900/50 text-green-300 border-green-700/50' },
};

const TABS = [
  { id: 'timeline', label: 'Activity timeline' },
  { id: 'history', label: 'Visit history' },
];

function matchesSearch(customer, term, termDigits) {
  if (!customer) return false;
  const name = (customer.full_name || '').toLowerCase();
  const email = (customer.email || '').toLowerCase();
  const phone = (customer.phone || '').toLowerCase();
  const phoneDigits = (customer.phone || '').replace(/\D/g, '');
  return name.includes(term)
    || email.includes(term)
    || phone.includes(term)
    || (termDigits.length >= 3 && phoneDigits.includes(termDigits));
}

export default function SalonActivity() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('timeline');
  const [datePreset, setDatePreset] = useState('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('visit');

  const [timeline, setTimeline] = useState([]);
  const [timelineCursor, setTimelineCursor] = useState(null);
  const [timelineHasMore, setTimelineHasMore] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineLoadingMore, setTimelineLoadingMore] = useState(false);

  const [visits, setVisits] = useState([]);
  const [visitsCursor, setVisitsCursor] = useState(null);
  const [visitsHasMore, setVisitsHasMore] = useState(false);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [visitsLoadingMore, setVisitsLoadingMore] = useState(false);
  const [expandedVisitId, setExpandedVisitId] = useState(null);

  const dateRange = useMemo(
    () => getDateRangeForPreset(datePreset, customStart, customEnd),
    [datePreset, customStart, customEnd],
  );

  const filteredTimeline = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const termDigits = term.replace(/\D/g, '');
    return timeline.filter((event) => {
      if (eventTypeFilter !== 'all' && event.type !== eventTypeFilter) return false;
      if (!term) return true;
      return matchesSearch(event.customer, term, termDigits);
    });
  }, [timeline, searchTerm, eventTypeFilter]);

  const filteredVisits = useMemo(() => {
    const sorted = [...visits].sort((a, b) => new Date(b.visitAt) - new Date(a.visitAt));
    const term = searchTerm.trim().toLowerCase();
    const termDigits = term.replace(/\D/g, '');
    if (!term) return sorted;
    return sorted.filter((visit) => matchesSearch(visit.customer, term, termDigits));
  }, [visits, searchTerm]);

  const loadTimeline = useCallback(async ({ append = false, cursor = null } = {}) => {
    if (!dateRange) return;
    if (append) setTimelineLoadingMore(true);
    else setTimelineLoading(true);

    try {
      const result = await fetchGlobalTimeline({
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
        limit: PAGE_SIZE,
        cursor: append ? cursor : null,
      });
      setTimeline((prev) => (append ? [...prev, ...result.events] : result.events));
      setTimelineCursor(result.nextCursor);
      setTimelineHasMore(result.hasMore);
    } catch (err) {
      console.error('Failed to load salon timeline:', err);
      if (!append) setTimeline([]);
    } finally {
      setTimelineLoading(false);
      setTimelineLoadingMore(false);
    }
  }, [dateRange]);

  const loadVisits = useCallback(async ({ append = false, cursor = null } = {}) => {
    if (!dateRange) return;
    if (append) setVisitsLoadingMore(true);
    else setVisitsLoading(true);

    try {
      const result = await fetchGlobalVisitHistory({
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
        includeOnline: true,
        limit: PAGE_SIZE,
        cursor: append ? cursor : null,
      });
      const enriched = await enrichVisits(result.rows);
      enriched.sort((a, b) => new Date(b.visitAt) - new Date(a.visitAt));
      setVisits((prev) => (append ? [...prev, ...enriched] : enriched));
      setVisitsCursor(result.nextCursor);
      setVisitsHasMore(result.hasMore);
    } catch (err) {
      console.error('Failed to load salon visit history:', err);
      if (!append) setVisits([]);
    } finally {
      setVisitsLoading(false);
      setVisitsLoadingMore(false);
    }
  }, [dateRange]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!canViewGlobalVisitHistory(user.role)) {
      navigate(getCustomersPath(user.role));
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!dateRange || !user || !canViewGlobalVisitHistory(user.role)) return;
    if (activeTab === 'timeline') {
      loadTimeline();
    } else {
      loadVisits();
    }
  }, [activeTab, dateRange, user, loadTimeline, loadVisits]);

  const handleLoadMoreTimeline = () => {
    if (!timelineHasMore || timelineLoadingMore || !timelineCursor) return;
    loadTimeline({ append: true, cursor: timelineCursor });
  };

  const handleLoadMoreVisits = () => {
    if (!visitsHasMore || visitsLoadingMore || !visitsCursor) return;
    loadVisits({ append: true, cursor: visitsCursor });
  };

  return (
    <div className="min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 bg-primary text-primary">
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl text-gold">Salon activity</h1>
            <p className="text-secondary text-sm mt-1">All-customer timeline and visit history</p>
          </div>
          <Link
            to={getCustomersPath(user?.role)}
            className="text-secondary text-sm hover:text-gold transition-colors"
          >
            ← Back to customers
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-heading uppercase tracking-wider border transition-colors',
                activeTab === tab.id
                  ? 'bg-gold/15 border-gold text-gold'
                  : 'border-light text-secondary hover:border-gold/40',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-secondary border-card rounded-xl border p-4 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setDatePreset(preset.id)}
                  className={clsx(
                    'px-3 py-2 rounded-lg text-sm border transition-colors',
                    datePreset === preset.id
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-light text-secondary hover:border-gold/30',
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {datePreset === 'custom' && (
              <div className="flex flex-wrap gap-3">
                <label className="text-secondary text-xs uppercase tracking-widest">
                  From
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-input border border-input rounded-lg text-primary text-sm"
                  />
                </label>
                <label className="text-secondary text-xs uppercase tracking-widest">
                  To
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-input border border-input rounded-lg text-primary text-sm"
                  />
                </label>
              </div>
            )}

            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 8a3 3 0 100 6 3 3 0 000-6z" />
              </svg>
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, phone, email…"
                className="w-full pl-9 pr-4 py-2.5 bg-input border-input border rounded-xl text-primary text-sm placeholder-text-muted focus:border-gold focus:outline-none"
              />
            </div>

            {activeTab === 'timeline' && (
              <ThemeSelect
                value={eventTypeFilter}
                onChange={setEventTypeFilter}
                options={EVENT_TYPES.map((type) => ({ value: type.id, label: type.label }))}
                className="min-w-[140px]"
              />
            )}
          </div>

          {datePreset === 'custom' && !dateRange && (
            <p className="text-secondary text-sm">Select a start and end date to load activity.</p>
          )}

          {activeTab === 'timeline' && (
            <div>
              <p className="text-secondary text-sm mb-4">
                {filteredTimeline.length} event{filteredTimeline.length !== 1 ? 's' : ''}
                {searchTerm.trim() || eventTypeFilter !== 'visit' ? ' matching filters' : ''}
              </p>
              {timelineLoading ? (
                <p className="text-secondary text-center py-12">Loading activity…</p>
              ) : filteredTimeline.length === 0 ? (
                <p className="text-secondary text-center py-12">No activity for this period</p>
              ) : (
                <>
                  <VirtualizedTimelineList events={filteredTimeline} profile={null} />
                  {timelineHasMore && !searchTerm.trim() && (
                    <div className="mt-4 text-center">
                      <button
                        type="button"
                        onClick={handleLoadMoreTimeline}
                        disabled={timelineLoadingMore}
                        className="px-6 py-2.5 rounded-xl border border-gold/40 text-gold text-sm font-heading uppercase tracking-wider hover:bg-gold/10 disabled:opacity-50"
                      >
                        {timelineLoadingMore ? 'Loading…' : 'Load more'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              {visitsLoading && visits.length === 0 ? (
                <p className="text-secondary text-center py-12">Loading visits…</p>
              ) : filteredVisits.length === 0 ? (
                <p className="text-secondary text-center py-12">
                  {visits.length === 0 ? 'No visits for this period' : 'No visits match your search'}
                </p>
              ) : (
                <>
                  <p className="text-secondary text-sm mb-4">
                    {filteredVisits.length} visit{filteredVisits.length !== 1 ? 's' : ''}
                    {searchTerm.trim() ? ' matching search' : ''}
                  </p>
                  <div className="space-y-3">
                    {filteredVisits.map((visit) => {
                      const statusCfg = VISIT_STATUS[visit.status];
                      const isExpanded = expandedVisitId === visit.id;
                      const summary = visit.serviceSummary;
                      const finalServices = summary?.finalServices || parseVisitFinalServices(visit);
                      const cardCustomer = visit.customer;
                      return (
                        <div key={visit.id} className="bg-secondary rounded-lg border border-light overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setExpandedVisitId(isExpanded ? null : visit.id)}
                            className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-gold/5 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-primary font-medium truncate">
                                {cardCustomer?.full_name || 'Customer'}
                              </div>
                              <div className="text-secondary text-sm mt-0.5">
                                {cardCustomer?.phone || '—'}
                                {cardCustomer?.email && (
                                  <span className="hidden sm:inline">{` · ${cardCustomer.email}`}</span>
                                )}
                              </div>
                              <div className="text-secondary text-xs mt-1">
                                {formatTimelineDate(visit.visitAt)}
                                {visit.technicians?.full_name && ` · ${visit.technicians.full_name}`}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-gold font-heading">${Number(visit.totalPrice).toFixed(2)}</span>
                              <span className={clsx('px-2 py-0.5 text-[10px] rounded-full border uppercase tracking-wider', statusCfg?.color || 'text-secondary border-light')}>
                                {statusCfg?.label || visit.status}
                              </span>
                              {cardCustomer?.id && (
                                <Link
                                  to={getCustomerDetailPath(user?.role, cardCustomer.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs text-gold hover:underline px-2"
                                >
                                  Profile
                                </Link>
                              )}
                            </div>
                          </button>
                          {isExpanded && (
                            <VisitHistoryDetail
                              visit={visit}
                              summary={summary}
                              finalServices={finalServices}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {visitsHasMore && !searchTerm.trim() && (
                    <div className="mt-4 text-center">
                      <button
                        type="button"
                        onClick={handleLoadMoreVisits}
                        disabled={visitsLoadingMore}
                        className="px-6 py-2.5 rounded-xl border border-gold/40 text-gold text-sm font-heading uppercase tracking-wider hover:bg-gold/10 disabled:opacity-50"
                      >
                        {visitsLoadingMore ? 'Loading…' : 'Load more'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
