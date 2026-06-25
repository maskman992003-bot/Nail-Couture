import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getHomePath, STAFF_ROLES } from '@nail-couture/shared/utils/routes';
import { getDateRangeForPreset } from '@nail-couture/shared/utils/activityDateRange';
import {
  fetchStaffCustomerReviews,
  fetchTechnicianReviews,
  moderateCustomerReview,
  publishCustomerReview,
} from '@nail-couture/shared/utils/customerReviewService';
import Sidebar from './Sidebar';
import ThemeSelect from './ThemeSelect';
import AppModal, { modalBtnDanger, modalBtnSecondary } from './AppModal';
import ReviewSummaryBadge from './reviews/ReviewSummaryBadge';
import ReviewsList from './reviews/ReviewsList';
import ListPagination from './ListPagination.jsx';
import { REVIEWS_PAGE_SIZE } from '@nail-couture/shared/utils/pagination.js';

const MANAGEMENT_ROLES = ['super_admin', 'owner', 'partner', 'admin'];
const EXECUTIVE_ROLES = ['super_admin', 'owner', 'partner'];

const DATE_PRESETS = [
  { id: 'all', label: 'All time' },
  { id: 'today', label: 'Today' },
  { id: '7_days', label: 'Last 7 days' },
  { id: '30_days', label: 'Last 30 days' },
  { id: 'custom', label: 'Custom' },
];

