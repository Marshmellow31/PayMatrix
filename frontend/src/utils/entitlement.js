export const ENTITLEMENT_STATES = Object.freeze([
  'free',
  'active',
  'grace_period',
  'cancelled',
  'expired',
]);

const VALID_STATES = new Set(ENTITLEMENT_STATES);

const asMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export const resolveEntitlement = (record, now = Date.now()) => {
  if (!record) return { state: 'free', isPro: false, sources: [] };
  const sources = Array.isArray(record.sources) ? record.sources : [];
  const validSources = sources.filter((source) => {
    if (!source || source.revokedAt) return false;
    if (source.lifetime === true) return true;
    const state = VALID_STATES.has(source.state) ? source.state : 'free';
    const hasNotExpired = !source.validUntil || asMillis(source.validUntil) > now;
    return (
      (state === 'active' && hasNotExpired) ||
      (state === 'cancelled' && asMillis(source.validUntil) > now)
    );
  });
  const graceSources = sources.filter((source) => {
    if (!source || source.revokedAt || source.lifetime === true) return false;
    return source.state === 'grace_period' && asMillis(source.graceUntil) > now;
  });
  const explicit = VALID_STATES.has(record.state) ? record.state : 'free';
  if (validSources.length)
    return {
      ...record,
      state: explicit === 'cancelled' ? 'cancelled' : 'active',
      isPro: true,
      sources,
    };
  if (graceSources.length) return { ...record, state: 'grace_period', isPro: true, sources };
  return {
    ...record,
    state: explicit === 'cancelled' ? 'cancelled' : explicit === 'expired' ? 'expired' : 'free',
    isPro: false,
    sources,
  };
};
