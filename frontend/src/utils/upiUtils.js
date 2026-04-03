/**
 * UPI Payment Utilities
 * Handles platform detection, app-specific deep links, and smart payment routing.
 *
 * preferredApp values: "default" | "gpay" | "phonepe" | "paytm" | "bhim"
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
    description: 'India\'s most trusted wallet',
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

// Apps shown in the iOS chooser modal (exclude Default and BHIM since BHIM = upi://)
export const IOS_CHOOSER_APPS = UPI_APPS.filter(
  (a) => a.id !== 'default' && a.id !== 'bhim'
);

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

// ─── Deep Link Builder ────────────────────────────────────────────────────────

/**
 * Builds a URL-encoded UPI query string.
 */
const buildUPIQuery = (upiId, name, amount, note) => {
  const pa = encodeURIComponent((upiId || '').toString().trim());
  
  // Defensive: Handle case where name might be a user object
  const rawName = typeof name === 'string' ? name : (name?.name || 'User');
  const pn = encodeURIComponent(rawName.trim().substring(0, 50));
  
  const am = parseFloat(amount || 0).toFixed(2);
  
  // Defensive: Handle case where note might be missing or non-string
  const rawNote = typeof note === 'string' ? note : 'PayMatrix Settlement';
  const tn = encodeURIComponent(rawNote.trim().substring(0, 100));
  
  return `pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`;
};

/**
 * Returns the deep link URL for the given app and UPI parameters.
 * @param {"default"|"gpay"|"phonepe"|"paytm"|"bhim"} appId
 */
export const getAppDeepLink = (appId, upiId, name, amount, note) => {
  const q = buildUPIQuery(upiId, name, amount, note);
  switch (appId) {
    case 'gpay':
      return `gpay://upi/pay?${q}`;
    case 'phonepe':
      return `phonepe://pay?${q}`;
    case 'paytm':
      return `paytmmp://pay?${q}`;
    case 'bhim':
    case 'default':
    default:
      return `upi://pay?${q}`;
  }
};

/**
 * Returns a human-readable label for the given app id.
 */
export const getAppLabel = (appId) => {
  const app = UPI_APPS.find((a) => a.id === appId);
  return app?.label || 'Payment App';
};

// ─── Legacy helper (kept for backward compat) ─────────────────────────────────

/**
 * @deprecated Use handleSmartPayment instead.
 */
export const generateUPILink = (upiId, name, amount, note = 'PayMatrix Settlement') => {
  if (!validateUPIId(upiId)) return null;
  if (!amount || typeof amount !== 'number' || amount <= 0) return null;
  return getAppDeepLink('default', upiId, name, amount, note);
};

// ─── Smart Payment Handler ────────────────────────────────────────────────────

/**
 * Main payment entry point. Detects platform and routes to the correct deep link.
 *
 * @param {object} receiver         - { name, upiId }
 * @param {number} amount           - Payment amount
 * @param {string} note             - Optional payment note
 * @param {string} payerPreferredApp - The payer's preferredApp setting
 *
 * @returns {{
 *   success: boolean,
 *   url: string | null,
 *   needsChooser: boolean,   // true → show iOS app chooser modal
 *   platform: string,
 *   error: string | null,
 * }}
 */
export const handleSmartPayment = (
  receiver,
  amount,
  note = 'PayMatrix Settlement',
  payerPreferredApp = 'default'
) => {
  // ── Guard: no receiver ───────────────────────────────────────────────────────
  if (!receiver) {
    return { success: false, url: null, needsChooser: false, platform: 'unknown', error: 'Receiver information is missing.' };
  }

  // ── Guard: no amount ──────────────────────────────────────────────────────────
  if (!amount || amount <= 0) {
    return { success: false, url: null, needsChooser: false, platform: 'unknown', error: 'Payment amount must be greater than zero.' };
  }

  // ── Guard: no UPI ID ──────────────────────────────────────────────────────────
  if (!receiver.upiId || !validateUPIId(receiver.upiId)) {
    return { success: false, url: null, needsChooser: false, platform: 'unknown', error: 'This user has not added a UPI ID.' };
  }

  const platform = detectPlatform();
  const app = payerPreferredApp || 'default';

  // ── iOS + Default → show chooser modal ──────────────────────────────────────
  if (platform === 'ios' && app === 'default') {
    return { success: true, url: null, needsChooser: true, platform, error: null };
  }

  // ── All other cases → build deep link ────────────────────────────────────────
  const url = getAppDeepLink(app, receiver.upiId, receiver.name, amount, note);
  window.location.href = url;
  return { success: true, url, needsChooser: false, platform, error: null };
};

/**
 * @deprecated Use handleSmartPayment instead.
 */
export const handlePayment = (receiver, amount, note = 'PayMatrix Settlement') => {
  return handleSmartPayment(receiver, amount, note, 'default');
};
