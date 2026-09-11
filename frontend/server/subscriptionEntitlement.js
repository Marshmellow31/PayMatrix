/* eslint-env node */
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebaseAdmin.js';
import {
  sourceFromSubscription,
  reconcileSubscriptionSources,
  deriveEffectiveEntitlement,
  isApprovedPlan,
  THREE_DAYS_MS,
  RAZORPAY_STATUS_MAP,
} from './subscriptionEntitlementCore.js';

export {
  sourceFromSubscription,
  reconcileSubscriptionSources,
  deriveEffectiveEntitlement,
  isApprovedPlan,
  THREE_DAYS_MS,
  RAZORPAY_STATUS_MAP,
};

export const upsertRazorpayEntitlement = async ({
  uid,
  subscription,
  eventId,
  event,
  eventTimestamp,
}) => {
  if (!uid) throw new Error('Cannot upsert entitlement without a UID.');
  if (!subscription?.id) throw new Error('Cannot upsert entitlement without subscription data.');

  // Only server-created paymatrix subscriptions may alter entitlements.
  if (subscription.notes?.product !== 'paymatrix_pro') {
    console.warn(`[ENTITLEMENT_REJECTED] Unknown product: ${subscription.notes?.product}`);
    return { ignored: true, reason: 'unknown_product' };
  }

  // Validate plan ID against approved registry
  if (!isApprovedPlan(subscription.plan_id)) {
    console.warn(`[ENTITLEMENT_REJECTED] Unapproved plan ID: ${subscription.plan_id}`);
    return { ignored: true, reason: 'unapproved_plan' };
  }

  const db = adminDb();
  const entitlementRef = db.doc(`entitlements/${uid}`);
  const now = Date.now();
  const source = sourceFromSubscription(subscription, {
    now,
    eventId,
    eventTimestamp: eventTimestamp || now,
  });

  return await db.runTransaction(async (transaction) => {
    const currentDoc = await transaction.get(entitlementRef);
    if (eventId) {
      const eventRef = db.doc(`billingEvents/${eventId}`);
      const existingEvent = await transaction.get(eventRef);
      if (existingEvent.exists) {
        return { ignored: true, reason: 'duplicate_event' };
      }
      transaction.create(eventRef, {
        event: event || 'subscription_event',
        uid,
        providerId: subscription.id,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    const current = currentDoc.exists ? currentDoc.data() : {};
    const existingSources = Array.isArray(current.sources) ? current.sources : [];

    const result = reconcileSubscriptionSources(existingSources, source);
    if (result.ignored) {
      console.warn(
        `[ENTITLEMENT_OUT_OF_ORDER] Event older than stored version for ${subscription.id}`
      );
      return { ignored: true, reason: result.reason };
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

    return { ignored: false, state: effective.state, isPro: effective.isPro };
  });
};
