# Phase 3: Web Universal Subunit Engine (`money.js`)

> **Platform:** TypeScript / JavaScript ES2024 (Web PWA)  
> **Key Technologies:** `Intl.NumberFormat`, ISO 4217 Currency Definitions, Hare-Niemeyer Remainder Allocation

---

## 1. Universal Currency Registry

```javascript
// frontend/src/utils/currencyRegistry.js
export const CURRENCIES = {
  USD: { code: 'USD', symbol: '$', decimals: 2, multiplier: 100, name: 'US Dollar', flag: '🇺🇸', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', decimals: 2, multiplier: 100, name: 'Euro', flag: '🇪🇺', locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', decimals: 2, multiplier: 100, name: 'British Pound', flag: '🇬🇧', locale: 'en-GB' },
  INR: { code: 'INR', symbol: '₹', decimals: 2, multiplier: 100, name: 'Indian Rupee', flag: '🇮🇳', locale: 'en-IN' },
  JPY: { code: 'JPY', symbol: '¥', decimals: 0, multiplier: 1, name: 'Japanese Yen', flag: '🇯🇵', locale: 'ja-JP' },
  KWD: { code: 'KWD', symbol: 'KD', decimals: 3, multiplier: 1000, name: 'Kuwaiti Dinar', flag: '🇰🇼', locale: 'ar-KW' },
  BRL: { code: 'BRL', symbol: 'R$', decimals: 2, multiplier: 100, name: 'Brazilian Real', flag: '🇧🇷', locale: 'pt-BR' },
  AUD: { code: 'AUD', symbol: 'A$', decimals: 2, multiplier: 100, name: 'Australian Dollar', flag: '🇦🇺', locale: 'en-AU' },
  CAD: { code: 'CAD', symbol: 'C$', decimals: 2, multiplier: 100, name: 'Canadian Dollar', flag: '🇨🇦', locale: 'en-CA' },
  SGD: { code: 'SGD', symbol: 'S$', decimals: 2, multiplier: 100, name: 'Singapore Dollar', flag: '🇸🇬', locale: 'en-SG' },
};

export const getCurrency = (code = 'USD') => {
  return CURRENCIES[code.toUpperCase()] || CURRENCIES.USD;
};
```

---

## 2. Subunit Converter & Largest-Remainder Allocation

```javascript
// frontend/src/utils/universalMoney.js
import { getCurrency } from './currencyRegistry';

/**
 * Parses user input string or number into exact integer subunits without floating drift.
 */
export const toSubunits = (value, currencyCode = 'USD') => {
  const meta = getCurrency(currencyCode);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Invalid numeric value');
    return Math.round(value * meta.multiplier);
  }

  const clean = String(value ?? '0')
    .trim()
    .replace(/[^0-9.-]/g, '');

  const parts = clean.split('.');
  const whole = parseInt(parts[0] || '0', 10);
  const frac = (parts[1] || '').slice(0, meta.decimals).padEnd(meta.decimals, '0');

  const sign = clean.startsWith('-') ? -1 : 1;
  const absSubunits = Math.abs(whole) * meta.multiplier + (meta.decimals > 0 ? parseInt(frac, 10) : 0);
  return sign * absSubunits;
};

/**
 * Formats integer subunits into localized currency string.
 */
export const formatSubunits = (subunits, currencyCode = 'USD') => {
  const meta = getCurrency(currencyCode);
  const major = subunits / meta.multiplier;
  return new Intl.NumberFormat(meta.locale, {
    style: 'currency',
    currency: meta.code,
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  }).format(major);
};

/**
 * Hare-Niemeyer (Largest Remainder) Proportional Allocation
 * Guarantees sum(allocated) === totalSubunits strictly.
 */
export const allocateSubunits = (totalSubunits, entries) => {
  if (!Number.isSafeInteger(totalSubunits) || totalSubunits < 0) {
    throw new Error('Total subunits must be a non-negative integer.');
  }
  if (!Array.isArray(entries) || entries.length === 0) return [];

  const normalized = entries.map((e, idx) => ({
    ...e,
    index: idx,
    weight: Number(e.weight || 0),
  }));

  const totalWeight = normalized.reduce((acc, e) => acc + e.weight, 0);
  if (totalWeight <= 0) throw new Error('Total split weight must be greater than zero.');

  // 1. Initial allocation with floor and track remainders
  const allocated = normalized.map((entry) => {
    const exact = (totalSubunits * entry.weight) / totalWeight;
    const floor = Math.floor(exact);
    return {
      ...entry,
      subunits: floor,
      remainder: exact - floor,
    };
  });

  // 2. Distribute leftover subunits by descending remainder
  let leftover = totalSubunits - allocated.reduce((sum, e) => sum + e.subunits, 0);
  const sorted = [...allocated].sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  let cursor = 0;
  while (leftover > 0) {
    sorted[cursor % sorted.length].subunits += 1;
    cursor += 1;
    leftover -= 1;
  }

  // 3. Restore original order
  return allocated
    .sort((a, b) => a.index - b.index)
    .map(({ index, remainder, ...entry }) => entry);
};
```
