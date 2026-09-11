/**
 * currencyRegistry.js
 * Comprehensive ISO 4217 Currency Definitions mapping minor unit decimal multipliers and display formatting
 */
export const CURRENCY_REGISTRY = {
  // Common 2-decimal currencies (100 subunits per major unit)
  USD: { code: 'USD', symbol: '$', decimals: 2, multiplier: 100, name: 'US Dollar', flag: '🇺🇸', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', decimals: 2, multiplier: 100, name: 'Euro', flag: '🇪🇺', locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', decimals: 2, multiplier: 100, name: 'British Pound', flag: '🇬🇧', locale: 'en-GB' },
  INR: { code: 'INR', symbol: '₹', decimals: 2, multiplier: 100, name: 'Indian Rupee', flag: '🇮🇳', locale: 'en-IN' },
  CAD: { code: 'CAD', symbol: 'CA$', decimals: 2, multiplier: 100, name: 'Canadian Dollar', flag: '🇨🇦', locale: 'en-CA' },
  AUD: { code: 'AUD', symbol: 'A$', decimals: 2, multiplier: 100, name: 'Australian Dollar', flag: '🇦🇺', locale: 'en-AU' },
  SGD: { code: 'SGD', symbol: 'S$', decimals: 2, multiplier: 100, name: 'Singapore Dollar', flag: '🇸🇬', locale: 'en-SG' },
  CHF: { code: 'CHF', symbol: 'CHF', decimals: 2, multiplier: 100, name: 'Swiss Franc', flag: '🇨🇭', locale: 'de-CH' },
  BRL: { code: 'BRL', symbol: 'R$', decimals: 2, multiplier: 100, name: 'Brazilian Real', flag: '🇧🇷', locale: 'pt-BR' },
  THB: { code: 'THB', symbol: '฿', decimals: 2, multiplier: 100, name: 'Thai Baht', flag: '🇹🇭', locale: 'th-TH' },
  AED: { code: 'AED', symbol: 'AED', decimals: 2, multiplier: 100, name: 'UAE Dirham', flag: '🇦🇪', locale: 'ar-AE' },

  // Zero-decimal currencies (1 subunit per major unit)
  JPY: { code: 'JPY', symbol: '¥', decimals: 0, multiplier: 1, name: 'Japanese Yen', flag: '🇯🇵', locale: 'ja-JP' },
  KRW: { code: 'KRW', symbol: '₩', decimals: 0, multiplier: 1, name: 'South Korean Won', flag: '🇰🇷', locale: 'ko-KR' },
  VND: { code: 'VND', symbol: '₫', decimals: 0, multiplier: 1, name: 'Vietnamese Dong', flag: '🇻🇳', locale: 'vi-VN' },
  CLP: { code: 'CLP', symbol: 'CLP$', decimals: 0, multiplier: 1, name: 'Chilean Peso', flag: '🇨🇱', locale: 'es-CL' },

  // 3-decimal currencies (1000 subunits per major unit)
  KWD: { code: 'KWD', symbol: 'KD', decimals: 3, multiplier: 1000, name: 'Kuwaiti Dinar', flag: '🇰🇼', locale: 'ar-KW' },
  BHD: { code: 'BHD', symbol: 'BD', decimals: 3, multiplier: 1000, name: 'Bahraini Dinar', flag: '🇧🇭', locale: 'ar-BH' },
  OMR: { code: 'OMR', symbol: 'OMR', decimals: 3, multiplier: 1000, name: 'Omani Rial', flag: '🇴🇲', locale: 'ar-OM' },
  JOD: { code: 'JOD', symbol: 'JD', decimals: 3, multiplier: 1000, name: 'Jordanian Dinar', flag: '🇯🇴', locale: 'ar-JO' },
};

export const getCurrency = (code = 'USD') => {
  if (!code || typeof code !== 'string') return CURRENCY_REGISTRY.USD;
  return CURRENCY_REGISTRY[code.trim().toUpperCase()] || CURRENCY_REGISTRY.USD;
};

export default CURRENCY_REGISTRY;
