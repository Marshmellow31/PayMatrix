import { describe, expect, it } from 'vitest';
import { resolveEntitlement } from './entitlement.js';
import { getLimit, hasFeature } from '../config/proFeatures.js';

describe('entitlement resolution', () => {
  const now = Date.parse('2026-09-10T00:00:00Z');
  it('keeps Pro while any provider source remains valid', () => {
    const result = resolveEntitlement(
      {
        sources: [
          { provider: 'razorpay', state: 'expired', validUntil: '2026-09-09' },
          { provider: 'play', state: 'active', validUntil: '2026-09-11' },
        ],
      },
      now
    );
    expect(result.isPro).toBe(true);
  });
  it('supports the three-day provider grace window', () => {
    const result = resolveEntitlement(
      {
        sources: [{ state: 'grace_period', validUntil: '2026-09-09', graceUntil: '2026-09-12' }],
      },
      now
    );
    expect(result.state).toBe('grace_period');
    expect(result.isPro).toBe(true);
  });
  it('does not grant Pro to pending or unknown sources with future dates', () => {
    expect(
      resolveEntitlement({ sources: [{ state: 'pending', validUntil: '2026-10-01' }] }, now).isPro
    ).toBe(false);
    expect(resolveEntitlement({ sources: [{ validUntil: '2026-10-01' }] }, now).isPro).toBe(false);
  });
  it('uses centralized feature and limit policy', () => {
    expect(hasFeature({ isPro: true }, 'advancedAnalytics')).toBe(true);
    expect(getLimit({ isPro: false }, 'groups')).toBe(3);
  });
});
