/**
 * UPI Payment Utilities
 *
 * Settle-up payments in PayMatrix are person-to-person transfers to a friend's
 * *personal* UPI ID (VPA). GPay / PhonePe / Paytm risk engines block any payment
 * that is "pushed" to a personal VPA from a third-party app via a deep link /
 * app intent ("payment failed as per UPI risk policy", scam warnings, etc.).
 * This is enforced by NPCI and cannot be bypassed for a personal VPA without
 * becoming a registered PSP/merchant — which does not apply to P2P settle-up.
 *
 * The reliable, un-flagged path is a QR code that the payer scans inside their
 * OWN UPI app. A scan is a user-initiated "pull" payment — the standard way to
 * pay any personal UPI ID — so it is not flagged. We therefore generate a QR
 * (and offer a copy-UPI-ID fallback) instead of opening the app directly.
 */

// ─── App Metadata ─────────────────────────────────────────────────────────────

export const UPI_APPS = [
  {
    id: 'default',
    label: 'Default (OS decides)',
    shortLabel: 'Default',
    description: 'Let your OS pick the best app',
    color: '#a78bfa',
    icon: 'smartphone', // Lucide icon name
  },
  {
    id: 'gpay',
    label: 'Google Pay',
    shortLabel: 'GPay',
    description: 'Fast & secure with Google',
    color: '#4285F4',
    icon: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/google-pay-icon.png',
  },
  {
    id: 'phonepe',
    label: 'PhonePe',
    shortLabel: 'PhonePe',
    description: "India's most trusted wallet",
    color: '#5f259f',
    icon: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/phonepe-icon.png',
  },
  {
    id: 'paytm',
    label: 'Paytm',
    shortLabel: 'Paytm',
    description: 'Pay, shop, invest',
    color: '#00b9f1',
    icon: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/paytm-icon.png',
  },
  {
    id: 'bhim',
    label: 'BHIM UPI',
    shortLabel: 'BHIM',
    description: 'Government of India UPI app',
    color: '#f97316',
    icon: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/bhim-upi-icon.png',
  },
];

// ─── Platform Detection ───────────────────────────────────────────────────────

/**
 * Detects the current platform.
 * @returns {"ios" | "android" | "other"}
 */
export const detectPlatform = () => {
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
};

// ─── UPI Validation ───────────────────────────────────────────────────────────

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
 * Returns whether a user object has a valid UPI ID configured.
 */
export const hasPaymentMethod = (user) => {
  if (!user) return false;
  return !!(user.upiId && validateUPIId(user.upiId));
};

// ─── UPI QR Builder ───────────────────────────────────────────────────────────

/**
 * Strips non-ASCII characters from a string.
 * UPI apps have strict ASCII-only parsers for text params like the payee name
 * (`pn`). Non-ASCII chars get multi-byte percent-encoded, which some apps reject,
 * so we remove them defensively.
 */
const sanitizeForUPI = (str) => str.replace(/[^\x20-\x7E]/g, '').trim();

/**
 * Builds the `upi://pay` string to encode inside a QR code.
 *
 * IMPORTANT: this string is meant to be rendered as a QR and scanned by the
 * payer inside their own UPI app — it is NOT opened as a deep link / app intent.
 * The amount IS pre-filled: a scanned QR carrying an amount is normal and is not
 * flagged, unlike a deep link that pushes an amount to a personal VPA.
 *
 * @param {string} upiId        Receiver VPA, e.g. "name@okhdfcbank"
 * @param {string|object} name  Receiver display name (or user object)
 * @param {number} amount       Amount in INR
 * @returns {string} e.g. "upi://pay?pa=name@okhdfcbank&pn=Name&am=100.00&cu=INR"
 */
export const getUPIQRValue = (upiId, name, amount) => {
  const pa = encodeURIComponent((upiId || '').toString().trim());
  const rawName = typeof name === 'string' ? name : name?.name || 'User';
  const pn = encodeURIComponent(sanitizeForUPI(rawName).substring(0, 50));
  const am = parseFloat(amount || 0).toFixed(2);
  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR`;
};

/**
 * Returns a human-readable label for the given app id.
 */
export const getAppLabel = (appId) => {
  const app = UPI_APPS.find((a) => a.id === appId);
  return app?.label || 'Payment App';
};
