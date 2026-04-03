import { useState, useCallback } from 'react';

/**
 * Hook to provide UI-level abuse protection (throttling/debouncing).
 * Prevents rapid button clicks and spamming of functions.
 * @param {Function} callback - The function to protect
 * @param {number} delay - Minimum time between invocations (default: 1000ms)
 */
export const useThrottledAction = (callback, delay = 1000) => {
  const [isThrottled, setIsThrottled] = useState(false);

  const throttledAction = useCallback(async (...args) => {
    if (isThrottled) return;

    setIsThrottled(true);
    try {
      await callback(...args);
    } finally {
      // Set a timer to reset the throttle state
      setTimeout(() => {
        setIsThrottled(false);
      }, delay);
    }
  }, [callback, delay, isThrottled]);

  return { throttledAction, isThrottled };
};

/**
 * Hook to manage complex multi-layered rate limiting (UI + Service).
 * @param {string} actionKey - The action name for rateLimitService
 * @param {Function} callback - The action to perform
 * @param {object} options - { limit: 5, windowMinutes: 60, uiDelay: 1000 }
 */
export const useAbuseProtection = (actionKey, callback, options = {}) => {
  const { limit = 5, windowMinutes = 60, uiDelay = 1000 } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Lazy import rateLimitService to avoid circular dependencies
  const execute = useCallback(async (...args) => {
    if (loading) return;

    setLoading(true);
    setError(null);
    
    try {
      const rateLimitService = (await import('../services/rateLimitService')).default;
      
      // 1. Check persistent rate limit (Firestore-backed)
      await rateLimitService.checkAndConsume(actionKey, limit, windowMinutes);
      
      // 2. Execute protected callback
      await callback(...args);
      
      // 3. UI-level delay to discourage rapid spamming
      await new Promise(resolve => setTimeout(resolve, uiDelay));
      
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [actionKey, callback, limit, windowMinutes, uiDelay, loading]);

  return { execute, loading, error };
};
