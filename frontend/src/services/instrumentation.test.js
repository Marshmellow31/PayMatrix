import { describe, it, expect, beforeEach } from 'vitest';
import { instrumentation } from './instrumentation.js';

describe('FirebaseInstrumentation (Web)', () => {
  beforeEach(() => {
    instrumentation.setInstrumentationUser('test_user_1');
    instrumentation.resetMetrics();
  });

  it('correctly tracks document reads, cache vs server, and writes', () => {
    instrumentation.recordRead({
      count: 4,
      fromCache: true,
      latencyMs: 30,
      signature: 'groups:grp_1:expenses',
    });
    instrumentation.recordRead({
      count: 6,
      fromCache: false,
      latencyMs: 70,
      signature: 'groups:grp_1:expenses',
    });
    instrumentation.recordWrite({
      count: 2,
      signature: 'groups:grp_1:expenses',
    });

    const metrics = instrumentation.getMetrics();
    expect(metrics.documentReads).toBe(10);
    expect(metrics.cacheReads).toBe(4);
    expect(metrics.serverReads).toBe(6);
    expect(metrics.documentWrites).toBe(2);
    expect(metrics.returnedDocuments).toBe(10);
    expect(metrics.queryCount).toBe(2);
    expect(metrics.averageQueryLatencyMs).toBe(50);
    expect(metrics.lastQueryLatencyMs).toBe(70);
  });

  it('sanitizes query signatures to prevent leaking PII and amounts', () => {
    instrumentation.recordRead({
      count: 1,
      signature: 'users:test.user@example.com:group_abcdef12345678901234:amountPaise: 50000',
    });

    const metrics = instrumentation.getMetrics();
    const sigKeys = Object.keys(metrics.querySignatures);
    expect(sigKeys.length).toBe(1);
    const sanitized = sigKeys[0];

    expect(sanitized).not.toContain('test.user@example.com');
    expect(sanitized).not.toContain('abcdef12345678901234');
    expect(sanitized).not.toContain('50000');
    expect(sanitized).toContain('<redacted_email>');
    expect(sanitized).toContain('<id>');
    expect(sanitized).toContain('amountPaise:<num>');
  });

  it('tracks active listeners, detects duplicates, and handles unregister cleanup', () => {
    const rawSig = 'notifications:target_user_12345678901234567890';
    const unregister1 = instrumentation.registerListener(rawSig);

    let metrics = instrumentation.getMetrics();
    expect(metrics.activeListeners).toBe(1);
    expect(metrics.duplicateListenerSignatures).toBe(0);

    // Register duplicate
    const unregister2 = instrumentation.registerListener(rawSig);
    metrics = instrumentation.getMetrics();
    expect(metrics.activeListeners).toBe(2);
    expect(metrics.duplicateListenerSignatures).toBe(1);

    // Cleanup first listener
    unregister1();
    metrics = instrumentation.getMetrics();
    expect(metrics.activeListeners).toBe(1);

    // Cleanup second listener
    unregister2();
    metrics = instrumentation.getMetrics();
    expect(metrics.activeListeners).toBe(0);

    // Idempotent cleanup should not decrement below 0
    unregister2();
    metrics = instrumentation.getMetrics();
    expect(metrics.activeListeners).toBe(0);
  });

  it('isolates metrics across account switching and scopes persistence by UID', () => {
    instrumentation.recordRead({ count: 15, fromCache: true });
    const unregister = instrumentation.registerListener('groups:active_channel');
    expect(instrumentation.getMetrics().activeListeners).toBe(1);

    // Switch account to test_user_2
    instrumentation.setInstrumentationUser('test_user_2');
    const user2Metrics = instrumentation.getMetrics();
    expect(user2Metrics.documentReads).toBe(0);
    expect(user2Metrics.activeListeners).toBe(0);

    // Switch back to test_user_1
    instrumentation.setInstrumentationUser('test_user_1');
    const user1Metrics = instrumentation.getMetrics();
    expect(user1Metrics.documentReads).toBe(15);
    // Active listeners tracking resets on account switch
    expect(user1Metrics.activeListeners).toBe(0);

    // Clean up
    unregister();
  });

  it('exportMetricsJson never contains user ID, emails, or financial amounts', () => {
    instrumentation.recordRead({
      count: 2,
      signature: 'groups:secret_group:balance: 10000',
    });
    const json = instrumentation.exportMetricsJson();
    const parsed = JSON.parse(json);

    expect(parsed.documentReads).toBe(2);
    expect(json).not.toContain('test_user_1');
    expect(json).not.toContain('10000');
    expect(parsed.currentUid).toBeUndefined();
    expect(parsed.userId).toBeUndefined();
  });
});
