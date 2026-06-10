/**
 * Supabase/PostgREST errors are plain objects, not Error instances.
 * @param {unknown} error
 * @param {string} [fallback]
 */
export function getSupabaseErrorMessage(error, fallback = 'Request failed.') {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error instanceof Error && error.message) return error.message;

  const message = /** @type {{ message?: string, details?: string, hint?: string, code?: string }} */ (error).message;
  if (typeof message === 'string' && message.trim()) return message;

  const details = /** @type {{ details?: string }} */ (error).details;
  if (typeof details === 'string' && details.trim()) return details;

  return fallback;
}

/**
 * @param {unknown} error
 */
export function isMissingRpcFunctionError(error) {
  const code = /** @type {{ code?: string }} */ (error)?.code ?? '';
  const message = getSupabaseErrorMessage(error, '').toLowerCase();
  return code === 'PGRST202'
    || code === '42883'
    || message.includes('could not find the function')
    || message.includes('function') && message.includes('does not exist');
}
