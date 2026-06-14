import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useTheme } from '../../contexts/ThemeContext';
import { fetchFeaturedReviews, formatReviewDate } from '@nail-couture/shared/utils/customerReviewService';
import StarRatingDisplay from '../reviews/StarRatingDisplay';

export default function CustomerTestimonials({ className, limit = 9, showCta = true }) {
  const { theme } = useTheme();
  const [reviews, setReviews] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchFeaturedReviews(limit).then(({ reviews: rows, available }) => {
      if (available) setReviews(rows || []);
      setLoaded(true);
    });
  }, [limit]);

  if (!loaded || reviews.length === 0) return null;

  const cardClass = clsx(
    'rounded-2xl border p-6 h-full flex flex-col',
    theme === 'dark' ? 'border-gold/20 bg-offwhite/[0.03]' : 'border-gold/30 bg-white',
  );

  return (
    <section className={clsx('py-16 sm:py-20 px-4 sm:px-6', className, theme === 'dark' ? 'bg-charcoal' : 'bg-cream')}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[10px] uppercase tracking-[0.28em] text-gold mb-3">Client Love</p>
          <h2 className={clsx('font-heading text-3xl sm:text-4xl mb-3', theme === 'dark' ? 'text-offwhite' : 'text-charcoal')}>
            What Our Clients Say
          </h2>
          <p className={clsx('max-w-2xl mx-auto text-sm sm:text-base', theme === 'dark' ? 'text-offwhite/60' : 'text-charcoal/60')}>
            Real feedback from completed visits — shared with permission after checkout.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.map((review) => (
            <article key={review.id} className={cardClass}>
              <StarRatingDisplay rating={review.rating} size="md" className="mb-3" />
              <p className={clsx('text-sm leading-relaxed flex-1', theme === 'dark' ? 'text-offwhite/75' : 'text-charcoal/75')}>
                “{review.comment}”
              </p>
              <div className={clsx('mt-4 pt-4 border-t text-xs', theme === 'dark' ? 'border-white/10 text-offwhite/45' : 'border-charcoal/10 text-charcoal/45')}>
                <div className="font-medium text-gold">{review.customer_name || 'Verified client'}</div>
                <div>{review.service_name}{review.technician_name ? ` · ${review.technician_name}` : ''}</div>
                <div>{formatReviewDate(review.created_at)}</div>
              </div>
            </article>
          ))}
        </div>

        {showCta && (
          <div className="text-center mt-10">
            <Link
              to="/login"
              className="inline-block px-8 py-3 bg-gold text-charcoal font-heading text-sm rounded-xl hover:bg-gold/90 transition-colors"
            >
              Sign In to Share Your Experience
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
