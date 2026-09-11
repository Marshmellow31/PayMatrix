/* eslint-env node */

export const FREE_LIMITS = Object.freeze({
  groups: 3,
  groupMembers: 10,
  receiptScansPerMonth: 5,
  analyticsHistoryDays: 30,
});

export const PRO_LIMITS = Object.freeze({
  groups: null,
  groupMembers: null,
  receiptScansPerMonth: null,
  analyticsHistoryDays: 365,
});

export const usagePeriod = (now = Date.now()) => {
  const date = new Date(now);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

export const hourlyWindow = (now = Date.now()) => Math.floor(now / 3_600_000);

export const quotaDecision = ({ isPro, used = 0, limitName }) => {
  const limit = (isPro ? PRO_LIMITS : FREE_LIMITS)[limitName];
  if (limit === undefined) throw new TypeError(`Unknown quota: ${limitName}`);
  if (limit === null) return { allowed: true, limit: null, used, remaining: null };
  const normalizedUsed = Math.max(0, Number(used) || 0);
  return {
    allowed: normalizedUsed < limit,
    limit,
    used: normalizedUsed,
    remaining: Math.max(0, limit - normalizedUsed),
  };
};

