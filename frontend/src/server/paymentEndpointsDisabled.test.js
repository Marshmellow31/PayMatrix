/* eslint-env node */

import { afterEach, describe, expect, it } from 'vitest';
import manageSubscription from '../../api/manage-subscription.js';
import createOrder from '../../api/create-order.js';
import verifyPayment from '../../api/verify-payment.js';
import createSubscription from '../../api/create-subscription.js';
import verifySubscription from '../../api/verify-subscription.js';
import subscriptionWebhook from '../../api/razorpay-subscription-webhook.js';

const originalFlags = {
  RAZORPAY_TEST_CHECKOUT_ENABLED: process.env.RAZORPAY_TEST_CHECKOUT_ENABLED,
  RAZORPAY_SUBSCRIPTIONS_ENABLED: process.env.RAZORPAY_SUBSCRIPTIONS_ENABLED,
};

const responseRecorder = () => {
  const result = { statusCode: 200, payload: undefined };
  return {
    result,
    status(code) {
      result.statusCode = code;
      return this;
    },
    json(payload) {
      result.payload = payload;
      return this;
    },
    send(payload) {
      result.payload = payload;
      return this;
    },
  };
};

afterEach(() => {
  Object.entries(originalFlags).forEach(([name, value]) => {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  });
});

describe('disabled payment endpoints', () => {
  it.each([
    ['manage subscription', manageSubscription, 'RAZORPAY_SUBSCRIPTIONS_ENABLED'],
    ['create order', createOrder, 'RAZORPAY_TEST_CHECKOUT_ENABLED'],
    ['verify payment', verifyPayment, 'RAZORPAY_TEST_CHECKOUT_ENABLED'],
    ['create subscription', createSubscription, 'RAZORPAY_SUBSCRIPTIONS_ENABLED'],
    ['verify subscription', verifySubscription, 'RAZORPAY_SUBSCRIPTIONS_ENABLED'],
    ['subscription webhook', subscriptionWebhook, 'RAZORPAY_SUBSCRIPTIONS_ENABLED'],
  ])(
    'keeps %s closed unless its server flag is explicitly enabled',
    async (_name, handler, flag) => {
      delete process.env[flag];
      const response = responseRecorder();
      await handler({ method: 'POST', headers: {}, body: {} }, response);
      expect(response.result.statusCode).toBe(503);
    }
  );
});
