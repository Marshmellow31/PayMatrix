/**
 * UPI Payment Utilities
 * Standardized for UPI IDs only.
 */

/**
 * Validates a UPI ID string.
 * Basic check: must contain '@' with non-empty parts on both sides.
 */
export const validateUPIId = (upiId) => {
  if (!upiId || typeof upiId !== 'string') return false;
  const trimmed = upiId.trim();
  const parts = trimmed.split('@');
  return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
};

/**
 * Generates a UPI deep link. 
 * The system is now standardized to UPI IDs only.
 */
export const generateUPILink = (upiId, name, amount, note = 'PayMatrix Settlement') => {
  if (!validateUPIId(upiId)) return null;
  if (!amount || typeof amount !== 'number' || amount <= 0) return null;

  const pa = encodeURIComponent(upiId.trim());
  const pn = encodeURIComponent((name || 'User').trim().substring(0, 50));
  const am = amount.toFixed(2);
  const tn = encodeURIComponent(note.trim().substring(0, 100));

  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`;
};

/**
 * Initiates UPI payment flow.
 */
export const handlePayment = (receiver, amount, note = 'PayMatrix Settlement') => {
  if (!receiver) {
    return { success: false, url: null, error: 'Receiver information is missing.' };
  }

  if (!amount || amount <= 0) {
    return { success: false, url: null, error: 'Payment amount must be greater than zero.' };
  }

  if (receiver.upiId && validateUPIId(receiver.upiId)) {
    const url = generateUPILink(receiver.upiId, receiver.name, amount, note);
    if (url) {
      window.location.href = url;
      return { success: true, url, error: null };
    }
  }

  return {
    success: false,
    url: null,
    error: 'This user has not added a UPI ID.',
  };
};

/**
 * Returns whether a user object has a valid UPI ID configured.
 */
export const hasPaymentMethod = (user) => {
  if (!user) return false;
  return !!(user.upiId && validateUPIId(user.upiId));
};