export default function StaffReviews() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ avgRating: null, reviewCount: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [technicians, setTechnicians] = useState([]);
  const [technicianFilter, setTechnicianFilter] = useState('');
  const [moderatingReviewId, setModeratingReviewId] = useState(null);
  const [publishingReviewId, setPublishingReviewId] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [filtersClientSide, setFiltersClientSide] = useState(false);
  const [datePreset, setDatePreset] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewToDelete, setReviewToDelete] = useState(null);

  const role = user?.role;
  const isTechnician = role === 'technician';
  const canModerate = MANAGEMENT_ROLES.includes(role);
  const canPublish = MANAGEMENT_ROLES.includes(role);
  const canViewHidden = EXECUTIVE_ROLES.includes(role);
  const canFilterTechnician = !isTechnician;

  const dateRange = useMemo(
    () => getDateRangeForPreset(datePreset, customStart, customEnd),
    [datePreset, customStart, customEnd],
  );

  const pageTitle = isTechnician ? 'My Reviews' : 'Customer Reviews';
  const pageSubtitle = isTechnician
    ? 'Feedback from your completed visits'
    : 'Salon-wide ratings and client comments';

  const technicianOptions = useMemo(
    () => [
      { value: '', label: 'All technicians' },
      ...technicians.map((tech) => ({
        value: tech.id,
        label: tech.full_name || 'Technician',
      })),
    ],
    [technicians],
  );

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!STAFF_ROLES.includes(user.role)) {
      navigate(getHomePath(user.role));
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!canFilterTechnician) return;
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'technician')
      .order('full_name')
      .then(({ data }) => setTechnicians(data || []));
  }, [canFilterTechnician]);

  const loadReviews = useCallback(async () => {
    if (!user?.phone || !dateRange) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const query = {
      limit: REVIEWS_PAGE_SIZE,
      offset: (currentPage - 1) * REVIEWS_PAGE_SIZE,
      fromDate: dateRange.fromDate,
      toDate: dateRange.toDate,
      search: searchTerm.trim() || null,
      includeHidden: canViewHidden,
    };

    try {
      let result;
      if (isTechnician && user.id) {
        result = await fetchTechnicianReviews(user.id, {
          ...query,
          callerPhone: user.phone,
        });
      } else {
        result = await fetchStaffCustomerReviews(user.phone, {
          ...query,
          technicianId: technicianFilter || null,
        });
      }

      if (result.available) {
        setLoadError(result.error ? result.error.message || 'Could not load reviews.' : null);
        setFiltersClientSide(Boolean(result.filtersClientSide));
        setSummary(result.summary || { avgRating: null, reviewCount: 0 });
        setReviews(result.reviews || []);
        const total = result.summary?.reviewCount ?? result.totalCount ?? 0;
        const maxPage = Math.max(1, Math.ceil(total / REVIEWS_PAGE_SIZE));
        if (currentPage > maxPage) {
          setCurrentPage(maxPage);
        }
      } else {
        setLoadError('Reviews are not set up yet. Run migrations 063–066 in Supabase SQL Editor.');
        setFiltersClientSide(false);
        setSummary({ avgRating: null, reviewCount: 0 });
        setReviews([]);
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
      setLoadError('Could not load reviews. Try again or check your connection.');
      setReviews([]);
      setSummary({ avgRating: null, reviewCount: 0 });
    } finally {
      setLoading(false);
    }
  }, [user?.phone, user?.id, isTechnician, technicianFilter, dateRange, searchTerm, canViewHidden, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [datePreset, customStart, customEnd, technicianFilter, searchTerm]);

  useEffect(() => {
    if (!dateRange || !user?.phone) return;
    loadReviews();
  }, [dateRange, user?.phone, technicianFilter, searchTerm, currentPage, loadReviews]);

  const reviewsPagination = useMemo(() => ({
    currentPage,
    totalPages: Math.max(1, Math.ceil((summary.reviewCount || 0) / REVIEWS_PAGE_SIZE)),
  }), [currentPage, summary.reviewCount]);

  const handleModerate = async (review, action) => {
    if (!user?.phone || !canModerate) return;
    setModeratingReviewId(review.id);
    const { error, available } = await moderateCustomerReview(user.phone, review.id, action);
    if (available && !error) {
      if (action === 'delete' || (action === 'hide' && !canViewHidden)) {
        setReviews((prev) => prev.filter((r) => r.id !== review.id));
        setSummary((prev) => ({
          ...prev,
          reviewCount: Math.max(0, (prev.reviewCount || 0) - 1),
        }));
      } else if (action === 'hide') {
        setReviews((prev) =>
          prev.map((r) => (r.id === review.id ? { ...r, is_hidden: true, is_published: false } : r)),
        );
      } else if (action === 'unhide') {
        setReviews((prev) =>
          prev.map((r) => (r.id === review.id ? { ...r, is_hidden: false } : r)),
        );
      }
      await loadReviews();
    }
    setModeratingReviewId(null);
  };

  const handlePublish = async (review, action = 'publish') => {
    if (!user?.phone || !canPublish) return;
    setPublishingReviewId(review.id);
    const { error, available, data } = await publishCustomerReview(user.phone, review.id, action);
    if (available && !error) {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === review.id
            ? {
                ...r,
                is_published: action === 'publish',
                published_at: data?.published_at ?? (action === 'publish' ? new Date().toISOString() : null),
              }
            : r,
        ),
      );
    }
    setPublishingReviewId(null);
  };

  const handleConfirmDelete = async () => {
    if (!reviewToDelete) return;
    const review = reviewToDelete;
    setReviewToDelete(null);
    await handleModerate(review, 'delete');
  };

  const emptyMessage = useMemo(() => {
    if (datePreset === 'custom' && !dateRange) return 'Select a start and end date to load reviews.';
    if (searchTerm.trim()) return 'No reviews match your search for this period.';
    if (datePreset === 'all') {
      if (isTechnician) return 'No reviews yet. Feedback appears here after clients rate completed visits.';
      if (technicianFilter) return 'No reviews for this technician yet.';
      return 'No customer reviews yet. They appear here after clients submit post-visit feedback.';
    }
    if (isTechnician) return 'No reviews for this period yet. Try All time or Last 30 days.';
    if (technicianFilter) return 'No reviews for this technician in this period. Try All time or a wider date range.';
    if (datePreset === 'today') return 'No reviews today. Try All time or Last 30 days.';
    return 'No reviews for this period. Try All time or a wider date range.';
  }, [isTechnician, technicianFilter, searchTerm, datePreset, dateRange]);

  return (
    <div className="min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 bg-primary text-primary">
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 mobile-page space-y-6">
        <div>
          <h1 className="font-heading text-3xl text-gold">{pageTitle}</h1>
          <p className="text-secondary text-sm mt-1">{pageSubtitle}</p>
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
                placeholder="Search client, phone, service, comment…"
                className="w-full pl-9 pr-4 py-2.5 bg-input border-input border rounded-xl text-primary text-sm placeholder-text-muted focus:border-gold focus:outline-none"
              />
            </div>

            {canFilterTechnician && (
              <ThemeSelect
                value={technicianFilter}
                onChange={setTechnicianFilter}
                options={technicianOptions}
                className="min-w-[160px]"
              />
            )}
          </div>

          {datePreset === 'custom' && !dateRange && (
            <p className="text-secondary text-sm">Select a start and end date to load reviews.</p>
          )}

          {loadError && (
            <p className="text-amber-300/90 text-sm bg-amber-900/20 border border-amber-700/40 rounded-lg px-3 py-2">
              {loadError}
            </p>
          )}

          {filtersClientSide && !loadError && (
            <p className="text-secondary text-sm bg-input border border-light rounded-lg px-3 py-2">
              Date filters are limited until migration{' '}
              <code className="text-gold text-xs">066_reviews_date_filters.sql</code>{' '}
              is applied in Supabase. Try &ldquo;Last 30 days&rdquo; if today looks empty.
            </p>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-light">
            <ReviewSummaryBadge
              avgRating={summary.avgRating}
              reviewCount={summary.reviewCount}
              size="md"
            />
            {!loading && dateRange && (
              <p className="text-secondary text-sm">
                {summary.reviewCount} review{summary.reviewCount !== 1 ? 's' : ''}
                {searchTerm.trim()
                  ? ' matching search'
                  : datePreset === 'all'
                    ? ' total'
                    : ' in this period'}
              </p>
            )}
          </div>

          {loading ? (
            <p className="text-secondary text-center py-12">Loading reviews…</p>
          ) : !dateRange ? null : reviews.length === 0 ? (
            <p className="text-secondary text-center py-12">{emptyMessage}</p>
          ) : (
            <>
              <ReviewsList
                reviews={reviews}
                showService
                showTechnician={!isTechnician}
                emptyMessage={emptyMessage}
                canModerate={canModerate}
                onModerate={handleModerate}
                moderatingId={moderatingReviewId}
                canPublish={canPublish}
                onPublish={handlePublish}
                publishingId={publishingReviewId}
                onDeleteRequest={canModerate ? setReviewToDelete : undefined}
              />
              <ListPagination pagination={reviewsPagination} onPageChange={setCurrentPage} className="mt-4" />
            </>
          )}
        </div>
      </div>

      <AppModal
        open={Boolean(reviewToDelete)}
        onClose={() => setReviewToDelete(null)}
        title="Delete review?"
        subtitle="This action cannot be undone."
        maxWidth="max-w-md"
        footer={
          <>
            <button type="button" onClick={() => setReviewToDelete(null)} className={modalBtnSecondary}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={moderatingReviewId === reviewToDelete?.id}
              className={modalBtnDanger}
            >
              {moderatingReviewId === reviewToDelete?.id ? 'Deleting…' : 'Delete review'}
            </button>
          </>
        }
      >
        <p className="text-secondary text-sm">
          Permanently remove this review from{' '}
          <span className="text-primary font-medium">{reviewToDelete?.customer_name || 'this customer'}</span>
          {reviewToDelete?.service_name ? (
            <>
              {' '}
              for <span className="text-primary font-medium">{reviewToDelete.service_name}</span>
            </>
          ) : null}
          ?
        </p>
        {reviewToDelete?.comment ? (
          <p className="text-secondary text-sm mt-3 italic border-l-2 border-gold/30 pl-3">
            &ldquo;{reviewToDelete.comment}&rdquo;
          </p>
        ) : null}
      </AppModal>
    </div>
  );
}
