import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import {
  fetchReviewableAppointments,
  submitCustomerReview,
} from '@nail-couture/shared/utils/customerReviewService.js';
import { getSupabaseErrorMessage } from '@nail-couture/shared/utils/supabaseErrors.js';
import { AppModal, ModalButton } from '../AppModal';
import { StarRatingInput } from './StarRatingInput';
import { useThemeStyles } from '../../theme/useThemeStyles';

type ReviewFormModalProps = {
  open: boolean;
  onClose: () => void;
  appointmentId: string;
  serviceName?: string;
  technicianName?: string;
  callerPhone?: string;
  onSuccess: (appointmentId: string) => void;
};

export function ReviewFormModal({
  open,
  onClose,
  appointmentId,
  serviceName,
  technicianName,
  callerPhone,
  onSuccess,
}: ReviewFormModalProps) {
  const styles = useThemeStyles();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!callerPhone) {
      setError('Please sign in to submit a review.');
      return;
    }
    if (rating < 1) {
      setError('Please select a star rating.');
      return;
    }

    setSaving(true);
    setError('');
    const { error: submitError, available } = await submitCustomerReview(
      callerPhone,
      appointmentId,
      rating,
      comment,
    );
    setSaving(false);

    if (!available) {
      setError('Reviews are not available yet.');
      return;
    }
    if (submitError) {
      setError(getSupabaseErrorMessage(submitError, 'Unable to submit review.'));
      return;
    }

    setRating(0);
    setComment('');
    onSuccess(appointmentId);
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Leave a Review"
      scrollBody
      footer={
        <>
          <ModalButton label="Cancel" onPress={onClose} disabled={saving} />
          <ModalButton
            label={saving ? 'Submitting…' : 'Submit Review'}
            variant="primary"
            disabled={saving || rating < 1}
            onPress={handleSubmit}
          />
        </>
      }
    >
      <View style={{ gap: 16 }}>
        <View style={[styles.card, { padding: 14 }]}>
          <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 2, marginBottom: 6 }]}>
            YOUR VISIT
          </Text>
          <Text style={styles.textPrimary}>
            <Text style={styles.textGold}>{serviceName || 'Service'}</Text>
            {technicianName ? ` with ${technicianName}` : ''}
          </Text>
        </View>

        <View>
          <Text style={[styles.textSecondary, { marginBottom: 8 }]}>Rating</Text>
          <StarRatingInput value={rating} onChange={setRating} disabled={saving} />
        </View>

        <View>
          <Text style={[styles.textSecondary, { marginBottom: 8 }]}>Comment (optional)</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            editable={!saving}
            multiline
            maxLength={1000}
            placeholder="Share your experience..."
            placeholderTextColor={styles.tokens.textMuted}
            style={{
              minHeight: 96,
              borderWidth: 1,
              borderColor: styles.tokens.borderColor,
              borderRadius: 12,
              padding: 12,
              color: styles.tokens.textPrimary,
              backgroundColor: styles.tokens.inputBg,
              textAlignVertical: 'top',
            }}
          />
        </View>

        {error ? <Text style={{ color: '#f87171', fontSize: 13 }}>{error}</Text> : null}
      </View>
    </AppModal>
  );
}
