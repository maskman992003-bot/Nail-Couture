import { useState } from 'react';
import clsx from 'clsx';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { submitCustomerReview } from '@nail-couture/shared/utils/customerReviewService';
import { getSupabaseErrorMessage } from '@nail-couture/shared/utils/supabaseErrors';
import { modalBtnPrimary, modalBtnSecondary, modalTextareaClass } from '../AppModal';
import StarRatingInput from './StarRatingInput';

export default function ReviewForm({
  appointmentId,
  serviceName,
  technicianName,
  onSuccess,
  onCancel,
}) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const labelClass = theme === 'dark' ? 'text-offwhite/40 text-xs uppercase tracking-widest mb-2 block' : 'text-charcoal/40 text-xs uppercase tracking-widest mb-2 block';
  const contextClass = theme === 'dark' ? 'text-offwhite/70 text-sm' : 'text-charcoal/70 text-sm';
  const errorClass = 'text-red-400 text-sm mt-2';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.phone) {
      setError('Please sign in to submit a review.');
      return;
    }
    if (rating < 1) {
      setError('Please select a star rating.');
      return;
    }

    setSaving(true);
    setError('');

    const { data, error: submitError, available } = await submitCustomerReview(
      user.phone,
      appointmentId,
      rating,
      comment,
    );

    setSaving(false);

    if (!available) {
      setError('Reviews are not available yet. Please try again later.');
      return;
    }
    if (submitError) {
      setError(getSupabaseErrorMessage(submitError, 'Unable to submit review.'));
      return;
    }

    onSuccess?.(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className={clsx('rounded-xl p-4 border', theme === 'dark' ? 'border-gold/20 bg-offwhite/5' : 'border-gold/30 bg-charcoal/5')}>
        <div className={labelClass}>Your visit</div>
        <div className={contextClass}>
          <span className="font-heading text-gold">{serviceName || 'Service'}</span>
          {technicianName && (
            <>
              {' '}
              with <span className="font-medium">{technicianName}</span>
            </>
          )}
        </div>
      </div>

      <div>
        <label className={labelClass}>Rating</label>
        <StarRatingInput value={rating} onChange={setRating} disabled={saving} />
      </div>

      <div>
        <label htmlFor="review-comment" className={labelClass}>
          Comment <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <textarea
          id="review-comment"
          rows={4}
          maxLength={1000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={saving}
          placeholder="Share your experience..."
          className={modalTextareaClass}
        />
      </div>

      {error && <p className={errorClass}>{error}</p>}

      <div className="flex gap-3 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={saving} className={modalBtnSecondary}>
            Cancel
          </button>
        )}
        <button type="submit" disabled={saving || rating < 1} className={modalBtnPrimary}>
          {saving ? 'Submitting…' : 'Submit Review'}
        </button>
      </div>
    </form>
  );
}
