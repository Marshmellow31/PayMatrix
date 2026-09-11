/* eslint-env node */
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { adminDb, requireFirebaseUser } from '../server/firebaseAdmin.js';
import { upsertRazorpayEntitlement, isApprovedPlan } from '../server/subscriptionEntitlement.js';
import { requireServerFeature } from '../server/runtimeFlags.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    requireServerFeature('RAZORPAY_SUBSCRIPTIONS_ENABLED');
    const user = await requireFirebaseUser(req);
    const {
      razorpay_payment_id: paymentId,
      razorpay_subscription_id: subscriptionId,
      razorpay_signature: signature,
    } = req.body || {};

    if (
      ![paymentId, subscriptionId, signature].every((value) => typeof value === 'string' && value)
    ) {
      return res.status(400).json({ error: 'Missing payment verification fields.' });
    }

    const account = (await adminDb().doc(`billingAccounts/${user.uid}`).get()).data();
    if (account?.subscriptionId !== subscriptionId)
      return res.status(403).json({ error: 'Unknown checkout for this account.' });

    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    if (!secret || !process.env.RAZORPAY_KEY_ID) {
      return res.status(503).json({ error: 'Subscriptions are not configured.' });
    }
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${paymentId}|${subscriptionId}`)
      .digest('hex');

    if (
      !/^[a-f0-9]{64}$/.test(signature) ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      return res.status(400).json({ error: 'Signature verification failed.' });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);

    if (subscription.notes?.uid !== user.uid) {
      return res.status(403).json({ error: 'Subscription does not belong to this account.' });
    }

    if (subscription.notes?.product !== 'paymatrix_pro') {
      return res.status(400).json({ error: 'Invalid subscription product.' });
    }

    if (!isApprovedPlan(subscription.plan_id)) {
      return res.status(400).json({ error: 'Unapproved subscription plan.' });
    }

    const result = await upsertRazorpayEntitlement({
      uid: user.uid,
      subscription,
      event: 'checkout.verified',
    });

    return res.status(200).json({
      verified: true,
      state: result?.state || subscription.status,
      isPro: result?.isPro === true,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Unable to verify subscription.',
    });
  }
}
