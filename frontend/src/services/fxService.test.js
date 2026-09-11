import { describe, it, expect, beforeEach } from 'vitest';
import {
  getExchangeRate,
  convertPaise,
  setMockRate,
  clearCache,
  isSupportedCurrency,
  normalizeCurrency,
} from './fxService.js';

describe('fxService', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('currency normalization & support', () => {
    it('normalizes currency strings', () => {
      expect(normalizeCurrency(' inr ')).toBe('INR');
      expect(normalizeCurrency('usd')).toBe('USD');
      expect(normalizeCurrency(null)).toBe('');
    });

    it('identifies supported currencies', () => {
      expect(isSupportedCurrency('INR')).toBe(true);
      expect(isSupportedCurrency('usd')).toBe(true);
      expect(isSupportedCurrency('EUR')).toBe(true);
      expect(isSupportedCurrency('GBP')).toBe(true);
      expect(isSupportedCurrency('JPY')).toBe(false);
    });
  });

  describe('getExchangeRate', () => {
    it('returns 1.0 for identical source and target currency', () => {
      const rate = getExchangeRate('INR', 'INR');
      expect(rate).toBe(1.0);
    });

    it('derives default rate between supported currencies', () => {
      const rateUsdToInr = getExchangeRate('USD', 'INR');
      expect(rateUsdToInr).toBe(86.5);

      const rateInrToUsd = getExchangeRate('INR', 'USD');
      expect(rateInrToUsd).toBeCloseTo(1 / 86.5, 5);
    });

    it('throws on unsupported source or target currency', () => {
      expect(() => getExchangeRate('XYZ', 'INR')).toThrow('Unsupported source currency: XYZ');
      expect(() => getExchangeRate('INR', 'XYZ')).toThrow('Unsupported target currency: XYZ');
    });

    it('allows mocking exchange rate via setMockRate', () => {
      setMockRate('USD', 'INR', 90.0);
      const rate = getExchangeRate('USD', 'INR');
      expect(rate).toBe(90.0);

      // Clearing cache removes the mock override
      clearCache();
      const defaultRate = getExchangeRate('USD', 'INR');
      expect(defaultRate).toBe(86.5);
    });
  });

  describe('convertPaise', () => {
    it('returns identical amountPaise for identity conversion', () => {
      const converted = convertPaise(10500, 'INR', 'INR');
      expect(converted).toBe(10500);
    });

    it('converts currencies and preserves integer minor units', () => {
      setMockRate('USD', 'INR', 85.0);
      // $10.00 = 1000 cents -> 1000 * 85 = 85000 paise (₹850.00)
      const inrPaise = convertPaise(1000, 'USD', 'INR');
      expect(inrPaise).toBe(85000);
      expect(Number.isInteger(inrPaise)).toBe(true);
    });

    it('correctly rounds to nearest integer minor unit', () => {
      setMockRate('EUR', 'USD', 1.085);
      // 100 cents * 1.085 = 108.5 cents -> rounds to 109 cents
      const usdCents = convertPaise(100, 'EUR', 'USD');
      expect(usdCents).toBe(109);
      expect(Number.isInteger(usdCents)).toBe(true);
    });

    it('throws when amountPaise is not an integer', () => {
      expect(() => convertPaise(10.5, 'USD', 'INR')).toThrow('amountPaise must be an integer');
      expect(() => convertPaise('1000', 'USD', 'INR')).toThrow('amountPaise must be an integer');
    });

    it('supports 0 amountPaise cleanly', () => {
      const zero = convertPaise(0, 'USD', 'INR');
      expect(zero).toBe(0);
    });
  });
});
