/**
 * Retries an async operation with exponential back-off.
 *
 * Only retries on transient Firestore errors (unavailable, resource-exhausted,
 * or network-related). Permission errors and validation errors are thrown
 * immediately without retry.
 *
 * @param {() => Promise<T>} fn          - The async operation to execute.
 * @param {number}           maxAttempts - Maximum number of attempts (default 3).
 * @param {number}           baseDelayMs - Base delay in ms; doubles each attempt (default 400).
 * @returns {Promise<T>}
 *
 * @example
 * await withRetry(() => setDoc(docRef, payload));
 */
export const withRetry = async (fn, maxAttempts = 3, baseDelayMs = 400) => {
  const TRANSIENT_CODES = new Set([
    'unavailable',
    'resource-exhausted',
    'deadline-exceeded',
    'internal',
    'aborted',
  ]);

  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      const code = err?.code ?? '';
      const msg  = err?.message ?? '';
      const isTransient =
        TRANSIENT_CODES.has(code) ||
        msg.includes('network') ||
        msg.includes('offline') ||
        msg.includes('Failed to fetch');

      if (!isTransient || attempt === maxAttempts) throw err;

      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
};
