/* eslint-env node */
import Razorpay from 'razorpay';
import { requireRazorpayConfig } from './razorpay.js';
import { isApprovedPlan } from './subscriptionEntitlementCore.js';

export const billingError = (message, statusCode = 409) =>
  Object.assign(new Error(message), { statusCode });
export const billingClient = () => {
  const { keyId, keySecret } = requireRazorpayConfig();
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};
export const assertOwnedSubscription = (subscription, uid) => {
  if (subscription.notes?.uid !== uid)
    throw billingError('Subscription does not belong to this account.', 403);
  if (subscription.notes?.product !== 'paymatrix_pro' || !isApprovedPlan(subscription.plan_id)) {
    throw billingError('Unapproved subscription.', 400);
  }
};
export const publicSubscription = (subscription, cancelRequested = false) => ({
  id: subscription.id,
  status: subscription.status,
  cycle: subscription.notes?.cycle,
  currentPeriodEnd: subscription.current_end
    ? new Date(subscription.current_end * 1000).toISOString()
    : null,
  cancelRequested,
});
