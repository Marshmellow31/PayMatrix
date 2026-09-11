/* eslint-env node */

export const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export const RAZORPAY_STATUS_MAP = Object.freeze({
  authenticated: 'free',
  active: 'active',
  pending: 'free',
  halted: 'grace_period',
  paused: 'paused',
  resumed: 'active',
  cancelled: 'cancelled',
  completed: 'expired',
  expired: 'expired',
});

export const isApprovedPlan = (planId) => {
  if (!planId) return false;
  const monthly = process.env.RAZORPAY_PLAN_MONTHLY_INR;
  const yearly = process.env.RAZORPAY_PLAN_YEARLY_INR;
  return planId === monthly || planId === yearly;
};

const asMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export const sourceFromSubscription = (subscription, options = {}) => {
  const rawStatus = String(subscription?.status || '').toLowerCase();
  const state = RAZORPAY_STATUS_MAP[rawStatus] || 'free';
  const periodEnd = Number(subscription?.current_end || subscription?.ended_at || 0) * 1000;
  const now = options.now || Date.now();

  let graceUntil = null;
  if (state === 'grace_period') {
    // Grace period is strictly bounded from the failed renewal boundary (periodEnd)
    // If periodEnd is in the past, grace ends periodEnd + 3 days
    // If periodEnd is unknown or in the future, bound to max(periodEnd, now) + 3 days
    // Unknown billing boundaries must not mint a fresh grace window on every refresh.
    graceUntil = periodEnd > 0 ? new Date(periodEnd + THREE_DAYS_MS).toISOString() : null;
  }

  const validUntil = periodEnd > 0 ? new Date(periodEnd).toISOString() : null;
  const startedAt = subscription?.start_at
    ? new Date(subscription.start_at * 1000).toISOString()
    : null;
  const renewalDate = subscription?.charge_at
    ? new Date(subscription.charge_at * 1000).toISOString()
    : null;

  return {
    provider: 'razorpay',
    providerId: subscription?.id || '',
    providerSubscriptionId: subscription?.id || '',
    providerPlanId: subscription?.plan_id || '',
    planId: subscription?.plan_id || '',
    state,
    status: state,
    startedAt,
    currentPeriodEnd: validUntil,
    validUntil,
    renewalDate,
    cancelAtPeriodEnd: rawStatus === 'cancelled',
    gracePeriodEnd: graceUntil,
    graceUntil,
    providerEventTimestamp: options.eventTimestamp || now,
    lastEventId: options.eventId || null,
    updatedAt: new Date(now).toISOString(),
  };
};

export const reconcileSubscriptionSources = (existingSources = [], incomingSource) => {
  const sources = Array.isArray(existingSources) ? [...existingSources] : [];
  const existingIndex = sources.findIndex(
    (item) =>
      item.provider === incomingSource.provider && item.providerId === incomingSource.providerId
  );

  if (existingIndex >= 0) {
    const existing = sources[existingIndex];
    // Ordering check: reject older events regressing newer state
    if (
      existing.providerEventTimestamp &&
      incomingSource.providerEventTimestamp &&
      incomingSource.providerEventTimestamp < existing.providerEventTimestamp
    ) {
      // Incoming event is older than existing record - reject regression
      return { sources, ignored: true, reason: 'out_of_order_event' };
    }
    sources[existingIndex] = { ...existing, ...incomingSource };
  } else {
    sources.push(incomingSource);
  }

  return { sources, ignored: false };
};

export const deriveEffectiveEntitlement = (sources = [], now = Date.now()) => {
  const list = Array.isArray(sources) ? sources : [];

  // Active / paid sources
  const validSources = list.filter((s) => {
    if (!s || s.revokedAt) return false;
    if (s.lifetime === true) return true;
    if (s.state === 'active') {
      // Active source with valid period or without explicit expiry
      return s.provider === 'razorpay'
        ? asMillis(s.validUntil) > now
        : !s.validUntil || asMillis(s.validUntil) > now;
    }
    if (s.state === 'cancelled' && s.validUntil) {
      // Preserved paid access after cancellation until periodEnd
      return asMillis(s.validUntil) > now;
    }
    return false;
  });

  // Grace period sources
  const graceSources = list.filter((s) => {
    if (!s || s.revokedAt || s.lifetime === true) return false;
    return s.state === 'grace_period' && asMillis(s.graceUntil) > now;
  });

  if (validSources.length > 0) {
    const allCancelled = validSources.every((s) => s.state === 'cancelled' || s.cancelAtPeriodEnd);
    return {
      isPro: true,
      state: allCancelled ? 'cancelled' : 'active',
      activeSources: validSources,
    };
  }

  if (graceSources.length > 0) {
    return {
      isPro: true,
      state: 'grace_period',
      activeSources: graceSources,
    };
  }

  // Determine non-pro status
  const hasCancelled = list.some((s) => s.state === 'cancelled' && !s.revokedAt);
  if (hasCancelled) {
    return { isPro: false, state: 'cancelled', activeSources: [] };
  }

  const hasExpired = list.some(
    (s) => (s.state === 'expired' || s.state === 'grace_period') && !s.revokedAt
  );
  if (hasExpired) {
    return { isPro: false, state: 'expired', activeSources: [] };
  }

  return { isPro: false, state: 'free', activeSources: [] };
};
