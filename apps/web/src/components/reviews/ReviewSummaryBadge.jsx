import { formatReviewRating } from '@nail-couture/shared/utils/customerReviewService';
import StarRatingDisplay from './StarRatingDisplay';

export default function ReviewSummaryBadge({ avgRating, reviewCount, size = 'sm' }) {
  const count = Number(reviewCount) || 0;
  if (count === 0) {
    return (
      <span className="text-xs text-secondary italic">No reviews yet</span>
    );
  }

  const formatted = formatReviewRating(avgRating);

  return (
    <div className="inline-flex items-center gap-2 flex-wrap">
      <StarRatingDisplay rating={Number(formatted)} size={size} showValue />
      <span className="text-secondary text-xs">
        {count} review{count === 1 ? '' : 's'}
      </span>
    </div>
  );
}
