import clsx from 'clsx';
import { useTheme } from '../../contexts/ThemeContext';
import { formatReviewDate } from '@nail-couture/shared/utils/customerReviewService';
import StarRatingDisplay from './StarRatingDisplay';

export default function ReviewsList({
  reviews = [],
  emptyMessage = 'No reviews yet.',
  showCustomerName = true,
  showService = false,
  showTechnician = false,
  hiddenBadgeLabel = 'Hidden',
  canModerate = false,
  onModerate,
  moderatingId = null,
  canPublish = false,
  onPublish,
  onDeleteRequest,
}) {
  const { theme } = useTheme();

  const cardClass = clsx(
    'rounded-xl p-4 border',
    theme === 'dark' ? 'bg-offwhite/5 border-white/10' : 'bg-charcoal/5 border-charcoal/10',
  );

  const nameClass = theme === 'dark' ? 'text-offwhite font-medium text-sm' : 'text-charcoal font-medium text-sm';
  const metaClass = theme === 'dark' ? 'text-offwhite/40 text-xs' : 'text-charcoal/40 text-xs';
  const commentClass = theme === 'dark' ? 'text-offwhite/70 text-sm mt-2' : 'text-charcoal/70 text-sm mt-2';

  if (!reviews.length) {
    return (
      <p className={clsx('text-center py-6 text-sm', theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40')}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => {
        const hidden = Boolean(review.is_hidden);
        return (
          <div
            key={review.id}
            className={clsx(cardClass, hidden && 'opacity-60 border-dashed')}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  {showCustomerName && (
                    <div className={nameClass}>{review.customer_name || 'Customer'}</div>
                  )}
                  {hidden && (
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-500/40 text-amber-400">
                      {hiddenBadgeLabel}
                    </span>
                  )}
                </div>
                <div className={metaClass}>{formatReviewDate(review.created_at)}</div>
              </div>
              <StarRatingDisplay rating={review.rating} size="md" />
            </div>
            {showService && review.service_name && (
              <div className={clsx('text-xs mt-1', theme === 'dark' ? 'text-gold/70' : 'text-gold')}>
                {review.service_name}
              </div>
            )}
            {showTechnician && review.technician_name && (
              <div className={clsx('text-xs mt-1', theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50')}>
                with {review.technician_name}
              </div>
            )}
            {review.comment && <p className={commentClass}>{review.comment}</p>}
            {(canModerate || canPublish) && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gold/10">
                {canModerate && onModerate && (
                  <>
                    <button
                      type="button"
                      disabled={moderatingId === review.id}
                      onClick={() => onModerate(review, hidden ? 'unhide' : 'hide')}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gold/30 text-gold hover:bg-gold/10 disabled:opacity-50"
                    >
                      {moderatingId === review.id ? 'Saving…' : hidden ? 'Unhide' : 'Hide'}
                    </button>
                    <button
                      type="button"
                      disabled={moderatingId === review.id}
                      onClick={() => {
                        if (onDeleteRequest) {
                          onDeleteRequest(review);
                          return;
                        }
                        if (window.confirm('Permanently delete this review? This cannot be undone.')) {
                          onModerate(review, 'delete');
                        }
                      }}
                      className="px-3 py-1.5 text-xs rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </>
                )}
                {canPublish && onPublish && (
                  <button
                    type="button"
                    onClick={() => onPublish(review)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                  >
                    Publish
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
