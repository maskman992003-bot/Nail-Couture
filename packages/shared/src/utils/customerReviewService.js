import { getSupabase } from '../lib/supabase.js';

const SUBMIT_RPC = 'submit_customer_review';
const REVIEWABLE_RPC = 'get_reviewable_appointments';
const TECHNICIAN_REVIEWS_RPC = 'get_reviews_for_technician';
const TECHNICIAN_SUMMARY_RPC = 'get_technician_review_summary';
const SERVICE_REVIEWS_RPC = 'get_reviews_for_service';
const SERVICE_SUMMARIES_RPC = 'get_service_review_summaries';
const FEATURED_REVIEWS_RPC = 'get_featured_reviews';
const MODERATE_REVIEW_RPC = 'moderate_customer_review';
const PUBLISH_REVIEW_RPC = 'publish_customer_review';
const STAFF_REVIEWS_RPC = 'get_staff_customer_reviews';
const MY_REVIEWS_RPC = 'get_my_customer_reviews';

function isReviewUnavailable(error) {
  const msg = (error?.message || '').toLowerCase();
  return (
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('could not find the function') ||
    msg.includes('customer_reviews')
  );
}

function isRpcSignatureMismatch(error) {
  const msg = (error?.message || '').toLowerCase();
  return (
    msg.includes('could not find the function') ||
    msg.includes('without a matching') ||
    msg.includes('pgrst202')
  );
}

function phoneMatchesSearch(phone, search) {
  const digits = (search || '').replace(/\D/g, '');
  if (!digits) return false;
  return (phone || '').replace(/\D/g, '').includes(digits);
}

function excludeHiddenStaffReviews(reviews, includeHidden = false) {
  if (includeHidden) return reviews || [];
  return (reviews || []).filter((row) => !row.is_hidden);
}

function filterReviewsClientSide(reviews, { fromDate, toDate, search, includeHidden = false } = {}) {
  let filtered = includeHidden ? reviews || [] : (reviews || []).filter((row) => !row.is_hidden);
  if (fromDate) {
    const from = new Date(fromDate).getTime();
    filtered = filtered.filter((row) => new Date(row.created_at).getTime() >= from);
  }
  if (toDate) {
    const to = new Date(toDate).getTime();
    filtered = filtered.filter((row) => new Date(row.created_at).getTime() <= to);
  }
  const term = (search || '').trim().toLowerCase();
  if (term) {
    filtered = filtered.filter(
      (row) =>
        [row.customer_name, row.comment, row.service_name, row.technician_name].some((field) =>
          (field || '').toLowerCase().includes(term),
        ) || phoneMatchesSearch(row.customer_phone, search),
    );
  }
  return filtered;
}

