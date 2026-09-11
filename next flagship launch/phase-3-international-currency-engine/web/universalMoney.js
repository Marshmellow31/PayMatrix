/**
 * universalMoney.js
 * Universal arbitrary-precision subunit currency math for PayMatrix v3
 * Prevents IEEE 754 floating point drift using integer subunits and the Hare-Niemeyer largest remainder method
 */
import { getCurrency } from './currencyRegistry.js';

/**
 * Converts a string or float major amount into exact integer subunits
 */
export const toSubunits = (value, currencyCode = 'USD') => {
  const meta = getCurrency(currencyCode);

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Enter a valid finite amount.');
    const result = Math.round(value * meta.multiplier);
    if (!Number.isSafeInteger(result)) throw new Error('Amount is outside the supported range.');
    return result;
  }

  const normalized = String(value ?? 0)
    .trim()
    .replace(/,/g, '');

  const regex = meta.decimals > 0
    ? new RegExp(`^(-?)(\\d+)(?:\\.(\\d{0,${meta.decimals}}))?$`)
    : /^(-?)(\d+)$/;

  const match = regex.exec(normalized);
  if (!match) {
    throw new Error(`Enter a valid amount with at most ${meta.decimals} decimal places.`);
  }

  const sign = match[1] === '-' ? -1 : 1;
  const major = Number(match[2]);
  const minor = meta.decimals > 0
    ? Number((match[3] || '').padEnd(meta.decimals, '0'))
    : 0;

  const result = sign * (major * meta.multiplier + minor);
  if (!Number.isSafeInteger(result)) throw new Error('Amount is outside the supported range.');
  return result;
};

/**
 * Converts integer subunits back to major float for calculation
 */
export const fromSubunits = (subunits, currencyCode = 'USD') => {
  const meta = getCurrency(currencyCode);
  if (!Number.isSafeInteger(subunits)) throw new Error('Amount must be an integer subunit.');
  return subunits / meta.multiplier;
};

/**
 * Formats integer subunits into localized currency display string
 */
export const formatSubunits = (subunits, currencyCode = 'USD') => {
  const meta = getCurrency(currencyCode);
  const major = fromSubunits(subunits, currencyCode);

  try {
    return new Intl.NumberFormat(meta.locale, {
      style: 'currency',
      currency: meta.code,
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
    }).format(major);
  } catch (e) {
    return `${meta.symbol}${major.toFixed(meta.decimals)}`;
  }
};

/**
 * Proportional Allocation using the Hare-Niemeyer (Largest Remainder) Method
 * Guarantees that sum(allocated.subunits) === totalSubunits exactly
 */
export const allocateSubunits = (totalSubunits, entries) => {
  if (!Number.isSafeInteger(totalSubunits) || totalSubunits < 0) {
    throw new Error('Total must be a non-negative integer subunit value.');
  }
  if (!Array.isArray(entries) || entries.length === 0) return [];

  const normalized = entries.map((entry, index) => ({
    ...entry,
    index,
    weight: Number(entry.weight ?? 1),
  }));

  if (normalized.some((entry) => !Number.isFinite(entry.weight) || entry.weight < 0)) {
    throw new Error('Split weights must be non-negative numbers.');
  }

  const totalWeight = normalized.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) throw new Error('At least one split weight must be greater than zero.');

  const allocated = normalized.map((entry) => {
    const exact = (totalSubunits * entry.weight) / totalWeight;
    const floor = Math.floor(exact);
    return { ...entry, subunits: floor, remainder: exact - floor };
  });

  const remaining = totalSubunits - allocated.reduce((sum, entry) => sum + entry.subunits, 0);
  const remainderOrder = [...allocated].sort(
    (a, b) => b.remainder - a.remainder || a.index - b.index
  );

  for (let index = 0; index < remaining; index += 1) {
    remainderOrder[index % remainderOrder.length].subunits += 1;
  }

  return allocated
    .sort((a, b) => a.index - b.index)
    .map(({ index: _i, remainder: _r, ...entry }) => entry);
};
