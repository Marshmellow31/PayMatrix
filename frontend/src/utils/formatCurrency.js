const CURRENCY_LOCALES = Object.freeze({
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
});

export const defaultLocaleForCurrency = (currency = 'INR') => {
  const normalized = String(currency || '')
    .trim()
    .toUpperCase();
  return CURRENCY_LOCALES[normalized] || 'en-IN';
};

/**
 * Format a number as currency (accepts major units e.g. 10.50 rupees/dollars)
 */
export const formatCurrency = (amount, currency = 'INR', locale = null) => {
  const normCurrency = String(currency || 'INR')
    .trim()
    .toUpperCase();
  const effectiveLocale = locale || defaultLocaleForCurrency(normCurrency);
  const valueInMainUnit = Number(amount) || 0;

  return new Intl.NumberFormat(effectiveLocale, {
    style: 'currency',
    currency: normCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valueInMainUnit);
};

/**
 * Format compact currency (e.g., ₹1.2K, $1.2K)
 */
export const formatCompactCurrency = (amount, currency = 'INR', locale = null) => {
  const normCurrency = String(currency || 'INR')
    .trim()
    .toUpperCase();
  const effectiveLocale = locale || defaultLocaleForCurrency(normCurrency);
  const numericAmount = Number(amount) || 0;

  if (Math.abs(numericAmount) >= 10000) {
    return new Intl.NumberFormat(effectiveLocale, {
      style: 'currency',
      currency: normCurrency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(numericAmount);
  }
  return formatCurrency(numericAmount, normCurrency, effectiveLocale);
};

/**
 * Format integer minor units (paise / cents / pence) safely as currency
 */
export const formatPaiseCurrency = (amountPaise, currency = 'INR', locale = null) => {
  const paise = Number.isSafeInteger(amountPaise)
    ? amountPaise
    : Math.round(Number(amountPaise || 0));
  return formatCurrency(paise / 100, currency, locale);
};
