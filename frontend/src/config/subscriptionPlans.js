export const PRO_PRICING = Object.freeze({
  IN: {
    tier: 1,
    country: 'IN',
    currency: 'INR',
    locale: 'en-IN',
    monthly: 4900,
    yearly: 29900,
    wasMonthly: 9900,
    wasYearly: 39900,
    checkoutSupported: true,
  },
  US: {
    tier: 2,
    country: 'US',
    currency: 'USD',
    locale: 'en-US',
    monthly: 199,
    yearly: 1499,
    checkoutSupported: false,
  },
  GB: {
    tier: 3,
    country: 'GB',
    currency: 'GBP',
    locale: 'en-GB',
    monthly: 179,
    yearly: 1299,
    checkoutSupported: false,
  },
  EU: {
    tier: 4,
    country: 'EU',
    currency: 'EUR',
    locale: 'en-IE',
    monthly: 199,
    yearly: 1499,
    checkoutSupported: false,
  },
});

export const EURO_MARKETS = new Set([
  'AT',
  'BE',
  'CY',
  'DE',
  'EE',
  'ES',
  'FI',
  'FR',
  'GR',
  'HR',
  'IE',
  'IT',
  'LT',
  'LU',
  'LV',
  'MT',
  'NL',
  'PT',
  'SI',
  'SK',
]);

export const TIER2_MARKETS = new Set(['US', 'CA', 'AU', 'NZ']);

export const pricingRegionForCountry = (country = 'IN') => {
  const normalized = String(country || '')
    .trim()
    .toUpperCase();
  if (!normalized) return 'US';
  if (normalized === 'IN') return 'IN';
  if (normalized === 'GB') return 'GB';
  if (TIER2_MARKETS.has(normalized)) return 'US';
  if (EURO_MARKETS.has(normalized)) return 'EU';
  // Centralized fallback: unknown international countries map to Tier 2 (USD) display guidance, never IN!
  return 'US';
};

export const getRegionalPricing = (country) => PRO_PRICING[pricingRegionForCountry(country)];

export const formatPrice = (minorUnits, pricing) =>
  new Intl.NumberFormat(pricing.locale, {
    style: 'currency',
    currency: pricing.currency,
    maximumFractionDigits: pricing.currency === 'INR' ? 0 : 2,
  }).format(minorUnits / 100);
