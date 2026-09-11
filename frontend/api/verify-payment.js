import { verifyFirebaseUser } from '../server/firebaseAuth.js';
import {
  readOrderToken,
  requireRazorpayConfig,
  verifyPaymentSignature,
} from '../server/razorpay.js';
import { requireServerFeature } from '../server/runtimeFlags.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' });

  try {
    requireServerFeature('RAZORPAY_TEST_CHECKOUT_ENABLED');
  } catch (error) {
    return response.status(error.statusCode).json({ code: error.code, error: error.message });
  }

  try {
    const user = await verifyFirebaseUser(request);
    if (!user) return response.status(401).json({ error: 'Authentication required.' });
  } catch (error) {
    console.error('[razorpay:verify-payment] authentication unavailable:', error.message);
    return response.status(503).json({ error: 'Authentication service is unavailable.' });
  }

  const {
    razorpay_payment_id: paymentId,
    razorpay_order_id: checkoutOrderId,
    razorpay_signature: signature,
    order_token: orderToken,
  } = request.body || {};
  if (![paymentId, checkoutOrderId, signature, orderToken].every((value) => typeof value === 'string' && value)) {
    return response.status(400).json({ error: 'Missing Razorpay verification fields.' });
  }

  let keySecret;
  try {
    ({ keySecret } = requireRazorpayConfig());
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }

  const serverOrderId = readOrderToken(orderToken, keySecret);
  const verified =
    serverOrderId === checkoutOrderId &&
    verifyPaymentSignature({ orderId: serverOrderId, paymentId, signature, keySecret });

  if (!verified) {
    return response.status(400).json({ error: 'Payment signature verification failed.' });
  }

  return response.status(200).json({ success: true, verified: true, payment_id: paymentId });
}
