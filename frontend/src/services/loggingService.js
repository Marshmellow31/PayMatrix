import { db, auth } from '../config/firebase.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Centralized security and error logging service.
 * Logs are stored in the 'security_logs' collection in Firestore.
 */
const loggingService = {
  /**
   * Log a security-related event.
   * @param {string} type - e.g., 'auth/login-success', 'auth/login-failure', 'security/unauthorized'
   * @param {object} metadata - Additional context for the event
   */
  logSecurityEvent: async (type, metadata = {}) => {
    try {
      const user = auth.currentUser;
      
      // Serialize metadata to handle non-plain objects like Errors
      const serializedMetadata = loggingService.serializeMetadata(metadata);

      const logEntry = {
        type,
        uid: user?.uid || 'anonymous',
        email: user?.email || metadata.email || 'unknown',
        timestamp: serverTimestamp(),
        metadata: serializedMetadata,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        url: window.location.href
      };

      await addDoc(collection(db, 'security_logs'), logEntry);
    } catch (error) {
      // Fail silently to avoid interrupting the main application flow
      console.error('Logging failed:', error);
    }
  },

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
        code: data.code || null
      };
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => loggingService.serializeMetadata(item));
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
        stack
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
      ...context
    });
  }
};

export default loggingService;
