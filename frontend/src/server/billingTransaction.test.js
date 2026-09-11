/* eslint-env node */
import { afterEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock('../../server/firebaseAdmin.js', () => ({ adminDb: mock.db }));
import { upsertRazorpayEntitlement } from '../../server/subscriptionEntitlement.js';
afterEach(() => vi.unstubAllEnvs());
it('finishes all Firestore reads before writes and ignores duplicate webhook events', async () => {
  vi.stubEnv('RAZORPAY_PLAN_MONTHLY_INR', 'plan_test');
  const records = new Map();
  mock.db.mockReturnValue({
    doc: (path) => path,
    runTransaction: (fn) => {
      let written = false;
      return fn({
        get: (path) => {
          if (written) throw new Error('Firestore transactions require all reads before writes');
          return { exists: records.has(path), data: () => records.get(path) };
        },
        create: (path, data) => {
          written = true;
          records.set(path, data);
        },
        set: (path, data) => {
          written = true;
          records.set(path, data);
        },
      });
    },
  });
  const event = {
    uid: 'user1',
    eventId: 'event1',
    subscription: {
      id: 'sub_test',
      plan_id: 'plan_test',
      notes: { uid: 'user1', product: 'paymatrix_pro' },
      status: 'active',
      current_end: Math.floor(Date.now() / 1000) + 86400,
    },
  };
  expect((await upsertRazorpayEntitlement(event)).isPro).toBe(true);
  expect(await upsertRazorpayEntitlement(event)).toEqual({
    ignored: true,
    reason: 'duplicate_event',
  });
  expect(records.size).toBe(2);
});
