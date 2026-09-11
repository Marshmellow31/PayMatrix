import { describe, expect, it } from 'vitest';
import { requireServerFeature, serverFeatureEnabled } from '../../server/runtimeFlags.js';

describe('server runtime flags', () => {
  it('fails closed when a flag is absent or not exactly true', () => {
    expect(serverFeatureEnabled('FEATURE', {})).toBe(false);
    expect(serverFeatureEnabled('FEATURE', { FEATURE: '1' })).toBe(false);
    expect(serverFeatureEnabled('FEATURE', { FEATURE: 'false' })).toBe(false);
  });

  it('accepts a case-insensitive explicit true value', () => {
    expect(serverFeatureEnabled('FEATURE', { FEATURE: ' TRUE ' })).toBe(true);
  });

  it('returns a service-unavailable error for disabled features', () => {
    expect(() => requireServerFeature('FEATURE', {})).toThrowError(
      expect.objectContaining({ statusCode: 503, code: 'FEATURE_DISABLED' })
    );
  });
});
