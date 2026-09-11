/* eslint-env node */
import crypto from 'node:crypto';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  db: vi.fn(),
  fetch: vi.fn(),
  create: vi.fn(),
  cancel: vi.fn(),
  plan: vi.fn(),
  trusted: vi.fn(),
  upsert: vi.fn(),
}));
vi.mock('../../server/firebaseAdmin.js', () => ({
  requireFirebaseUser: mocks.user,
  adminDb: mocks.db,
}));
vi.mock('../../server/proAccess.js', () => ({ readTrustedEntitlement: mocks.trusted }));
vi.mock('../../server/subscriptionEntitlement.js', async () => ({
  ...(await import('../../server/subscriptionEntitlementCore.js')),
  upsertRazorpayEntitlement: mocks.upsert,
}));
vi.mock('razorpay', () => ({
  default: class {
    subscriptions = { fetch: mocks.fetch, create: mocks.create, cancel: mocks.cancel };
    plans = { fetch: mocks.plan };
  },
}));
import createSubscription from '../../api/create-subscription.js';
import manageSubscription from '../../api/manage-subscription.js';
import verifySubscription from '../../api/verify-subscription.js';
import webhook from '../../api/razorpay-subscription-webhook.js';

const response = () => ({
  code: 200,
  status(code) {
    this.code = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
  send(body) {
    this.body = body;
    return this;
  },
});
let account;
const subscription = (status = 'active', uid = 'user1') => ({
  id: 'sub_1',
  plan_id: 'plan_monthly',
  status,
  current_end: Math.floor(Date.now() / 1000) + 86400,
  notes: { uid, product: 'paymatrix_pro', cycle: 'monthly' },
});
beforeEach(() => {
  vi.resetAllMocks();
  for (const [key, value] of Object.entries({
    RAZORPAY_SUBSCRIPTIONS_ENABLED: 'true',
    RAZORPAY_KEY_ID: 'rzp_test_fixture',
    RAZORPAY_KEY_SECRET: 'fixture',
    RAZORPAY_WEBHOOK_SECRET: 'webhook',
    RAZORPAY_PLAN_MONTHLY_INR: 'plan_monthly',
    RAZORPAY_PLAN_YEARLY_INR: 'plan_yearly',
  }))
    vi.stubEnv(key, value);
  account = {};
  const ref = {
    get: () => ({ data: () => account }),
    set: (data) => {
      account = { ...account, ...data };
    },
  };
  mocks.db.mockReturnValue({
    doc: () => ref,
    runTransaction: (fn) =>
      fn({
        get: ref.get,
        set: (_ref, data) => {
          account = data;
        },
      }),
  });
  mocks.user.mockResolvedValue({ uid: 'user1' });
  mocks.trusted.mockResolvedValue({ isPro: false });
  mocks.plan.mockResolvedValue({
    item: { amount: 4900, currency: 'INR' },
    period: 'monthly',
    interval: 1,
  });
  mocks.create.mockResolvedValue(subscription('created'));
  mocks.fetch.mockResolvedValue(subscription());
  mocks.cancel.mockResolvedValue(subscription());
  mocks.upsert.mockResolvedValue({ isPro: true, state: 'active' });
});
afterEach(() => vi.unstubAllEnvs());
const call = async (handler, body) => {
  const res = response();
  await handler({ method: 'POST', body, headers: {} }, res);
  return res;
};

describe('subscription checkout boundaries', () => {
  it('pauses new checkout without disabling billing refresh', async () => {
    vi.stubEnv('RAZORPAY_CHECKOUT_PAUSED', 'true');
    expect((await call(createSubscription, { cycle: 'monthly' })).code).toBe(503);
    expect((await call(manageSubscription, { action: 'refresh' })).code).toBe(200);
  });
  it('creates once and reuses unfinished checkout', async () => {
    expect((await call(createSubscription, { cycle: 'monthly' })).code).toBe(200);
    mocks.fetch.mockResolvedValue(subscription('created'));
    expect((await call(createSubscription, { cycle: 'monthly' })).body.subscription_id).toBe(
      'sub_1'
    );
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
  it('blocks concurrent or uncertain creation', async () => {
    account = { creating: true };
    expect((await call(createSubscription, { cycle: 'monthly' })).code).toBe(409);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('keeps an ambiguous provider failure locked against double charging', async () => {
    mocks.create.mockRejectedValue(new Error('timeout'));
    expect((await call(createSubscription, { cycle: 'monthly' })).code).toBe(500);
    expect((await call(createSubscription, { cycle: 'monthly' })).code).toBe(409);
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
  it.each([
    { cycle: '__proto__' },
    { cycle: 'monthly', country: 'US' },
    { cycle: 'monthly', currency: 'USD' },
  ])('rejects invalid input %j', async (body) => {
    expect((await call(createSubscription, body)).code).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('rejects provider price mismatch before creating a mandate', async () => {
    mocks.plan.mockResolvedValue({
      item: { amount: 9900, currency: 'INR' },
      period: 'monthly',
      interval: 1,
    });
    expect((await call(createSubscription, { cycle: 'monthly' })).code).toBe(503);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('rejects a second paid subscription', async () => {
    mocks.trusted.mockResolvedValue({ isPro: true });
    expect((await call(createSubscription, { cycle: 'monthly' })).code).toBe(409);
  });
});

describe('billing management and verification', () => {
  beforeEach(() => {
    account = { subscriptionId: 'sub_1' };
  });
  it('rejects another users subscription', async () => {
    mocks.fetch.mockResolvedValue(subscription('active', 'other'));
    expect((await call(manageSubscription, { action: 'cancel' })).code).toBe(403);
    expect(mocks.cancel).not.toHaveBeenCalled();
  });
  it('cancels paid renewals at period end and makes retry idempotent', async () => {
    expect(
      (await call(manageSubscription, { action: 'cancel' })).body.subscription.cancelRequested
    ).toBe(true);
    await call(manageSubscription, { action: 'cancel' });
    expect(mocks.cancel).toHaveBeenCalledExactlyOnceWith('sub_1', { cancel_at_cycle_end: true });
  });
  it('cancels an unstarted mandate immediately', async () => {
    mocks.fetch.mockResolvedValue(subscription('authenticated'));
    await call(manageSubscription, { action: 'cancel' });
    expect(mocks.cancel).toHaveBeenCalledWith('sub_1', { cancel_at_cycle_end: false });
  });
  it('rejects forged signatures without touching entitlement', async () => {
    const res = await call(verifySubscription, {
      razorpay_payment_id: 'pay_1',
      razorpay_subscription_id: 'sub_1',
      razorpay_signature: 'forged',
    });
    expect(res.code).toBe(400);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it('reports pending activation honestly after a valid signature', async () => {
    mocks.fetch.mockResolvedValue(subscription('authenticated'));
    mocks.upsert.mockResolvedValue({ isPro: false, state: 'free' });
    const res = await call(verifySubscription, {
      razorpay_payment_id: 'pay_1',
      razorpay_subscription_id: 'sub_1',
      razorpay_signature: crypto
        .createHmac('sha256', 'fixture')
        .update('pay_1|sub_1')
        .digest('hex'),
    });
    expect(res.body).toEqual({ verified: true, isPro: false, state: 'free' });
  });
});

describe('webhook signatures', () => {
  it.each([true, false])('accepts only authentic raw payloads (valid=%s)', async (valid) => {
    const raw = Buffer.from(
      JSON.stringify({
        event: 'subscription.charged',
        payload: { subscription: { entity: subscription() } },
      })
    );
    const req = {
      method: 'POST',
      headers: {
        'x-razorpay-signature': valid
          ? crypto.createHmac('sha256', 'webhook').update(raw).digest('hex')
          : 'bad',
      },
      async *[Symbol.asyncIterator]() {
        yield raw;
      },
    };
    const res = response();
    await webhook(req, res);
    expect(res.code).toBe(valid ? 200 : 400);
    expect(mocks.upsert).toHaveBeenCalledTimes(valid ? 1 : 0);
  });
});
