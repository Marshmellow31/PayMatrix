/**
 * Foreign Exchange (FX) Abstraction & In-Memory Rate Cache Service
 *
 * Supports multi-currency conversion across INR, USD, EUR, and GBP with
 * integer minor-unit (paise/cents/pence) rounding preservation.
 */

export const SUPPORTED_FX_CURRENCIES = Object.freeze(['INR', 'USD', 'EUR', 'GBP']);

// Default USD-based reference rates
const DEFAULT_USD_RATES = Object.freeze({
  USD: 1.0,
  INR: 86.5,
  EUR: 0.92,
  GBP: 0.78,
});

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// In-memory rate cache: Map<`${from}_${to}`, { rate: number, expiresAt: number }>
const rateCache = new Map();
// Mock overrides for tests / deterministic mocking
const mockOverrides = new Map();

/**
 * Normalizes a currency code to uppercase 3-letter string.
 * @param {string} code
 * @returns {string}
 */
export function normalizeCurrency(code) {
  if (!code || typeof code !== 'string') return '';
  return code.trim().toUpperCase();
}

/**
 * Validates whether a currency is supported.
 * @param {string} code
 * @returns {boolean}
 */
export function isSupportedCurrency(code) {
  return SUPPORTED_FX_CURRENCIES.includes(normalizeCurrency(code));
}

/**
 * Retrieves the exchange rate from fromCurrency to toCurrency.
 *
 * @param {string} fromCurrency
 * @param {string} toCurrency
 * @returns {number}
 */
export function getExchangeRate(fromCurrency, toCurrency) {
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);

  if (!isSupportedCurrency(from)) {
    throw new Error(`Unsupported source currency: ${fromCurrency}`);
  }
  if (!isSupportedCurrency(to)) {
    throw new Error(`Unsupported target currency: ${toCurrency}`);
  }

  if (from === to) {
    return 1.0;
  }

  const cacheKey = `${from}_${to}`;

  // 1. Check mock override first
  if (mockOverrides.has(cacheKey)) {
    return mockOverrides.get(cacheKey);
  }

  // 2. Check in-memory TTL cache
  const cached = rateCache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.rate;
  }

  // 3. Derive exchange rate from baseline rates
  const fromUsdRate = DEFAULT_USD_RATES[from];
  const toUsdRate = DEFAULT_USD_RATES[to];
  const rate = toUsdRate / fromUsdRate;

  // Cache rate
  rateCache.set(cacheKey, {
    rate,
    expiresAt: now + CACHE_TTL_MS,
  });

  return rate;
}

/**
 * Converts an integer minor unit (e.g. paise, cents, pence) from one currency to another.
 * Preserves integer minor units by applying Math.round().
 *
 * @param {number} amountPaise - Amount in integer minor units
 * @param {string} fromCurrency
 * @param {string} toCurrency
 * @returns {number} Converted amount in integer minor units
 */
export function convertPaise(amountPaise, fromCurrency, toCurrency) {
  if (amountPaise === undefined || amountPaise === null || !Number.isInteger(amountPaise)) {
    throw new Error('amountPaise must be an integer');
  }

  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);

  if (from === to) {
    return amountPaise;
  }

  const rate = getExchangeRate(from, to);
  return Math.round(amountPaise * rate);
}

/**
 * Sets a mock exchange rate for testing or deterministic overrides.
 * @param {string} fromCurrency
 * @param {string} toCurrency
 * @param {number} rate
 */
export function setMockRate(fromCurrency, toCurrency, rate) {
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);
  if (rate <= 0 || !Number.isFinite(rate)) {
    throw new Error('Exchange rate must be a finite positive number');
  }
  mockOverrides.set(`${from}_${to}`, rate);
}

/**
 * Clears the in-memory rate cache and any mock overrides.
 */
export function clearCache() {
  rateCache.clear();
  mockOverrides.clear();
}

export default {
  SUPPORTED_FX_CURRENCIES,
  normalizeCurrency,
  isSupportedCurrency,
  getExchangeRate,
  convertPaise,
  setMockRate,
  clearCache,
};
