/* eslint-env node */
import Razorpay from 'razorpay';
import { adminDb, requireFirebaseUser } from '../server/firebaseAdmin.js';
import { requireServerFeature } from '../server/runtimeFlags.js';
import { assertOwnedSubscription, billingError } from '../server/billing.js';
import { readTrustedEntitlement } from '../server/proAccess.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    requireServerFeature('RAZORPAY_SUBSCRIPTIONS_ENABLED');
    const user = await requireFirebaseUser(req);
    if (process.env.RAZORPAY_CHECKOUT_PAUSED === 'true')
      throw billingError(
        'New subscriptions are temporarily paused. Existing billing remains available.',
        503
      );
    const { cycle, country = 'IN', currency = 'INR' } = req.body || {};

    // Strictly enforce that Razorpay recurring billing is only enabled for India (INR)
    const normalizedCountry = String(country).trim().toUpperCase();
    const normalizedCurrency = String(currency).trim().toUpperCase();
    if (normalizedCountry !== 'IN' || normalizedCurrency !== 'INR') {
      return res.status(400).json({
        error: 'Subscriptions are currently only configured for India (INR) on web.',
      });
    }

    if (!['monthly', 'yearly'].includes(cycle))
      return res.status(400).json({ error: 'Choose monthly or yearly billing.' });
    const plans = {
      monthly: process.env.RAZORPAY_PLAN_MONTHLY_INR,
      yearly: process.env.RAZORPAY_PLAN_YEARLY_INR,
    };
    const planId = plans[cycle];
    if (!planId || !/^plan_[A-Za-z0-9]+$/.test(planId)) {
      return res.status(503).json({ error: 'Subscriptions are not configured.' });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ error: 'Subscriptions are not configured.' });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    if (!process.env.RAZORPAY_WEBHOOK_SECRET) throw billingError('Billing is not configured.', 503);
    const plan = await razorpay.plans.fetch(planId);
    const expectedAmount = cycle === 'monthly' ? 4900 : 29900;
    if (
      plan.item?.amount !== expectedAmount ||
      plan.item?.currency !== 'INR' ||
      plan.period !== (cycle === 'monthly' ? 'monthly' : 'yearly') ||
      plan.interval !== 1
    ) {
      throw billingError('Billing plan does not match the displayed price. Contact support.', 503);
    }
    if ((await readTrustedEntitlement(user.uid)).isPro)
      throw billingError('Pro is already active. Refresh your subscription status.');
    const ref = adminDb().doc(`billingAccounts/${user.uid}`);
    const account = await adminDb().runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const existing = snapshot.data() || {};
      if (existing.subscriptionId) return existing;
      if (existing.creating)
        throw billingError(
          'A checkout request is still being reconciled. Refresh status before trying again.'
        );
      tx.set(ref, { creating: true, cycle, requestedAt: Date.now() });
      return null;
    });
    if (account) {
      const existing = await razorpay.subscriptions.fetch(account.subscriptionId);
      assertOwnedSubscription(existing, user.uid);
      if (existing.status === 'created' && existing.plan_id === planId) {
        return res
          .status(200)
          .json({ subscription_id: existing.id, key_id: process.env.RAZORPAY_KEY_ID });
      }
      if (!['cancelled', 'completed', 'expired'].includes(existing.status)) {
        throw billingError(
          'An existing subscription needs attention. Refresh status or cancel it before choosing another plan.'
        );
      }
      await adminDb().runTransaction(async (tx) => {
        const latest = (await tx.get(ref)).data();
        if (latest?.subscriptionId !== existing.id || latest.creating)
          throw billingError('Checkout is already in progress.');
        tx.set(ref, { creating: true, cycle, requestedAt: Date.now() });
      });
    }
    // Keep an uncertain provider request locked: retrying it could create a second mandate.
    // 120 billing periods for monthly (10-year term), 10 billing periods for yearly (10-year term)
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: cycle === 'yearly' ? 10 : 120,
      quantity: 1,
      customer_notify: 1,
      notes: {
        uid: user.uid,
        cycle,
        product: 'paymatrix_pro',
        country: 'IN',
        currency: 'INR',
      },
    });

    await ref.set({
      subscriptionId: subscription.id,
      cycle,
      creating: false,
      cancelRequested: false,
    });
    return res.status(200).json({
      subscription_id: subscription.id,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Unable to create subscription.',
    });
  }
}
