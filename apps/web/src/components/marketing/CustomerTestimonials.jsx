import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useAppTheme } from '../../hooks/useAppTheme.js';
import { fetchFeaturedReviews, formatReviewDate } from '@nail-couture/shared/utils/customerReviewService';
import StarRatingDisplay from '../reviews/StarRatingDisplay';

export default function CustomerTestimonials({ className, limit = 9, showCta = true }) {
  const { themeConfig } = useAppTheme();
  const [reviews, setReviews] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchFeaturedReviews(limit).then(({ reviews: rows, available }) => {
      if (available) setReviews(rows || []);
      setLoaded(true);
    });
  }, [limit]);

  if (!loaded || reviews.length === 0) return null;

  const cardClass = 'rounded-2xl border p-6 h-full flex flex-col bg-card border-card';

  return (
    <section className={clsx('py-16 sm:py-20 px-4 sm:px-6 bg-primary', className)}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[10px] uppercase tracking-[0.28em] text-gold-strong mb-3">Client Love</p>
          <h2 className="font-heading text-3xl sm:text-4xl text-primary" style={{ fontFamily: themeConfig.fonts.heading }}>
            What Our Clients Say
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.map((review) => (
            <article key={review.id} className={cardClass}>
              <StarRatingDisplay rating={review.rating} size="md" className="mb-3" />
              <p className="text-sm leading-relaxed flex-1 text-secondary">
                “{review.comment}”
              </p>
              <div className="mt-4 pt-4 border-t border-theme text-xs text-muted">
                <div className="font-medium text-gold-strong">{review.customer_name || 'Verified client'}</div>
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
              className="inline-block px-8 py-3 bg-gold-strong text-primary font-heading text-sm rounded-xl hover:opacity-90 transition-colors"
            >
              Sign In to Share Your Experience
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
