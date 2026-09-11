import crypto from 'crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import {
  sourceFromSubscription,
  reconcileSubscriptionSources,
  deriveEffectiveEntitlement,
  isApprovedPlan,
} from '../lib/subscriptionEntitlementCore.js';

export const config = { api: { bodyParser: false } };

const app = () =>
  getApps()[0] ||
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });

const readBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
};

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).send('Method not allowed');
  try {
    const rawBody = await readBody(request);
    const signature = request.headers['x-razorpay-signature'] || '';
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    if (!secret) return response.status(503).send('Webhook is not configured');
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    if (
      !signature ||
      signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      return response.status(400).send('Invalid signature');
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const subscription = payload.payload?.subscription?.entity;
    const uid = subscription?.notes?.uid;
    if (!uid || !subscription?.id) return response.status(200).send('Ignored');

    // Reject unknown products or unapproved plans
    if (subscription.notes?.product !== 'paymatrix_pro') {
      return response.status(200).send('Ignored: unapproved product');
    }
    if (!isApprovedPlan(subscription.plan_id)) {
      return response.status(200).send('Ignored: unapproved plan');
    }

    const db = getFirestore(app());
    const providerEventId = request.headers['x-razorpay-event-id'] || crypto.createHash('sha256').update(rawBody).digest('hex');
    const eventId = crypto.createHash('sha256').update(String(providerEventId)).digest('hex');

    const now = Date.now();
    const eventTimestamp = Number(payload.created_at ? payload.created_at * 1000 : now);

    const source = sourceFromSubscription(subscription, {
      now,
      eventId,
      eventTimestamp,
    });

    await db.runTransaction(async (transaction) => {
      const eventRef = db.doc(`billingEvents/${eventId}`);
      if ((await transaction.get(eventRef)).exists) return;

      const entitlementRef = db.doc(`entitlements/${uid}`);
      const currentDoc = await transaction.get(entitlementRef);
      const current = currentDoc.exists ? currentDoc.data() : {};
      const existingSources = Array.isArray(current.sources) ? current.sources : [];

      const result = reconcileSubscriptionSources(existingSources, source);
      if (result.ignored) {
        return;
      }

      const effective = deriveEffectiveEntitlement(result.sources, now);

      transaction.set(
        entitlementRef,
        {
          state: effective.state,
          isPro: effective.isPro,
          sources: result.sources,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      transaction.create(eventRef, {
        event: payload.event || 'subscription_event',
        uid,
        providerId: subscription.id,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return response.status(200).send('ok');
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return response.status(500).send('Webhook processing failed');
  }
}
