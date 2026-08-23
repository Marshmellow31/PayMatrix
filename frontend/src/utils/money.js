const MONEY_PATTERN = /^(-?)(\d+)(?:\.(\d{0,2}))?$/;

/** Convert a rupee value to integer paise without floating-point accumulation. */
export const toPaise = (value) => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Enter a valid amount.');
    const result = Math.round(value * 100);
    if (!Number.isSafeInteger(result)) throw new Error('Amount is outside the supported range.');
    return result;
  }

  const normalized = String(value ?? 0)
    .trim()
    .replace(/,/g, '');
  const match = MONEY_PATTERN.exec(normalized);
  if (!match) throw new Error('Enter a valid amount with at most two decimal places.');

  const sign = match[1] === '-' ? -1 : 1;
  const rupees = Number(match[2]);
  const paise = Number((match[3] || '').padEnd(2, '0'));
  const result = sign * (rupees * 100 + paise);
  if (!Number.isSafeInteger(result)) throw new Error('Amount is outside the supported range.');
  return result;
};

export const fromPaise = (paise) => {
  if (!Number.isSafeInteger(paise)) throw new Error('Money must be stored as integer paise.');
  return paise / 100;
};

export const formatPaise = (paise) => fromPaise(paise).toFixed(2);

/** Allocate integer paise proportionally while preserving the exact total. */
export const allocatePaise = (totalPaise, entries) => {
  if (!Number.isSafeInteger(totalPaise) || totalPaise < 0) {
    throw new Error('Total must be a non-negative integer paise value.');
  }
  if (!Array.isArray(entries) || entries.length === 0) return [];

  const normalized = entries.map((entry, index) => ({
    ...entry,
    index,
    weight: Number(entry.weight),
  }));
  if (normalized.some((entry) => !Number.isFinite(entry.weight) || entry.weight < 0)) {
    throw new Error('Split weights must be non-negative numbers.');
  }

  const totalWeight = normalized.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) throw new Error('At least one split weight must be greater than zero.');

  const allocated = normalized.map((entry) => {
    const exact = (totalPaise * entry.weight) / totalWeight;
    const floor = Math.floor(exact);
    return { ...entry, paise: floor, remainder: exact - floor };
  });

  const remaining = totalPaise - allocated.reduce((sum, entry) => sum + entry.paise, 0);
  const remainderOrder = [...allocated].sort(
    (a, b) => b.remainder - a.remainder || a.index - b.index
  );
  for (let index = 0; index < remaining; index += 1) {
    remainderOrder[index % remainderOrder.length].paise += 1;
  }

  return allocated
    .sort((a, b) => a.index - b.index)
    .map(({ index: _index, remainder: _remainder, ...entry }) => entry);
};
