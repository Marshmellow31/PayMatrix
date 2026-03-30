/**
 * Format a number as currency
 */
export const formatCurrency = (amount, currency = 'INR', locale = 'en-IN') => {
  const valueInMainUnit = amount || 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valueInMainUnit);
};

/**
 * Format compact currency (e.g., ₹1.2K)
 */
export const formatCompactCurrency = (amount, currency = 'INR', locale = 'en-IN') => {
  if (Math.abs(amount) >= 100000) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return formatCurrency(amount, currency, locale);
};
