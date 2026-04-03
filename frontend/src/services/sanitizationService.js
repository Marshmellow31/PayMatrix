import DOMPurify from 'dompurify';

/**
 * Service to sanitize user-provided strings to prevent XSS attacks.
 * Uses DOMPurify to strip malicious HTML and script tags.
 */
const sanitizationService = {
  /**
   * Cleans a string of potentially malicious HTML/JS.
   * @param {string} input - The raw user input
   * @returns {string} - The sanitized string
   */
  sanitize: (input) => {
    if (typeof input !== 'string') return input;
    // Strip all HTML tags entirely for plain-text fields, 
    // or allow a safe subset if needed. For PayMatrix, we mostly want pure text.
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // No HTML allowed in titles/descriptions
      ALLOWED_ATTR: []
    }).trim();
  },

  /**
   * Deeply sanitizes an object's string properties.
   * @param {object} obj - The object to sanitize
   * @returns {object} - The sanitized object
   */
  sanitizeObject: (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = Array.isArray(obj) ? [] : {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizationService.sanitize(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizationService.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
};

export default sanitizationService;
