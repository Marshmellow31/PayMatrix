/**
 * Centralized security and error logging service.
 *
 * Client writes to `security_logs` are intentionally forbidden by Firestore
 * rules because a client-generated security trail is forgeable. Trusted
 * backend code owns that collection. Keep this interface as a production
 * no-op so optional telemetry can never break authentication or user actions.
 */
const loggingService = {
  /**
   * Log a security-related event.
   * @param {string} type - e.g., 'auth/login-success', 'auth/login-failure', 'security/unauthorized'
   * @param {object} metadata - Additional context for the event
   */
  logSecurityEvent: () => Promise.resolve(),

  /**
   * Helper to serialize metadata for Firestore.
   * Converts Error objects or other complex types to plain JSON-compatible objects.
   */
  serializeMetadata: (data) => {
    if (!data || typeof data !== 'object') return data;

    // Handle Error object specifically
    if (data instanceof Error) {
      return {
        message: data.message,
        stack: data.stack,
        code: data.code || null,
      };
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map((item) => loggingService.serializeMetadata(item));
    }

    // Handle plain objects
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = loggingService.serializeMetadata(value);
    }
    return result;
  },

  /**
   * Log an API or application error.
   * @param {string} service - Name of the service where the error occurred
   * @param {string} method - Method name
   * @param {Error|string} error - The error object or message
   */
  logError: async (service, method, error) => {
    try {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : null;

      await loggingService.logSecurityEvent('app/error', {
        service,
        method,
        error: errorMessage,
        stack,
      });
    } catch (e) {
      console.error('Error logging failed:', e);
    }
  },

  /**
   * Log an unusual traffic or interaction pattern.
   * @param {string} description - Description of the suspicious activity
   */
  logSuspiciousActivity: async (description, context = {}) => {
    await loggingService.logSecurityEvent('security/suspicious-activity', {
      description,
      ...context,
    });
  },
};

export default loggingService;
