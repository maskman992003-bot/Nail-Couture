import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import {
  fetchMyCustomerReviews,
  formatReviewDate,
} from '@nail-couture/shared/utils/customerReviewService.js';
import { useThemeStyles } from '../../theme/useThemeStyles';

const PAGE_SIZE = 20;

type CustomerReviewsSectionProps = {
  callerPhone?: string;
  onOpenHistory?: () => void;
};

export function CustomerReviewsSection({ callerPhone, onOpenHistory }: CustomerReviewsSectionProps) {
  const styles = useThemeStyles();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reviews, setReviews] = useState<Array<{
    id: string;
    rating: number;
    comment?: string;
    created_at: string;
    service_name?: string;
    technician_name?: string;
    is_hidden?: boolean;
  }>>([]);
  const [summary, setSummary] = useState({ avgRating: null as number | null, reviewCount: 0 });
  const [hasMore, setHasMore] = useState(false);
  const [available, setAvailable] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  if (loading) {
    return <ActivityIndicator color={styles.tokens.goldStrong} style={{ marginTop: 24 }} />;
  }

  if (!available) {
    return (
      <View style={[styles.card, { padding: 16 }]}>
        <Text style={[styles.textGold, { fontSize: 16, fontWeight: '600', marginBottom: 8 }]}>My Reviews</Text>
        <Text style={styles.textSecondary}>
          Reviews are not set up yet. Run migration 071 in Supabase.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.card, { padding: 16 }]}>
        <Text style={[styles.textGold, { fontSize: 16, fontWeight: '600', marginBottom: 4 }]}>My Reviews</Text>
        <Text style={[styles.textSecondary, { fontSize: 13, marginBottom: 12 }]}>
          Ratings and feedback you have left after salon visits.
        </Text>

        {loadError ? (
          <Text style={{ color: '#fcd34d', fontSize: 13, marginBottom: 12 }}>{loadError}</Text>
        ) : null}

        {summary.reviewCount > 0 ? (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.textGold}>
              {summary.avgRating != null ? `${Number(summary.avgRating).toFixed(1)} ★` : '—'}
            </Text>
            <Text style={styles.textSecondary}>
              {summary.reviewCount} review{summary.reviewCount === 1 ? '' : 's'}
            </Text>
          </View>
        ) : null}

        {reviews.length === 0 ? (
          <>
            <Text style={[styles.textSecondary, { textAlign: 'center', paddingVertical: 16 }]}>
              You have not submitted any reviews yet. After a completed visit, leave one from Visit History.
            </Text>
            {onOpenHistory ? (
              <Pressable onPress={onOpenHistory}>
                <Text style={[styles.textGold, { fontSize: 13, fontWeight: '600' }]}>Go to Visit History →</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          reviews.map((review) => (
            <View
              key={review.id}
              style={[
                styles.card,
                {
                  padding: 14,
                  marginBottom: 10,
                  opacity: review.is_hidden ? 0.65 : 1,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.textPrimary, { fontWeight: '600' }]}>
                    {review.service_name || 'Service'}
                  </Text>
                  <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 4 }]}>
                    {formatReviewDate(review.created_at)}
                  </Text>
                </View>
                <Text style={styles.textGold}>{'★'.repeat(review.rating)}</Text>
              </View>
              {review.technician_name ? (
                <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 6 }]}>
                  with {review.technician_name}
                </Text>
              ) : null}
              {review.comment ? (
                <Text style={[styles.textPrimary, { marginTop: 8, lineHeight: 20 }]}>{review.comment}</Text>
              ) : null}
              {review.is_hidden ? (
                <Text style={{ color: '#fbbf24', fontSize: 11, marginTop: 8 }}>Not shown publicly</Text>
              ) : null}
            </View>
          ))
        )}

        {hasMore ? (
          <Pressable
            onPress={() => loadReviews({ append: true, offset: reviews.length })}
            disabled={loadingMore}
            style={{
              marginTop: 8,
              paddingVertical: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: styles.tokens.goldStrong,
              alignItems: 'center',
              opacity: loadingMore ? 0.5 : 1,
            }}
          >
            <Text style={[styles.textGold, { fontSize: 12, fontWeight: '600' }]}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
