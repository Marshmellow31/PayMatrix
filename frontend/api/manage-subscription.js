/* eslint-env node */
import { adminDb, requireFirebaseUser } from '../server/firebaseAdmin.js';
import {
  billingClient,
  billingError,
  assertOwnedSubscription,
  publicSubscription,
} from '../server/billing.js';
import { upsertRazorpayEntitlement } from '../server/subscriptionEntitlement.js';
import { requireServerFeature } from '../server/runtimeFlags.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    requireServerFeature('RAZORPAY_SUBSCRIPTIONS_ENABLED');
    const user = await requireFirebaseUser(req);
    const mode = process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') ? 'test' : 'live';
    if (!['refresh', 'cancel'].includes(req.body?.action))
      throw billingError('Invalid billing action.', 400);
    const ref = adminDb().doc(`billingAccounts/${user.uid}`);
    const account = (await ref.get()).data() || {};
    if (!account.subscriptionId) {
      if (account.creating)
        throw billingError(
          'Your checkout request needs reconciliation. Contact support before starting another payment.'
        );
      return res.status(200).json({ subscription: null, mode });
    }
    const client = billingClient();
    let subscription = await client.subscriptions.fetch(account.subscriptionId);
    assertOwnedSubscription(subscription, user.uid);
    let cancelRequested = account.cancelRequested === true;
    if (
      req.body.action === 'cancel' &&
      !cancelRequested &&
      !['cancelled', 'completed', 'expired'].includes(subscription.status)
    ) {
      const atPeriodEnd =
        subscription.status === 'active' && subscription.current_end > Date.now() / 1000;
      subscription = await client.subscriptions.cancel(subscription.id, {
        cancel_at_cycle_end: atPeriodEnd,
      });
      cancelRequested = true;
      await ref.set({ cancelRequested: true }, { merge: true });
    }
    const result = await upsertRazorpayEntitlement({
      uid: user.uid,
      subscription,
      event: 'account.refreshed',
    });
    return res
      .status(200)
      .json({ ...result, mode, subscription: publicSubscription(subscription, cancelRequested) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.statusCode
        ? error.message
        : 'Unable to update billing. Refresh status before retrying.',
    });
  }
}
