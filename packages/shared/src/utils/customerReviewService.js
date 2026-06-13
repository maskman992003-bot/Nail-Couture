import { getSupabase } from '../lib/supabase.js';

const SUBMIT_RPC = 'submit_customer_review';
const REVIEWABLE_RPC = 'get_reviewable_appointments';
const TECHNICIAN_REVIEWS_RPC = 'get_reviews_for_technician';
const TECHNICIAN_SUMMARY_RPC = 'get_technician_review_summary';
const SERVICE_REVIEWS_RPC = 'get_reviews_for_service';
const SERVICE_SUMMARIES_RPC = 'get_service_review_summaries';
const FEATURED_REVIEWS_RPC = 'get_featured_reviews';
const MODERATE_REVIEW_RPC = 'moderate_customer_review';

function isReviewUnavailable(error) {
  const msg = (error?.message || '').toLowerCase();
  return (
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('could not find the function') ||
    msg.includes('customer_reviews')
  );
}

function normalizeRpcObject(data) {
  if (data && typeof data === 'object' && !Array.isArray(data)) return data;
  return null;
}

function normalizeRpcArray(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') return [data];
  return [];
}

export function formatReviewDate(isoDate) {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatReviewRating(avgRating) {
  if (avgRating == null || Number.isNaN(Number(avgRating))) return null;
  return Number(avgRating).toFixed(1);
}

/** Submit a post-visit review for a completed appointment. */
export async function submitCustomerReview(callerPhone, appointmentId, rating, comment = '') {
  if (!callerPhone) {
    return { data: null, error: new Error('Phone is required'), available: true };
  }
  if (!appointmentId) {
    return { data: null, error: new Error('Appointment is required'), available: true };
  }

  try {
    const { data, error } = await getSupabase().rpc(SUBMIT_RPC, {
      caller_phone: callerPhone,
      p_appointment_id: appointmentId,
      p_rating: rating,
      p_comment: comment || null,
    });

    if (error) {
      if (isReviewUnavailable(error)) return { data: null, error, available: false };
      return { data: null, error, available: true };
    }

    return { data: normalizeRpcObject(data), error: null, available: true };
  } catch (err) {
    return { data: null, error: err, available: true };
  }
}

/** Completed visits the customer has not reviewed yet. */
export async function fetchReviewableAppointments(callerPhone, limit = 20) {
  if (!callerPhone) return { rows: [], available: false };

  try {
    const { data, error } = await getSupabase().rpc(REVIEWABLE_RPC, {
      caller_phone: callerPhone,
      p_limit: limit,
    });

    if (error) {
      if (isReviewUnavailable(error)) return { rows: [], available: false };
      return { rows: [], available: true, error };
    }

    return { rows: normalizeRpcArray(data), available: true };
  } catch (err) {
    return { rows: [], available: false, error: err };
  }
}

/** Reviews for a technician profile (public read; staff may see fuller names). */
export async function fetchTechnicianReviews(technicianId, { limit = 20, offset = 0, callerPhone = null } = {}) {
  if (!technicianId) return { summary: null, reviews: [], available: false };

  try {
    const { data, error } = await getSupabase().rpc(TECHNICIAN_REVIEWS_RPC, {
      p_technician_id: technicianId,
      p_limit: limit,
      p_offset: offset,
      caller_phone: callerPhone,
    });

    if (error) {
      if (isReviewUnavailable(error)) return { summary: null, reviews: [], available: false };
      return { summary: null, reviews: [], available: true, error };
    }

    const payload = normalizeRpcObject(data) || {};
    return {
      summary: {
        avgRating: payload.avg_rating,
        reviewCount: payload.review_count || 0,
      },
      reviews: normalizeRpcArray(payload.reviews),
      available: true,
    };
  } catch (err) {
    return { summary: null, reviews: [], available: false, error: err };
  }
}

export async function fetchTechnicianReviewSummary(technicianId) {
  if (!technicianId) return { avgRating: null, reviewCount: 0, available: false };

  try {
    const { data, error } = await getSupabase().rpc(TECHNICIAN_SUMMARY_RPC, {
      p_technician_id: technicianId,
    });

    if (error) {
      if (isReviewUnavailable(error)) return { avgRating: null, reviewCount: 0, available: false };
      return { avgRating: null, reviewCount: 0, available: true, error };
    }

    const payload = normalizeRpcObject(data) || {};
    return {
      avgRating: payload.avg_rating,
      reviewCount: payload.review_count || 0,
      available: true,
    };
  } catch (err) {
    return { avgRating: null, reviewCount: 0, available: false, error: err };
  }
}

/** Batch rating summaries for service cards. */
export async function fetchServiceReviewSummaries(serviceIds) {
  const ids = (serviceIds || []).filter(Boolean);
  if (!ids.length) return { summaries: {}, available: false };

  try {
    const { data, error } = await getSupabase().rpc(SERVICE_SUMMARIES_RPC, {
      p_service_ids: ids,
    });

    if (error) {
      if (isReviewUnavailable(error)) return { summaries: {}, available: false };
      return { summaries: {}, available: true, error };
    }

    const map = {};
    normalizeRpcArray(data).forEach((row) => {
      if (row?.service_id != null) {
        map[row.service_id] = {
          avgRating: row.avg_rating,
          reviewCount: row.review_count || 0,
        };
      }
    });

    return { summaries: map, available: true };
  } catch (err) {
    return { summaries: {}, available: false, error: err };
  }
}

/** Reviews for a single service page. */
export async function fetchServiceReviews(serviceId, { limit = 10, offset = 0 } = {}) {
  if (!serviceId) return { summary: null, reviews: [], available: false };

  try {
    const { data, error } = await getSupabase().rpc(SERVICE_REVIEWS_RPC, {
      p_service_id: serviceId,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      if (isReviewUnavailable(error)) return { summary: null, reviews: [], available: false };
      return { summary: null, reviews: [], available: true, error };
    }

    const payload = normalizeRpcObject(data) || {};
    return {
      summary: {
        avgRating: payload.avg_rating,
        reviewCount: payload.review_count || 0,
      },
      reviews: normalizeRpcArray(payload.reviews),
      available: true,
    };
  } catch (err) {
    return { summary: null, reviews: [], available: false, error: err };
  }
}

/** Top public reviews for marketing sections. */
export async function fetchFeaturedReviews(limit = 6) {
  try {
    const { data, error } = await getSupabase().rpc(FEATURED_REVIEWS_RPC, {
      p_limit: limit,
    });

    if (error) {
      if (isReviewUnavailable(error)) return { reviews: [], available: false };
      return { reviews: [], available: true, error };
    }

    return { reviews: normalizeRpcArray(data), available: true };
  } catch (err) {
    return { reviews: [], available: false, error: err };
  }
}

/** Hide, unhide, or delete a review (management roles only). */
export async function moderateCustomerReview(callerPhone, reviewId, action = 'hide') {
  if (!callerPhone || !reviewId) {
    return { data: null, error: new Error('Phone and review ID are required'), available: true };
  }

  try {
    const { data, error } = await getSupabase().rpc(MODERATE_REVIEW_RPC, {
      caller_phone: callerPhone,
      p_review_id: reviewId,
      p_action: action,
    });

    if (error) {
      if (isReviewUnavailable(error)) return { data: null, error, available: false };
      return { data: null, error, available: true };
    }

    return { data: normalizeRpcObject(data), error: null, available: true };
  } catch (err) {
    return { data: null, error: err, available: true };
  }
}
