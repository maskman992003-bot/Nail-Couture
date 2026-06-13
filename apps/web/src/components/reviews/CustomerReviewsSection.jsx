import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMyCustomerReviews } from '@nail-couture/shared/utils/customerReviewService';
import ReviewSummaryBadge from './ReviewSummaryBadge';
import ReviewsList from './ReviewsList';

const PAGE_SIZE = 20;

export default function CustomerReviewsSection({ callerPhone, theme, panelClass }) {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ avgRating: null, reviewCount: 0 });
  const [hasMore, setHasMore] = useState(false);
  const [available, setAvailable] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadReviews = useCallback(async ({ append = false, offset = 0 } = {}) => {
    if (!callerPhone) {
      setLoading(false);
      return;
    }
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const result = await fetchMyCustomerReviews(callerPhone, {
        limit: PAGE_SIZE,
        offset,
      });

      if (result.available) {
        setLoadError(result.error ? result.error.message || 'Could not load reviews.' : null);
        setSummary(result.summary || { avgRating: null, reviewCount: 0 });
        setReviews((prev) => (append ? [...prev, ...(result.reviews || [])] : result.reviews || []));
        setHasMore(Boolean(result.hasMore));
      } else if (!append) {
        setAvailable(false);
        setReviews([]);
        setSummary({ avgRating: null, reviewCount: 0 });
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load customer reviews:', err);
      if (!append) {
        setLoadError('Could not load your reviews. Try again later.');
        setReviews([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [callerPhone]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const headingClass = theme === 'dark' ? 'text-offwhite font-medium mb-1' : 'text-charcoal font-medium mb-1';
  const subClass = theme === 'dark' ? 'text-offwhite/50 text-sm mb-4' : 'text-charcoal/50 text-sm mb-4';

  if (loading) {
    return <p className="text-gold animate-pulse text-sm py-4">Loading your reviews…</p>;
  }

  if (!available) {
    return (
      <div className={panelClass}>
        <h3 className={headingClass}>My Reviews</h3>
        <p className={subClass}>
          Reviews are not set up yet. Run migration{' '}
          <code className="text-gold text-xs">071_customer_my_reviews_rpc.sql</code>{' '}
          in Supabase.
        </p>
      </div>
    );
  }

  return (
    <div className={`${panelClass} space-y-4`}>
      <div>
        <h3 className={headingClass}>My Reviews</h3>
        <p className={subClass}>Ratings and feedback you have left after salon visits.</p>
      </div>

      {loadError && (
        <p className="text-amber-300/90 text-sm bg-amber-900/20 border border-amber-700/40 rounded-lg px-3 py-2">
          {loadError}
        </p>
      )}

      {summary.reviewCount > 0 && (
        <ReviewSummaryBadge
          avgRating={summary.avgRating}
          reviewCount={summary.reviewCount}
          size="md"
        />
      )}

      <ReviewsList
        reviews={reviews}
        showCustomerName={false}
        showService
        showTechnician
        hiddenBadgeLabel="Not shown publicly"
        emptyMessage="You have not submitted any reviews yet. After a completed visit, leave one from Visit History."
      />

      {reviews.length === 0 && !loadError && (
        <Link
          to="/customer/history"
          className="inline-block text-gold text-sm font-medium hover:underline"
        >
          Go to Visit History →
        </Link>
      )}

      {hasMore && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => loadReviews({ append: true, offset: reviews.length })}
            disabled={loadingMore}
            className="px-6 py-2.5 rounded-xl border border-gold/40 text-gold text-sm font-heading uppercase tracking-wider hover:bg-gold/10 disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
