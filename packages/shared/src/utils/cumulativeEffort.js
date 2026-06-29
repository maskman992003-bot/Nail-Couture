/**
 * Mirror of SQL calculate_service_points:
 * ROUND((time_weight * 0.4) + (effort_weight * 0.4) + (price_weight * 0.2))
 */
export function calculateServicePoints(timeWeight, effortWeight, priceWeight) {
  const t = clampWeight(timeWeight);
  const e = clampWeight(effortWeight);
  const p = clampWeight(priceWeight);
  return Math.round(t * 0.4 + e * 0.4 + p * 0.2);
}

export function clampWeight(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, Math.round(n)));
}
