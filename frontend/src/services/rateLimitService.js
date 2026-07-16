import { db, auth } from '../config/firebase.js';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import loggingService from './loggingService.js';

// In-memory cache to prevent redundant transactions within the same client session
// This solves the React re-render spamming issue without hitting Firestore.
const lastChecked = {};

/**
 * Service to manage rate limiting for sensitive actions using Firestore transactions.
 */
const rateLimitService = {
  checkAndConsume: async (actionKey, maxAttempts = 5, windowMinutes = 60) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Authentication required for rate-limited action.');

    // DEBOUNCE: If we just checked this action in the last 2 seconds, skip the DB write
    const cacheKey = `${user.uid}:${actionKey}`;
    const nowTs = Date.now();
    if (lastChecked[cacheKey] && nowTs - lastChecked[cacheKey] < 2000) {
      return true;
    }

    const limitDocRef = doc(db, 'rate_limits', user.uid);
    try {
      await runTransaction(db, async (transaction) => {
        const limitDoc = await transaction.get(limitDocRef);
        const now = Date.now();
        const windowMillis = windowMinutes * 60 * 1000;

        const data = limitDoc.exists() ? limitDoc.data() : {};
        let actionData = data[actionKey] || { count: 0, firstAttemptAt: now };

        // Check if window has expired
        if (now - actionData.firstAttemptAt > windowMillis) {
          // Reset window
          actionData = { count: 1, firstAttemptAt: now };
        } else {
          // Check if limit exceeded
          if (actionData.count >= maxAttempts) {
            const timeLeft = Math.ceil((windowMillis - (now - actionData.firstAttemptAt)) / 60000);
            throw new Error(
              `Rate limit exceeded for ${actionKey}. Please try again in ${timeLeft} minutes.`
            );
          }
          actionData.count += 1;
        }

        // Update the document
        transaction.set(
          limitDocRef,
          {
            ...data,
            [actionKey]: actionData,
            lastActionAt: serverTimestamp(),
          },
          { merge: true }
        );

        return true;
      });

      // Update cache after success
      lastChecked[cacheKey] = Date.now();
      return true;
    } catch (error) {
      // Re-throw if it's the limit error
      if (error.message.includes('Rate limit exceeded')) throw error;

      // FIX (M-1): fail CLOSED. Previously ANY error (contention, or any unexpected
      // DB error) returned `true`, so an attacker could bypass the limit simply by
      // forcing the transaction to error. We now only allow the action when the
      // device is genuinely offline — a real connectivity case, not an abuse vector,
      // and one where the write is queued by Firestore offline persistence anyway.
      const isOffline =
        !navigator.onLine || error.code === 'unavailable' || error.message.includes('network');

      if (isOffline) {
        console.warn(`[RATE_LIMIT_OFFLINE] Allowing queued action while offline: ${actionKey}`);
        loggingService.logSecurityEvent('security/rate-limit-offline', { actionKey });
        return true;
      }

      // Contention or any other unexpected error → deny (fail closed).
      console.error('Rate Limit Service error (failing closed):', error);
      loggingService.logSecurityEvent('security/rate-limit-error', {
        actionKey,
        code: error.code || 'unknown',
      });
      throw new Error('Could not verify rate limit. Please try again in a moment.');
    }
  },
};

export default rateLimitService;