function summarizeReviewsClientSide(reviews) {
  const rows = reviews || [];
  if (!rows.length) {
    return { avgRating: null, reviewCount: 0 };
  }
  const sum = rows.reduce((total, row) => total + Number(row.rating || 0), 0);
  return {
    avgRating: Math.round((sum / rows.length) * 10) / 10,
    reviewCount: rows.length,
  };
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
export async function fetchTechnicianReviews(
  technicianId,
  {
    limit = 20,
    offset = 0,
    callerPhone = null,
    fromDate = null,
    toDate = null,
    search = null,
    includeHidden = false,
  } = {},
) {
  if (!technicianId) return { summary: null, reviews: [], hasMore: false, available: false };

  try {
    const baseArgs = {
      p_technician_id: technicianId,
      p_limit: limit,
      p_offset: offset,
      caller_phone: callerPhone,
    };
    const filterArgs = {
      ...baseArgs,
      p_from_date: fromDate,
      p_to_date: toDate,
      p_search: search || null,
    };

    let { data, error } = await getSupabase().rpc(TECHNICIAN_REVIEWS_RPC, filterArgs);
    let filtersClientSide = false;

    if (error && isRpcSignatureMismatch(error)) {
      ({ data, error } = await getSupabase().rpc(TECHNICIAN_REVIEWS_RPC, {
        ...baseArgs,
        p_limit: Math.min(limit + offset, 100),
        p_offset: 0,
      }));
      filtersClientSide = true;
    }

    if (error) {
      if (isReviewUnavailable(error)) return { summary: null, reviews: [], hasMore: false, available: false };
      return { summary: null, reviews: [], hasMore: false, available: true, error };
    }

    const payload = normalizeRpcObject(data) || {};
    let reviews = excludeHiddenStaffReviews(normalizeRpcArray(payload.reviews), includeHidden);

    if (filtersClientSide) {
      reviews = filterReviewsClientSide(reviews, { fromDate, toDate, search, includeHidden });
      if (offset > 0) reviews = reviews.slice(offset);
      if (limit) reviews = reviews.slice(0, limit);
      return {
        summary: summarizeReviewsClientSide(
          filterReviewsClientSide(normalizeRpcArray(payload.reviews), { fromDate, toDate, search, includeHidden }),
        ),
        reviews,
        hasMore: false,
        totalCount: reviews.length,
        filtersClientSide: true,
        available: true,
      };
    }

    return {
      summary: {
        avgRating: payload.avg_rating,
        reviewCount: payload.review_count || 0,
      },
      reviews,
      hasMore: Boolean(payload.has_more),
      totalCount: payload.total_count || 0,
      available: true,
    };
  } catch (err) {
    return { summary: null, reviews: [], hasMore: false, available: false, error: err };
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

const FEATURED_REVIEWS_HOME_MAX = 9;

/** Top public reviews for marketing sections (home page cap: 9). */
export async function fetchFeaturedReviews(limit = FEATURED_REVIEWS_HOME_MAX) {
  const safeLimit = Math.max(1, Math.min(limit, FEATURED_REVIEWS_HOME_MAX));
  try {
    const { data, error } = await getSupabase().rpc(FEATURED_REVIEWS_RPC, {
      p_limit: safeLimit,
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

/** Customer profile — reviews the signed-in customer has submitted. */
export async function fetchMyCustomerReviews(
  callerPhone,
  { limit = 50, offset = 0, fromDate = null, toDate = null } = {},
) {
  if (!callerPhone) return { summary: null, reviews: [], hasMore: false, available: false };

  try {
    const { data, error } = await getSupabase().rpc(MY_REVIEWS_RPC, {
      caller_phone: callerPhone,
      p_limit: limit,
      p_offset: offset,
      p_from_date: fromDate,
      p_to_date: toDate,
    });

    if (error) {
      if (isReviewUnavailable(error)) return { summary: null, reviews: [], hasMore: false, available: false };
      return { summary: null, reviews: [], hasMore: false, available: true, error };
    }

    const payload = normalizeRpcObject(data) || {};
    return {
      summary: {
        avgRating: payload.avg_rating,
        reviewCount: payload.review_count || 0,
      },
      reviews: normalizeRpcArray(payload.reviews),
      hasMore: Boolean(payload.has_more),
      totalCount: payload.total_count || 0,
      available: true,
    };
  } catch (err) {
    return { summary: null, reviews: [], hasMore: false, available: false, error: err };
  }
}

/** Staff Reviews tab — salon-wide or filtered by technician. */
export async function fetchStaffCustomerReviews(
  callerPhone,
  {
    limit = 50,
    offset = 0,
    technicianId = null,
    fromDate = null,
    toDate = null,
    search = null,
    includeHidden = false,
  } = {},
) {
  if (!callerPhone) return { summary: null, reviews: [], hasMore: false, available: false };

  try {
    const baseArgs = {
      caller_phone: callerPhone,
      p_limit: limit,
      p_offset: offset,
      p_technician_id: technicianId,
    };
    const filterArgs = {
      ...baseArgs,
      p_from_date: fromDate,
      p_to_date: toDate,
      p_search: search || null,
    };

    let { data, error } = await getSupabase().rpc(STAFF_REVIEWS_RPC, filterArgs);
    let filtersClientSide = false;

    if (error && isRpcSignatureMismatch(error)) {
      ({ data, error } = await getSupabase().rpc(STAFF_REVIEWS_RPC, {
        ...baseArgs,
        p_limit: Math.min(limit + offset, 100),
        p_offset: 0,
      }));
      filtersClientSide = true;
    }

    if (error) {
      if (isReviewUnavailable(error)) return { summary: null, reviews: [], hasMore: false, available: false };
      return { summary: null, reviews: [], hasMore: false, available: true, error };
    }

    const payload = normalizeRpcObject(data) || {};
    let reviews = excludeHiddenStaffReviews(normalizeRpcArray(payload.reviews), includeHidden);

    if (filtersClientSide) {
      const filteredAll = filterReviewsClientSide(reviews, { fromDate, toDate, search, includeHidden });
      reviews = filteredAll.slice(offset, offset + limit);
      return {
        summary: summarizeReviewsClientSide(filteredAll),
        reviews,
        hasMore: offset + limit < filteredAll.length,
        totalCount: filteredAll.length,
        filtersClientSide: true,
        available: true,
      };
    }

    return {
      summary: {
        avgRating: payload.avg_rating,
        reviewCount: payload.review_count || 0,
      },
      reviews,
      hasMore: Boolean(payload.has_more),
      totalCount: payload.total_count || 0,
      available: true,
    };
  } catch (err) {
    return { summary: null, reviews: [], hasMore: false, available: false, error: err };
  }
}

/** Publish or unpublish a review for public marketing (management roles only). */
export async function publishCustomerReview(callerPhone, reviewId, action = 'publish') {
  if (!callerPhone || !reviewId) {
    return { data: null, error: new Error('Phone and review ID are required'), available: true };
  }

  try {
    const { data, error } = await getSupabase().rpc(PUBLISH_REVIEW_RPC, {
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
