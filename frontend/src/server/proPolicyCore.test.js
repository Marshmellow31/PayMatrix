import { describe, expect, it } from 'vitest';
import { hourlyWindow, quotaDecision, usagePeriod } from '../../server/proPolicyCore.js';

describe('trusted Pro quota policy', () => {
  it('uses a stable UTC monthly period', () => {
    expect(usagePeriod(Date.parse('2026-09-30T23:59:59Z'))).toBe('2026-09');
    expect(usagePeriod(Date.parse('2026-10-01T00:00:00Z'))).toBe('2026-10');
  });

  it('blocks the sixth monthly receipt scan for Free accounts', () => {
    expect(
      quotaDecision({ isPro: false, used: 4, limitName: 'receiptScansPerMonth' })
    ).toMatchObject({
      allowed: true,
      remaining: 1,
    });
    expect(
      quotaDecision({ isPro: false, used: 5, limitName: 'receiptScansPerMonth' })
    ).toMatchObject({
      allowed: false,
      remaining: 0,
    });
  });

  it('keeps Pro quota unlimited while retaining abuse-window calculation', () => {
    expect(quotaDecision({ isPro: true, used: 500, limitName: 'receiptScansPerMonth' })).toEqual({
      allowed: true,
      limit: null,
      used: 500,
      remaining: null,
    });
    expect(hourlyWindow(3_600_000)).toBe(1);
  });
});
