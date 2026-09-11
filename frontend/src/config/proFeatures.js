export const FREE_LIMITS = Object.freeze({
  groups: 3,
  groupMembers: 10,
  receiptScansPerMonth: 5,
  analyticsHistoryDays: 30,
});

export const PRO_LIMITS = Object.freeze({
  groups: Infinity,
  groupMembers: Infinity,
  receiptScansPerMonth: Infinity,
  analyticsHistoryDays: 365,
});

const PRO_FEATURES = new Set([
  'advancedAnalytics',
  'unlimitedGroups',
  'unlimitedReceiptScanning',
  'advancedFilters',
  'prioritySupport',
]);

export const hasFeature = (entitlement, feature) =>
  Boolean(entitlement?.isPro) && PRO_FEATURES.has(feature);

export const getLimit = (entitlement, limit) =>
  (entitlement?.isPro ? PRO_LIMITS : FREE_LIMITS)[limit] ?? 0;
